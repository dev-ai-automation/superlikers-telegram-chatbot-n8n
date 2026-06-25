#!/usr/bin/env python3
"""
Generador de fixtures para testear el lector de facturas por IA (GPT-4.1 Vision).

Produce dos PNG deterministas en la misma carpeta:

  invoice-legible.png    -> factura mexicana VALIDA y legible (debe parsear legible:true)
  invoice-illegible.png  -> selfie placeholder, NO es factura (debe forzar legible:false)

Uso:
    python gen-invoices.py

Requiere Pillow (PIL). No usa fuentes externas: cae a la fuente bitmap embebida
si no encuentra una TrueType del sistema, asi el resultado es reproducible.
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

# --- Lienzo --------------------------------------------------------------
WIDTH, HEIGHT = 800, 1000
HERE = os.path.dirname(os.path.abspath(__file__))

# --- Datos deterministas de la factura -----------------------------------
# IMPORTANTE: estos valores los consume el test, no los cambies a la ligera.
COMPANY = "Laboratorios 3Z S.A. de C.V."
INVOICE_NUMBER = "FAC-3Z-000142"
INVOICE_DATE = "2026-06-20"

ROWS = [
    # (ref, descripcion, provider, linea, precio_unitario, cantidad)
    ("Ref A", "Producto Acme Tech", "acme", "tech", 1000, 4),
    ("Ref B", "Terminator Unit", "skynet", "terminator", 50000, 2),
]
TOTAL = sum(precio * cant for *_, precio, cant in ROWS)  # 104000


def _load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Busca una TrueType del sistema; si no hay, usa la bitmap embebida."""
    candidates = (
        ["arialbd.ttf", "DejaVuSans-Bold.ttf", "segoeuib.ttf"]
        if bold
        else ["arial.ttf", "DejaVuSans.ttf", "segoeui.ttf"]
    )
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    # Fallback sin dependencias de fuentes externas.
    return ImageFont.load_default()


def generate_legible(path: str) -> None:
    """Factura mexicana legible con tabla de productos y total."""
    img = Image.new("RGB", (WIDTH, HEIGHT), "#fdfdf8")
    d = ImageDraw.Draw(img)

    f_title = _load_font(48, bold=True)
    f_h2 = _load_font(26, bold=True)
    f_body = _load_font(22)
    f_small = _load_font(18)
    f_total = _load_font(30, bold=True)

    black = "#111111"
    gray = "#444444"

    # Encabezado
    d.text((40, 36), "FACTURA", font=f_title, fill=black)
    d.text((40, 100), COMPANY, font=f_h2, fill=black)
    d.text((40, 138), "RFC: L3Z240101AB3   Regimen General de Ley", font=f_small, fill=gray)
    d.text((40, 162), "Av. Reforma 123, Ciudad de Mexico, CDMX", font=f_small, fill=gray)

    # Numero y fecha (recuadro a la derecha)
    d.rectangle([(500, 36), (760, 130)], outline=black, width=2)
    d.text((516, 50), "No. de factura:", font=f_small, fill=gray)
    d.text((516, 72), INVOICE_NUMBER, font=f_h2, fill=black)
    d.text((516, 104), f"Fecha: {INVOICE_DATE}", font=f_small, fill=gray)

    # Linea separadora
    d.line([(40, 210), (760, 210)], fill=black, width=2)

    # Cabecera de tabla
    cols_x = [40, 150, 430, 600]  # Ref | Descripcion | P. unitario | Cantidad
    header_y = 230
    d.rectangle([(40, header_y), (760, header_y + 38)], fill="#e6e6da")
    d.text((cols_x[0] + 6, header_y + 8), "Ref", font=f_h2, fill=black)
    d.text((cols_x[1] + 6, header_y + 8), "Descripcion", font=f_h2, fill=black)
    d.text((cols_x[2] + 6, header_y + 8), "P. unit.", font=f_h2, fill=black)
    d.text((cols_x[3] + 6, header_y + 8), "Cant.", font=f_h2, fill=black)

    # Filas
    row_y = header_y + 38
    row_h = 70
    for ref, desc, provider, linea, precio, cant in ROWS:
        d.rectangle([(40, row_y), (760, row_y + row_h)], outline="#bbbbbb", width=1)
        d.text((cols_x[0] + 6, row_y + 10), ref, font=f_body, fill=black)
        d.text((cols_x[1] + 6, row_y + 6), desc, font=f_body, fill=black)
        d.text(
            (cols_x[1] + 6, row_y + 36),
            f"provider: {provider}  |  linea: {linea}",
            font=f_small,
            fill=gray,
        )
        d.text((cols_x[2] + 6, row_y + 22), f"${precio:,}", font=f_body, fill=black)
        d.text((cols_x[3] + 6, row_y + 22), str(cant), font=f_body, fill=black)
        row_y += row_h

    # Total
    d.line([(40, row_y + 20), (760, row_y + 20)], fill=black, width=2)
    d.text((430, row_y + 36), "TOTAL:", font=f_total, fill=black)
    d.text((600, row_y + 36), f"${TOTAL:,}", font=f_total, fill=black)

    # Pie
    d.text(
        (40, HEIGHT - 60),
        "Este documento es una factura de prueba (fixture). Sin validez fiscal.",
        font=f_small,
        fill=gray,
    )

    img.save(path, "PNG")


def generate_illegible(path: str) -> None:
    """Selfie placeholder: claramente NO es una factura."""
    img = Image.new("RGB", (WIDTH, HEIGHT), "#3a6ea5")
    d = ImageDraw.Draw(img)

    f_big = _load_font(72, bold=True)
    f_mid = _load_font(34)

    # Bloques de color de fondo (paisaje abstracto)
    d.rectangle([(0, 0), (WIDTH, 260)], fill="#5b8fd0")
    d.rectangle([(0, 740), (WIDTH, HEIGHT)], fill="#2b5783")

    # Avatar / silueta de persona centrada
    cx, cy = WIDTH // 2, 430
    # Cabeza
    d.ellipse([(cx - 110, cy - 130), (cx + 110, cy + 90)], fill="#ffd9b3")
    # Hombros / cuerpo
    d.ellipse([(cx - 200, cy + 120), (cx + 200, cy + 520)], fill="#ffffff")
    # Ojos
    d.ellipse([(cx - 60, cy - 40), (cx - 20, cy)], fill="#222222")
    d.ellipse([(cx + 20, cy - 40), (cx + 60, cy)], fill="#222222")
    # Sonrisa
    d.arc([(cx - 60, cy - 20), (cx + 60, cy + 70)], start=20, end=160, fill="#222222", width=6)

    # Texto SELFIE
    d.text((cx - 150, 80), "SELFIE", font=f_big, fill="#ffffff")
    d.text((cx - 230, HEIGHT - 120), "foto de perfil - no es una factura", font=f_mid, fill="#ffffff")

    img.save(path, "PNG")


def main() -> None:
    legible_path = os.path.join(HERE, "invoice-legible.png")
    illegible_path = os.path.join(HERE, "invoice-illegible.png")

    generate_legible(legible_path)
    generate_illegible(illegible_path)

    for p in (legible_path, illegible_path):
        size = os.path.getsize(p)
        print(f"OK  {p}  ({size:,} bytes)")


if __name__ == "__main__":
    main()
