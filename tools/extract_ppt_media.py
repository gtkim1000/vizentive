from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PPTX = ROOT / "source_assets" / "공용 포트폴리오.pptx"
OUTPUT = ROOT / "public" / "portfolio" / "art"
ORIGINALS = ROOT / "public" / "portfolio" / "originals"
SHEET = ROOT / "docs" / "ppt-media-contact-sheet.jpg"
MANIFEST = ROOT / "public" / "portfolio" / "ppt-manifest.js"

DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
PRESENTATION_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
RELATIONSHIP_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def slide_images(archive: ZipFile, slide_number: int) -> list[tuple[int, int]]:
    namespaces = {"a": DRAWING_NS, "p": PRESENTATION_NS}
    slide = ET.fromstring(archive.read(f"ppt/slides/slide{slide_number}.xml"))
    relationships = ET.fromstring(archive.read(f"ppt/slides/_rels/slide{slide_number}.xml.rels"))
    targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
    images: list[tuple[int, int]] = []
    for picture in slide.findall(".//p:pic", namespaces):
        blip = picture.find(".//a:blip", namespaces)
        extent = picture.find(".//a:xfrm/a:ext", namespaces)
        if blip is None:
            continue
        relationship_id = blip.attrib.get(f"{{{RELATIONSHIP_NS}}}embed")
        match = re.search(r"image(\d+)", targets.get(relationship_id, ""))
        if match:
            area = int(extent.attrib["cx"]) * int(extent.attrib["cy"]) if extent is not None else 0
            images.append((int(match.group(1)), area))
    return images


def slide_reading_order(archive: ZipFile, slide_number: int) -> list[int]:
    namespaces = {"a": DRAWING_NS, "p": PRESENTATION_NS}
    slide = ET.fromstring(archive.read(f"ppt/slides/slide{slide_number}.xml"))
    relationships = ET.fromstring(archive.read(f"ppt/slides/_rels/slide{slide_number}.xml.rels"))
    targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
    positioned: list[tuple[int, int, int]] = []
    for picture in slide.findall(".//p:pic", namespaces):
        blip = picture.find(".//a:blip", namespaces)
        offset = picture.find(".//a:xfrm/a:off", namespaces)
        if blip is None or offset is None:
            continue
        relationship_id = blip.attrib.get(f"{{{RELATIONSHIP_NS}}}embed")
        match = re.search(r"image(\d+)", targets.get(relationship_id, ""))
        if match:
            positioned.append((int(match.group(1)), int(offset.attrib["x"]), int(offset.attrib["y"])))
    # 같은 행의 미세한 Y 좌표 차이는 무시하고 위→아래, 왼쪽→오른쪽으로 읽는다.
    return [item[0] for item in sorted(positioned, key=lambda item: (round(item[2] / 500_000), item[1]))]


def write_manifest(archive: ZipFile) -> None:
    rules = {
        "mascot": (7, "last"),
        "aiModel": (5, "last"),
        "aiAd": (8, "first"),
        "beauty": (8, "first"),
        "health": (12, "largest"),
        "fitness": (14, "largest"),
        "softLook": (15, "largest"),
        "outdoor": (16, "first"),
        "reels": (17, "first"),
        "cardNews": (20, "last"),
    }
    representatives: dict[str, int] = {}
    for key, (slide_number, method) in rules.items():
        images = slide_images(archive, slide_number)
        selected = max(images, key=lambda item: item[1]) if method == "largest" else images[-1 if method == "last" else 0]
        representatives[key] = selected[0]
    sequences = {
        "cardBody1": slide_reading_order(archive, 21),
        "cardBody2": slide_reading_order(archive, 22),
        "cardNutrition1": slide_reading_order(archive, 23),
        "cardNutrition2": slide_reading_order(archive, 24),
    }
    payload = json.dumps({"representatives": representatives, "sequences": sequences}, ensure_ascii=False, separators=(",", ":"))
    MANIFEST.write_text(f"window.VIZENTIVE_PPT={payload};\n", encoding="utf-8")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    for pattern, directory in (("art-*.webp", OUTPUT), ("original-*.webp", ORIGINALS)):
        for stale_file in directory.glob(pattern):
            stale_file.unlink()
    entries: list[tuple[int, str, Image.Image]] = []
    with ZipFile(PPTX) as archive:
        write_manifest(archive)
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
