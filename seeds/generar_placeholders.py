#!/usr/bin/env python3
"""Genera imágenes de fondo placeholder (una por categoría) sin depender de librerías
externas ni de descargar nada de internet: solo un degradado vertical, escrito a mano
como PNG usando la librería estándar (zlib + struct).

Sirven para poblar ambientes de desarrollo/staging mientras revisas los eventos.
Antes de promover un evento a producción, reemplaza la imagen desde /admin con una
imagen real curada por ti.

Uso:
    python seeds/generar_placeholders.py
"""
import struct
import zlib
from pathlib import Path

WIDTH, HEIGHT = 1600, 900
OUT_DIR = Path(__file__).parent / "placeholders"

# (categoria, color superior, color inferior) — degradados oscuros, pensados para
# que el texto del contador (blanco) sea legible encima.
GRADIENTES = {
    "cine":         ((11, 11, 20),   (58, 28, 94)),
    "deportes":     ((6, 17, 11),    (15, 81, 50)),
    "videojuegos":  ((5, 6, 15),     (27, 42, 107)),
    "conciertos":   ((20, 5, 16),    (122, 15, 75)),
}


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def write_png(path: Path, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack("!I", len(data)) + tag + data + struct.pack("!I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = bytearray()
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        r, g, b = (lerp(top[i], bottom[i], t) for i in range(3))
        raw.append(0)  # filtro "None" al inicio de cada scanline
        raw += bytes((r, g, b)) * WIDTH

    ihdr = struct.pack("!IIBBBBB", WIDTH, HEIGHT, 8, 2, 0, 0, 0)  # 8 bits, color type 2 = RGB
    idat = zlib.compress(bytes(raw), 9)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    for categoria, (top, bottom) in GRADIENTES.items():
        destino = OUT_DIR / f"{categoria}.png"
        write_png(destino, top, bottom)
        print(f"✓ {destino} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
