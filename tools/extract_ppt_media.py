from __future__ import annotations

from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PPTX = ROOT / "source_assets" / "공용 포트폴리오.pptx"
OUTPUT = ROOT / "public" / "portfolio" / "art"
ORIGINALS = ROOT / "public" / "portfolio" / "originals"
SHEET = ROOT / "docs" / "ppt-media-contact-sheet.jpg"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    entries: list[tuple[int, str, Image.Image]] = []
    with ZipFile(PPTX) as archive:
        media = sorted(
            (name for name in archive.namelist() if name.startswith("ppt/media/")),
            key=lambda name: int(Path(name).stem.removeprefix("image")),
        )
        for name in media:
            number = int(Path(name).stem.removeprefix("image"))
            try:
                image = Image.open(BytesIO(archive.read(name))).convert("RGB")
            except Exception:
                continue
            if image.width * image.height < 500_000:
                continue
            web = image.copy()
            web.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            web.save(OUTPUT / f"art-{number:02d}.webp", "WEBP", quality=86, method=6)
            image.save(ORIGINALS / f"original-{number:02d}.webp", "WEBP", quality=92, method=6)
            entries.append((number, name, image))

    cell_w, cell_h, label_h, columns = 180, 220, 28, 8
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new("RGB", (cell_w * columns, (cell_h + label_h) * rows), "#ece8f2")
    draw = ImageDraw.Draw(sheet)
    for index, (number, _, image) in enumerate(entries):
        thumb = image.copy()
        thumb.thumbnail((cell_w - 8, cell_h - 8), Image.Resampling.LANCZOS)
        x = index % columns * cell_w
        y = index // columns * (cell_h + label_h)
        sheet.paste(thumb, (x + (cell_w - thumb.width) // 2, y + (cell_h - thumb.height) // 2))
        draw.text((x + 8, y + cell_h + 6), f"art-{number:02d}", fill="#17151f")
    sheet.save(SHEET, "JPEG", quality=88, optimize=True)
    print(f"Extracted {len(entries)} original media assets")


if __name__ == "__main__":
    main()
