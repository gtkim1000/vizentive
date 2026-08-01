from __future__ import annotations

import re
import shutil
import json
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
DIST = ROOT / "dist"


class Validator(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.links: list[str] = []
        self.images: list[tuple[str, str | None]] = []
        self.h1_count = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(values["id"] or "")
        if tag == "a" and values.get("href"):
            self.links.append(values["href"] or "")
        if tag == "img" and values.get("src"):
            self.images.append((values["src"] or "", values.get("alt")))
        if tag == "h1":
            self.h1_count += 1


def main() -> None:
    source = HTML.read_text(encoding="utf-8")
    parser = Validator()
    parser.feed(source)
    assert parser.h1_count == 1, f"Expected one h1, found {parser.h1_count}"
    assert not re.search(r'href=["\']#["\']', source), "Empty anchor found"
    assert "console." not in source, "Console call found"
    for href in parser.links:
        if href.startswith("#"):
            assert href[1:] in parser.ids, f"Missing anchor target: {href}"
        if (href.startswith("/") and not href.startswith("//")) or href.startswith(("portfolio/", "downloads/")):
            assert (ROOT / "public" / href.removeprefix("/")).exists(), f"Missing link asset: {href}"
    for src, alt in parser.images:
        assert alt is not None and alt.strip(), f"Missing image alt: {src}"
        if src.startswith("/") or src.startswith("portfolio/"):
            assert (ROOT / "public" / src.removeprefix("/")).exists(), f"Missing image asset: {src}"

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(ROOT / "public", DIST)
    shutil.copy2(HTML, DIST / "index.html")
    server_dir = DIST / "server"
    server_dir.mkdir(parents=True, exist_ok=True)
    worker = (
        f"const html = {json.dumps(source, ensure_ascii=False)};\n\n"
        "export default {\n"
        "  async fetch() {\n"
        "    return new Response(html, {\n"
        "      headers: {\n"
        "        \"content-type\": \"text/html; charset=UTF-8\",\n"
        "        \"cache-control\": \"no-cache\"\n"
        "      }\n"
        "    });\n"
        "  }\n"
        "};\n"
    )
    (server_dir / "index.js").write_text(worker, encoding="utf-8")
    hosting_dir = DIST / ".openai"
    hosting_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / ".openai" / "hosting.json", hosting_dir / "hosting.json")
    print(f"Validated {len(parser.links)} links, {len(parser.images)} static images, and one h1")
    print(f"Built static output at {DIST}")


if __name__ == "__main__":
    main()
