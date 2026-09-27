#!/usr/bin/env python3
"""Promueve a producción los candidatos ya aprobados en staging.evento_candidato.

Reemplaza al paso 3 de promover.sql (que apuntaba a un esquema que no existe:
`public.countdowns`). El esquema real de Ticka usa `events`, con `image_url TEXT
NOT NULL` y `category_id UUID` (FK opcional a `categories`).

Por qué no usa el endpoint público POST /api/events:
    Esa ruta limita a los invitados a 1 evento activo por IP cada 24h (protección
    anti-spam en backend/handlers/events.go). Un script que promueve varios eventos
    seguidos quedaría bloqueado tras el primero. En cambio, sí usa la API real para
    lo que no tiene ese límite: POST /api/upload (subir el placeholder) y
    GET/POST /api/categories (resolver o crear categorías). El INSERT del evento en
    sí se hace directo por SQL, replicando exactamente la lógica de CreateEvent.

Flujo completo:
    1. python seeds/generar_placeholders.py        (una vez, ya hecho)
    2. Revisar y aprobar candidatos (ver promover.sql, pasos 1 y 2)
    3. python seeds/promover.py                    (este script)

Requiere: pip install "psycopg[binary]"
Variables de entorno:
    DATABASE_URL   cadena de conexión con tu usuario normal (no ticka_seeder),
                   con permisos de escritura en public.events y public.categories.
    TICKA_API_URL  base de la API, ej. http://localhost:8082 (default) o
                   https://api.ticka.dev
    ADMIN_TOKEN    el mismo admin token del backend, para poder crear categorías
                   si todavía no existen.
"""
import argparse
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

PLACEHOLDERS_DIR = Path(__file__).parent / "placeholders"
CACHE_FILE = PLACEHOLDERS_DIR / "urls.json"

CATEGORIA_NOMBRE = {
    "cine": "Cine",
    "deportes": "Deportes",
    "videojuegos": "Videojuegos",
    "conciertos": "Conciertos",
}


def slugify(texto: str) -> str:
    """Replica backend/handlers/events.go:slugify (sin quitar acentos)."""
    import re
    texto = texto.lower().strip()
    return re.sub(r"[^a-z0-9]+", "-", texto).strip("-")


def api_request(api_url: str, path: str, method: str = "GET", token: str | None = None,
                 json_body: dict | None = None):
    url = api_url.rstrip("/") + path
    headers = {}
    data = None
    if json_body is not None:
        data = json.dumps(json_body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def upload_image(api_url: str, image_path: Path) -> tuple[str, str]:
    """POST /api/upload con multipart/form-data. Devuelve (image_url, thumbnail_url)."""
    boundary = uuid.uuid4().hex
    mime = mimetypes.guess_type(image_path.name)[0] or "image/png"
    body = bytearray()
    body += f"--{boundary}\r\n".encode()
    body += f'Content-Disposition: form-data; name="image"; filename="{image_path.name}"\r\n'.encode()
    body += f"Content-Type: {mime}\r\n\r\n".encode()
    body += image_path.read_bytes()
    body += f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        api_url.rstrip("/") + "/api/upload",
        data=bytes(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    return result["url"], result["thumbnail_url"]


def cargar_cache() -> dict:
    if CACHE_FILE.exists():
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    return {}


def guardar_cache(cache: dict) -> None:
    CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")


def resolver_placeholder(api_url: str, categoria: str, cache: dict) -> tuple[str, str]:
    entorno = cache.setdefault(api_url, {})
    if categoria in entorno:
        return entorno[categoria]["image_url"], entorno[categoria]["thumbnail_url"]

    ruta = PLACEHOLDERS_DIR / f"{categoria}.png"
    if not ruta.exists():
        sys.exit(f"Falta {ruta}. Corre primero: python seeds/generar_placeholders.py")

    print(f"  Subiendo placeholder de '{categoria}' a Spaces vía {api_url}/api/upload ...")
    image_url, thumbnail_url = upload_image(api_url, ruta)
    entorno[categoria] = {"image_url": image_url, "thumbnail_url": thumbnail_url}
    guardar_cache(cache)
    return image_url, thumbnail_url


def resolver_categoria(api_url: str, categoria: str, admin_token: str | None,
                        cache_categorias: dict) -> str:
    if categoria in cache_categorias:
        return cache_categorias[categoria]

    existentes = api_request(api_url, "/api/categories")
    for cat in existentes:
        if cat["slug"] == categoria:
            cache_categorias[categoria] = cat["id"]
            return cat["id"]

    if not admin_token:
        sys.exit(
            f"La categoría '{categoria}' no existe en /api/categories y falta ADMIN_TOKEN "
            "para crearla."
        )

    print(f"  Creando categoría '{CATEGORIA_NOMBRE[categoria]}' (slug esperado: {categoria}) ...")
    creada = api_request(
        api_url, "/api/categories", method="POST", token=admin_token,
        json_body={"name": CATEGORIA_NOMBRE[categoria]},
    )
    cache_categorias[categoria] = creada["id"]
    return creada["id"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="solo muestra qué se promovería")
    args = parser.parse_args()

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        sys.exit("Falta la variable de entorno DATABASE_URL")
    api_url = os.environ.get("TICKA_API_URL", "http://localhost:8082")
    admin_token = os.environ.get("ADMIN_TOKEN")

    import psycopg

    with psycopg.connect(database_url) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, slug, titulo, categoria, fecha_evento, zona_horaria,
                   descripcion_corta, fuente_url
            FROM staging.evento_candidato
            WHERE estado = 'aprobado'
            ORDER BY categoria, fecha_evento
            """
        )
        candidatos = cur.fetchall()

        if not candidatos:
            print("No hay candidatos con estado 'aprobado' listos para promover.")
            return 0

        print(f"{len(candidatos)} candidato(s) aprobado(s) listos para promover.\n")

        cache_placeholders = cargar_cache()
        cache_categorias: dict[str, str] = {}
        promovidos = 0

        for i, (cid, slug_staging, titulo, categoria, fecha_evento, zona_horaria,
                descripcion_corta, fuente_url) in enumerate(candidatos):
            print(f"[{i + 1}/{len(candidatos)}] {titulo} ({categoria})")

            category_id = resolver_categoria(api_url, categoria, admin_token, cache_categorias)
            image_url, thumbnail_url = resolver_placeholder(api_url, categoria, cache_placeholders)

            slug_evento = f"{slugify(titulo)}-{(int(time.time()) + i) % 100000}"

            if args.dry_run:
                print(f"  [dry-run] insertaría slug={slug_evento} category_id={category_id} "
                      f"target_date={fecha_evento} timezone={zona_horaria}")
                continue

            cur.execute(
                """
                INSERT INTO events (slug, title, target_date, image_url, thumbnail_url,
                                     category_id, timezone, user_id, client_ip,
                                     description, source_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NULL, NULL, %s, %s)
                ON CONFLICT (slug) DO NOTHING
                RETURNING id
                """,
                (slug_evento, titulo, fecha_evento, image_url, thumbnail_url,
                 category_id, zona_horaria, descripcion_corta, fuente_url),
            )
            fila = cur.fetchone()
            if fila is None:
                print(f"  ✗ conflicto de slug ({slug_evento}), se omitió")
                continue

            cur.execute(
                "UPDATE staging.evento_candidato SET estado = 'publicado', revisado_en = now() "
                "WHERE id = %s",
                (cid,),
            )
            promovidos += 1
            print(f"  ✓ publicado como {slug_evento}")

        if not args.dry_run:
            conn.commit()

        print(f"\nPromovidos: {promovidos}/{len(candidatos)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
