#!/usr/bin/env python3
"""Valida los JSON de los investigadores y carga los válidos a staging.evento_candidato.

Uso:
    python seeds/validar_y_cargar.py --dry-run seeds/candidates/*.json   # solo valida
    DATABASE_URL=postgresql://ticka_seeder:...@localhost:5433/ticka \
        python seeds/validar_y_cargar.py seeds/candidates/*.json         # valida y carga

Requiere Python 3.11+ y `pip install "psycopg[binary]"` (solo para la carga real).
"""
import argparse
import json
import os
import re
import sys
import unicodedata
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

CATEGORIAS = {"deportes", "cine", "videojuegos", "conciertos"}
PRECISIONES = {"exacta", "dia"}
CONFIANZAS = {"alta", "media"}
HORIZONTE = timedelta(days=366)
REQUERIDOS = ("titulo", "categoria", "fecha_evento", "zona_horaria",
              "precision_fecha", "fuente_url", "confianza")
URL_RE = re.compile(r"^https?://\S+$")

INSERT_SQL = """
INSERT INTO staging.evento_candidato
    (slug, titulo, categoria, descripcion_corta, fecha_evento, fecha_dia, zona_horaria,
     precision_fecha, region, fuente_url, fuente_2_url, confianza, notas, archivo_origen)
VALUES
    (%(slug)s, %(titulo)s, %(categoria)s, %(descripcion_corta)s, %(fecha_evento)s, %(fecha_dia)s,
     %(zona_horaria)s, %(precision_fecha)s, %(region)s, %(fuente_url)s, %(fuente_2_url)s,
     %(confianza)s, %(notas)s, %(archivo_origen)s)
ON CONFLICT (slug, fecha_dia) DO NOTHING
"""


def slugify(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def validar(ev: dict, ahora: datetime, archivo: str):
    """Devuelve (fila, errores). Si hay errores, fila es None."""
    if not isinstance(ev, dict):
        return None, ["el evento no es un objeto JSON"]

    errores = [f"falta '{c}'" for c in REQUERIDOS if not str(ev.get(c) or "").strip()]
    if errores:
        return None, errores

    if ev["categoria"] not in CATEGORIAS:
        errores.append(f"categoría inválida: {ev['categoria']}")
    if ev["precision_fecha"] not in PRECISIONES:
        errores.append(f"precision_fecha inválida: {ev['precision_fecha']}")
    if ev["confianza"] not in CONFIANZAS:
        errores.append(f"confianza insuficiente o inválida: {ev['confianza']}")
    if not URL_RE.match(ev["fuente_url"]):
        errores.append("fuente_url no es una URL http(s)")

    zona = None
    try:
        zona = ZoneInfo(ev["zona_horaria"])
    except (ZoneInfoNotFoundError, ValueError):
        errores.append(f"zona_horaria no es IANA válida: {ev['zona_horaria']}")

    fecha = None
    try:
        fecha = datetime.fromisoformat(ev["fecha_evento"])
    except ValueError:
        errores.append(f"fecha_evento no es ISO 8601: {ev['fecha_evento']}")

    if fecha is not None:
        if fecha.tzinfo is None:
            errores.append("fecha_evento no trae offset de zona horaria")
        elif fecha <= ahora:
            errores.append("la fecha ya pasó")
        elif fecha > ahora + HORIZONTE:
            errores.append("la fecha está a más de 12 meses")

    if errores:
        return None, errores

    fila = {
        "slug": slugify(ev["titulo"]),
        "titulo": ev["titulo"].strip(),
        "categoria": ev["categoria"],
        "descripcion_corta": (ev.get("descripcion_corta") or "").strip()[:280] or None,
        "fecha_evento": fecha,
        "fecha_dia": fecha.astimezone(zona).date(),
        "zona_horaria": ev["zona_horaria"],
        "precision_fecha": ev["precision_fecha"],
        "region": ev.get("region") or None,
        "fuente_url": ev["fuente_url"],
        "fuente_2_url": ev.get("fuente_2_url") if URL_RE.match(ev.get("fuente_2_url") or "") else None,
        "confianza": ev["confianza"],
        "notas": ev.get("notas") or None,
        "archivo_origen": archivo,
    }
    return fila, []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("archivos", nargs="+", type=Path)
    parser.add_argument("--dry-run", action="store_true", help="solo validar, no escribir en la BD")
    args = parser.parse_args()

    ahora = datetime.now(timezone.utc)
    validas, vistos = [], set()
    motivos = Counter()
    rechazados = 0

    for ruta in args.archivos:
        try:
            datos = json.loads(ruta.read_text(encoding="utf-8"))
            eventos = datos["eventos"]
        except (OSError, json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"✗ {ruta}: archivo ilegible ({e})")
            motivos["archivo ilegible"] += 1
            rechazados += 1
            continue

        for ev in eventos:
            fila, errores = validar(ev, ahora, ruta.name)
            titulo = ev.get("titulo", "<sin título>") if isinstance(ev, dict) else "<inválido>"
            if errores:
                print(f"✗ [{ruta.name}] {titulo}: {'; '.join(errores)}")
                motivos.update(errores)
                rechazados += 1
                continue
            clave = (fila["slug"], fila["fecha_dia"])
            if clave in vistos:
                print(f"✗ [{ruta.name}] {titulo}: duplicado en este lote")
                motivos["duplicado en el lote"] += 1
                rechazados += 1
                continue
            vistos.add(clave)
            validas.append(fila)

    print(f"\nVálidos: {len(validas)} | Rechazados: {rechazados}")

    if args.dry_run or not validas:
        return 0

    url = os.environ.get("DATABASE_URL")
    if not url:
        print("Falta la variable de entorno DATABASE_URL", file=sys.stderr)
        return 1

    import psycopg  # importado aquí para que --dry-run no lo necesite

    insertados = 0
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        for fila in validas:
            cur.execute(INSERT_SQL, fila)
            insertados += cur.rowcount
    print(f"Insertados en staging: {insertados} | Ya existían: {len(validas) - insertados}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
