"""Verify a built DS PDF Studio frontend using only the Python standard library.

This runs in the production launcher/container, so it intentionally does not
require Node.js or npm at runtime.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
DIST = FRONTEND / "dist"
PACKAGE_JSON = FRONTEND / "package.json"
MANIFEST = DIST / "BUILD-INFO.json"
APP_NAME = "DS PDF Studio Tool"


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.assets: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "script" and values.get("src"):
            self.assets.append(str(values["src"]))
        if tag == "link" and values.get("href"):
            rel = str(values.get("rel", "")).lower().split()
            href = str(values["href"])
            if "stylesheet" in rel or href.lower().endswith((".js", ".mjs", ".css")):
                self.assets.append(href)


def fail(message: str) -> None:
    raise RuntimeError(message)


def verify_bundle() -> dict:
    if not MANIFEST.is_file():
        fail(f"Build manifest is missing: {MANIFEST}")
    if not (DIST / "index.html").is_file():
        fail("Production frontend index.html is missing.")

    package = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("application") != APP_NAME:
        fail("Build manifest application name does not match DS PDF Studio Tool.")
    if manifest.get("version") != package.get("version"):
        fail("Build manifest version does not match frontend/package.json. Rebuild the frontend.")
    expected_vite = package.get("devDependencies", {}).get("vite")
    expected_react_plugin = package.get("devDependencies", {}).get("@vitejs/plugin-react")
    if manifest.get("vite") != expected_vite:
        fail("Build manifest Vite version does not match the pinned frontend dependency.")
    if manifest.get("reactPlugin") != expected_react_plugin:
        fail("Build manifest React plugin version does not match the pinned frontend dependency.")
    if manifest.get("entrypoint") != "index.html":
        fail("Build manifest entrypoint is not index.html.")
    if manifest.get("verified") is not True:
        fail("Build manifest is not marked as verified.")

    html = (DIST / "index.html").read_text(encoding="utf-8")
    if "<html" not in html.lower() or "</html>" not in html.lower():
        fail("Production index.html is not a complete HTML document.")
    if "/@vite/client" in html or "/src/main.jsx" in html:
        fail("Production index.html contains development-only Vite/source references.")

    parser = AssetParser()
    parser.feed(html)
    js_assets = [asset for asset in parser.assets if re.search(r"\.m?js(?:[?#].*)?$", asset, re.I)]
    if not js_assets:
        fail("No production JavaScript bundle is referenced by index.html.")

    manifest_assets = manifest.get("assets")
    if not isinstance(manifest_assets, list) or not manifest_assets:
        fail("Build manifest contains no hashed assets.")
    manifest_by_path = {}
    for item in manifest_assets:
        if not isinstance(item, dict) or not isinstance(item.get("file"), str):
            fail("Build manifest contains an invalid asset entry.")
        relative = Path(item["file"])
        if relative.is_absolute() or ".." in relative.parts:
            fail(f"Unsafe path in build manifest: {item['file']}")
        manifest_by_path[item["file"].replace("\\", "/")] = item

    # Validate every hashed output (JS, CSS, workers, fonts and binary assets),
    # not only the initial script/style tags present in index.html.
    checked = set()
    for relative, item in manifest_by_path.items():
        target = (DIST / relative).resolve()
        if DIST.resolve() not in target.parents:
            fail(f"Manifest asset escapes the dist directory: {relative}")
        if not target.is_file():
            fail(f"Manifest asset is missing: {relative}")
        data = target.read_bytes()
        if not data:
            fail(f"Manifest asset is empty: {relative}")
        digest = hashlib.sha256(data).hexdigest()
        if digest != item.get("sha256"):
            fail(f"SHA-256 mismatch for build asset: {relative}")
        if len(data) != item.get("bytes"):
            fail(f"File size mismatch for build asset: {relative}")
        checked.add(relative)

    for asset in parser.assets:
        clean = asset.split("?", 1)[0].split("#", 1)[0]
        if not re.search(r"\.(?:m?js|css)$", clean, re.I):
            continue
        if clean.startswith(("http://", "https://", "data:")):
            continue
        relative = clean.lstrip("/").replace("\\", "/")
        if relative not in checked:
            fail(f"Referenced JS/CSS asset is absent from the verified build manifest: {relative}")

    if not checked:
        fail("The build manifest contains no verified assets.")
    total_bytes = sum(int(item.get("bytes", 0)) for item in manifest_assets)
    if total_bytes != manifest.get("totalAssetBytes"):
        fail("Build manifest totalAssetBytes does not match its asset entries.")

    return {"version": package["version"], "assets": len(checked), "bytes": total_bytes}


if __name__ == "__main__":
    try:
        result = verify_bundle()
    except Exception as exc:  # surfaced by Windows/Docker production launchers
        print(f"PRODUCTION FRONTEND VERIFICATION FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
    print(
        "PRODUCTION FRONTEND VERIFIED: "
        f"{APP_NAME} v{result['version']} | "
        f"{result['assets']} referenced assets | {result['bytes']:,} bytes"
    )
