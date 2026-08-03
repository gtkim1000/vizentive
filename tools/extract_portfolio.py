from __future__ import annotations

import shutil
from pathlib import Path

import fitz
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "source_assets" / "공용 포트폴리오.pdf"
SLIDES = ROOT / "public" / "portfolio" / "slides"
THUMBS = ROOT / "public" / "portfolio" / "thumbnails"
DOWNLOADS = ROOT / "public" / "downloads"
TEXT_OUTPUT = ROOT / "docs" / "portfolio-text.txt"
CONTACT_SHEET = ROOT / "docs" / "portfolio-contact-sheet.jpg"


def render_page(page: fitz.Page, page_number: int) -> str:
    rect = page.rect
    scale = 1800 / max(rect.width, rect.height)
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

    slide_path = SLIDES / f"slide-{page_number:02d}.webp"
    image.save(slide_path, "WEBP", quality=88, method=6)

    thumbnail = image.copy()
    thumbnail.thumbnail((600, 600), Image.Resampling.LANCZOS)
    thumb_path = THUMBS / f"slide-{page_number:02d}.webp"
    thumbnail.save(thumb_path, "WEBP", quality=82, method=6)
    return "\n".join(line.rstrip() for line in page.get_text("text").splitlines()).strip()


def main() -> None:
    for directory in (SLIDES, THUMBS, DOWNLOADS, TEXT_OUTPUT.parent):
        directory.mkdir(parents=True, exist_ok=True)

    for directory in (SLIDES, THUMBS):
        for stale_file in directory.glob("slide-*.webp"):
            stale_file.unlink()

    document = fitz.open(PDF)
    extracted: list[str] = []
    for index, page in enumerate(document, start=1):
        text = render_page(page, index)
        extracted.append(f"===== PAGE {index:02d} =====\n{text}")

    TEXT_OUTPUT.write_text("\n\n".join(extracted), encoding="utf-8")
    shutil.copy2(PDF, DOWNLOADS / "vizentive-portfolio.pdf")
    thumb_paths = sorted(THUMBS.glob("slide-*.webp"))
    tiles = [Image.open(path).convert("RGB") for path in thumb_paths]
    tile_width = 260
    tile_height = max(round(tile_width * tile.height / tile.width) for tile in tiles)
    sheet = Image.new("RGB", (tile_width * 5, (tile_height + 34) * 5), "white")
    for index, tile in enumerate(tiles):
        tile.thumbnail((tile_width, tile_height), Image.Resampling.LANCZOS)
        x = (index % 5) * tile_width
        y = (index // 5) * (tile_height + 34) + 34
        sheet.paste(tile, (x + (tile_width - tile.width) // 2, y))
    sheet.save(CONTACT_SHEET, "JPEG", quality=88, optimize=True)
    print(f"Rendered {len(document)} pages")


if __name__ == "__main__":
    main()
