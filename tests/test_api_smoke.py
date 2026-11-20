"""Fast, dependency-light API smoke tests for the production pipeline."""
from __future__ import annotations

import io
import hashlib
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

import fitz
from openpyxl import load_workbook
from fastapi.testclient import TestClient

from backend.main import app
from backend import verify_frontend
from backend import main as backend_main


class PdfStudioApiSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    @staticmethod
    def make_pdf(*labels: str) -> bytes:
        document = fitz.open()
        for label in labels:
            page = document.new_page(width=595, height=842)
            page.insert_text((72, 90), label, fontsize=18)
        data = document.tobytes()
        document.close()
        return data

    def upload(self, data: bytes, filename: str = "smoke-test.pdf") -> dict:
        return {"file": (filename, data, "application/pdf")}

    def test_health_and_language_catalogue(self) -> None:
        health = self.client.get("/api/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["status"], "ok")
        self.assertEqual(health.json()["version"], "1.7.0")
        self.assertIn("unicodeFontConfigured", health.json())
        self.assertIn("unicodeFontSource", health.json())

        catalogue = self.client.get("/api/pdf/languages")
        self.assertEqual(catalogue.status_code, 200)
        codes = {item["code"] for item in catalogue.json()["languages"]}
        self.assertIn("ta", codes)
        self.assertIn("hi", codes)
        self.assertEqual(len(codes), 23)  # English plus 22 scheduled languages.

    def test_browser_root_redirects_to_react_dev_server(self) -> None:
        # Force development mode even when the suite runs after a production build.
        with tempfile.TemporaryDirectory() as empty_dist:
            with patch.object(backend_main, "FRONTEND_DIST", empty_dist):
                response = TestClient(app).get("/", follow_redirects=False)
        self.assertEqual(response.status_code, 307)
        self.assertEqual(response.headers.get("location"), "http://127.0.0.1:5173/")

    def test_favicon_is_available_and_ico_redirects(self) -> None:
        favicon = self.client.get("/favicon.svg")
        self.assertEqual(favicon.status_code, 200)
        self.assertIn("<svg", favicon.text)
        self.assertTrue(favicon.headers.get("content-type", "").startswith("image/svg+xml"))
        legacy = self.client.get("/favicon.ico", follow_redirects=False)
        self.assertEqual(legacy.status_code, 307)
        self.assertEqual(legacy.headers.get("location"), "/favicon.svg")

    def test_find_text_returns_page_locations(self) -> None:
        response = self.client.post(
            "/api/pdf/find",
            files=self.upload(self.make_pdf("PLEASE_EDIT_THIS_SENTENCE")),
            data={"query": "EDIT_THIS_SENTENCE"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["totalMatches"], 1)
        self.assertEqual(payload["pages"][0]["pageNumber"], 1)
        self.assertTrue(payload["pages"][0]["matches"][0]["bbox"])

    def test_export_can_replace_selectable_pdf_text(self) -> None:
        response = self.client.post(
            "/api/pdf/export",
            files=self.upload(self.make_pdf("OLD_SENTENCE_VALUE")),
            data={"config": json.dumps({"replacements": [{"find": "OLD_SENTENCE_VALUE", "replace": "NEW_SENTENCE_VALUE"}]})},
        )
        self.assertEqual(response.status_code, 200, response.text)
        edited = fitz.open(stream=response.content, filetype="pdf")
        try:
            text = edited[0].get_text()
            self.assertIn("NEW_SENTENCE_VALUE", text)
            self.assertNotIn("OLD_SENTENCE_VALUE", text)
        finally:
            edited.close()

    def test_ai_translation_reports_missing_api_key_clearly(self) -> None:
        with patch.dict("os.environ", {"AI_TRANSLATION_API_KEY": ""}):
            response = self.client.post(
                "/api/pdf/translate",
                files=self.upload(self.make_pdf("Translate this sentence")),
                data={"source_language": "en", "target_language": "ta", "ocr_languages": "eng"},
            )
        self.assertEqual(response.status_code, 503)
        self.assertIn("AI_TRANSLATION_API_KEY", response.json()["detail"])

    def test_ai_translation_reconstructs_pdf_with_mocked_provider(self) -> None:
        with patch.dict("os.environ", {"AI_TRANSLATION_API_KEY": "test-key"}), patch.object(
            backend_main, "_translate_text_batch", new=AsyncMock(return_value=["தமிழ் உரை"])
        ):
            response = self.client.post(
                "/api/pdf/translate",
                files=self.upload(self.make_pdf("Translate this sentence")),
                data={"source_language": "en", "target_language": "ta", "ocr_languages": "eng"},
            )
        self.assertEqual(response.status_code, 200, response.text)
        translated = fitz.open(stream=response.content, filetype="pdf")
        try:
            self.assertEqual(translated.page_count, 1)
            self.assertIn("தமிழ்", translated[0].get_text())
        finally:
            translated.close()

    def test_pdf_metadata_endpoint(self) -> None:
        response = self.client.post(
            "/api/pdf/info",
            files=self.upload(self.make_pdf("First page", "Second page")),
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["pageCount"], 2)
        self.assertEqual(payload["pages"][0]["textLength"] > 0, True)

    def test_export_reorders_and_rotates_pages(self) -> None:
        response = self.client.post(
            "/api/pdf/export",
            files=self.upload(self.make_pdf("FIRST_MARKER", "SECOND_MARKER")),
            data={"config": '{"order":[1,0],"rotations":{"1":90}}'},
        )
        self.assertEqual(response.status_code, 200, response.text)
        result = fitz.open(stream=response.content, filetype="pdf")
        try:
            self.assertEqual(result.page_count, 2)
            self.assertIn("SECOND_MARKER", result[0].get_text())
            self.assertIn("FIRST_MARKER", result[1].get_text())
            self.assertEqual(result[0].rotation, 90)
        finally:
            result.close()

    def test_merge_pdfs(self) -> None:
        response = self.client.post(
            "/api/pdf/merge",
            files=[
                ("files", ("one.pdf", self.make_pdf("ONE"), "application/pdf")),
                ("files", ("two.pdf", self.make_pdf("TWO"), "application/pdf")),
            ],
        )
        self.assertEqual(response.status_code, 200, response.text)
        merged = fitz.open(stream=response.content, filetype="pdf")
        try:
            self.assertEqual(merged.page_count, 2)
            self.assertIn("ONE", merged[0].get_text())
            self.assertIn("TWO", merged[1].get_text())
        finally:
            merged.close()

    def test_range_split_returns_a_zip(self) -> None:
        response = self.client.post(
            "/api/pdf/split/zip",
            files=self.upload(self.make_pdf("ONE", "TWO", "THREE")),
            data={"ranges": "1,3"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers.get("content-type"), "application/zip")
        with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
            names = archive.namelist()
            self.assertEqual(len(names), 2)
            first_pdf = fitz.open(stream=archive.read(names[0]), filetype="pdf")
            try:
                self.assertEqual(first_pdf.page_count, 1)
                self.assertIn("ONE", first_pdf[0].get_text())
            finally:
                first_pdf.close()

    def test_layout_ocr_returns_pdf_text_blocks_without_tesseract(self) -> None:
        response = self.client.post(
            "/api/pdf/ocr",
            files=self.upload(self.make_pdf("LAYOUT_BLOCK")),
            data={"languages": "eng", "output": "layout"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["pages"][0]["source"], "pdf-text")
        self.assertTrue(payload["pages"][0]["blocks"])
        self.assertIn("LAYOUT_BLOCK", payload["pages"][0]["blocks"][0]["text"])

    def test_excel_conversion_creates_a_workbook(self) -> None:
        response = self.client.post(
            "/api/pdf/convert/xlsx",
            files=self.upload(self.make_pdf("EXCEL_CONTENT")),
        )
        self.assertEqual(response.status_code, 200, response.text)
        workbook = load_workbook(io.BytesIO(response.content), read_only=True, data_only=True)
        try:
            sheet = workbook.active
            values = [str(cell.value) for row in sheet.iter_rows() for cell in row if cell.value is not None]
            self.assertTrue(any("EXCEL_CONTENT" in value for value in values))
        finally:
            workbook.close()

    def test_compression_returns_a_valid_pdf(self) -> None:
        response = self.client.post(
            "/api/pdf/compress",
            files=self.upload(self.make_pdf("COMPRESS_ME")),
            data={"image_quality": "85"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        result = fitz.open(stream=response.content, filetype="pdf")
        try:
            self.assertEqual(result.page_count, 1)
            self.assertIn("COMPRESS_ME", result[0].get_text())
        finally:
            result.close()

    def test_rtf_conversion(self) -> None:
        response = self.client.post(
            "/api/pdf/convert/rtf",
            files=self.upload(self.make_pdf("RTF_CONTENT")),
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers.get("content-type"), "application/rtf")
        self.assertIn(b"RTF_CONTENT", response.content)

    def test_aes256_password_protection(self) -> None:
        response = self.client.post(
            "/api/pdf/protect",
            files=self.upload(self.make_pdf("PROTECTED_CONTENT")),
            data={"user_password": "correct-horse-battery"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        protected = fitz.open(stream=response.content, filetype="pdf")
        try:
            self.assertTrue(protected.needs_pass)
            self.assertEqual(protected.authenticate("correct-horse-battery"), 2)
            self.assertIn("PROTECTED_CONTENT", protected[0].get_text())
        finally:
            protected.close()

    def test_rejects_non_pdf_upload(self) -> None:
        response = self.client.post(
            "/api/pdf/info",
            files={"file": ("not-pdf.txt", b"not a PDF", "text/plain")},
        )
        self.assertEqual(response.status_code, 415)


class ProductionFrontendVerificationTests(unittest.TestCase):
    def make_fixture(self, root: Path) -> tuple[Path, Path, Path]:
        dist = root / "frontend" / "dist"
        assets = dist / "assets"
        assets.mkdir(parents=True)
        js = b"console.log('DS PDF Studio Tool production bundle');"
        css = b"body{font-family:Arial,sans-serif}"
        (assets / "app.js").write_bytes(js)
        (assets / "app.css").write_bytes(css)
        (dist / "index.html").write_text(
            '<!doctype html><html><head><link rel="stylesheet" href="/assets/app.css"></head>'
            '<body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>',
            encoding="utf-8",
        )
        package = root / "frontend" / "package.json"
        package.write_text(json.dumps({
            "name": "ds-pdf-studio-tool",
            "version": "1.7.0",
            "devDependencies": {"vite": "8.3.8", "@vitejs/plugin-react": "6.3.0"},
        }), encoding="utf-8")
        manifest_assets = []
        for name, data in (("assets/app.js", js), ("assets/app.css", css)):
            manifest_assets.append({"file": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
        manifest = {
            "application": "DS PDF Studio Tool",
            "version": "1.7.0",
            "verified": True,
            "entrypoint": "index.html",
            "vite": "8.3.8",
            "reactPlugin": "6.3.0",
            "totalAssetBytes": sum(item["bytes"] for item in manifest_assets),
            "assets": manifest_assets,
        }
        manifest_path = dist / "BUILD-INFO.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        return dist, package, manifest_path

    def test_production_bundle_verifier_accepts_valid_assets(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            dist, package, manifest = self.make_fixture(Path(temp))
            with patch.object(verify_frontend, "DIST", dist), patch.object(verify_frontend, "PACKAGE_JSON", package), patch.object(verify_frontend, "MANIFEST", manifest):
                result = verify_frontend.verify_bundle()
            self.assertEqual(result["version"], "1.7.0")
            self.assertEqual(result["assets"], 2)

    def test_production_bundle_verifier_rejects_tampered_assets(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            dist, package, manifest = self.make_fixture(Path(temp))
            (dist / "assets" / "app.js").write_bytes(b"tampered")
            with patch.object(verify_frontend, "DIST", dist), patch.object(verify_frontend, "PACKAGE_JSON", package), patch.object(verify_frontend, "MANIFEST", manifest):
                with self.assertRaisesRegex(RuntimeError, "SHA-256 mismatch"):
                    verify_frontend.verify_bundle()

    def test_production_homepage_serves_built_index(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            Path(temp, "index.html").write_text("<html><body>Production UI</body></html>", encoding="utf-8")
            with patch.object(backend_main, "FRONTEND_DIST", temp):
                response = TestClient(app).get("/")
            self.assertEqual(response.status_code, 200)
            self.assertIn("Production UI", response.text)


class FrontendBuildOptimizationTests(unittest.TestCase):
    def test_pdfjs_and_worker_are_lazy_imported(self) -> None:
        app_source = (Path(__file__).resolve().parents[1] / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
        self.assertIn("import('pdfjs-dist')", app_source)
        self.assertIn("import('pdfjs-dist/build/pdf.worker.min.mjs?url')", app_source)
        self.assertNotIn("import * as pdfjsLib from 'pdfjs-dist'", app_source)

    def test_vite_uses_modern_optimized_build_without_manual_chunk_groups(self) -> None:
        config = (Path(__file__).resolve().parents[1] / "frontend" / "vite.config.js").read_text(encoding="utf-8")
        self.assertIn("target: 'es2022'", config)
        self.assertIn("minify: true", config)
        self.assertIn("assetsInlineLimit: 4096", config)
        self.assertNotIn("codeSplitting:", config)
        self.assertNotIn("manualChunks", config)

    def test_pdf_file_input_is_mounted_once_at_app_root(self) -> None:
        app_source = (Path(__file__).resolve().parents[1] / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
        self.assertEqual(app_source.count("ref={inputRef}"), 1)
        self.assertIn('aria-label="Choose a PDF document to edit"', app_source)
        self.assertLess(app_source.index('ref={inputRef}'), app_source.index('<main className="page-main">'))

    def test_upload_actions_are_visible_in_header_and_welcome_screen(self) -> None:
        app_source = (Path(__file__).resolve().parents[1] / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
        self.assertIn("className=\"button button-primary top-upload\"", app_source)
        self.assertIn("{pdfFile ? 'Open PDF' : 'Upload PDF'}", app_source)
        self.assertIn("Upload PDF to Edit", app_source)
        self.assertIn("onClick={openPdfPicker}", app_source)

    def test_pdf_upload_picker_supports_reselecting_same_file(self) -> None:
        app_source = (Path(__file__).resolve().parents[1] / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
        self.assertIn("const openPdfPicker = useCallback(() =>", app_source)
        self.assertIn("picker.value = '';", app_source)
        self.assertIn("const picker = event.currentTarget;", app_source)
        self.assertIn("picker.value = '';", app_source)
        self.assertIn("picker.showPicker()", app_source)
        self.assertNotIn(".hidden-input { display: none; }", (Path(__file__).resolve().parents[1] / "frontend" / "src" / "styles.css").read_text(encoding="utf-8"))

    def test_find_replace_has_explicit_search_and_apply_actions(self) -> None:
        app_source = (Path(__file__).resolve().parents[1] / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
        self.assertIn("const findInDocument = async () =>", app_source)
        self.assertIn("/api/pdf/find", app_source)
        self.assertIn("Apply replacement & download PDF", app_source)
        self.assertIn("setActivePage(item.page)", app_source)

    def test_ai_panel_explains_provider_key_and_refreshes_status(self) -> None:
        app_source = (Path(__file__).resolve().parents[1] / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
        self.assertIn("AI_TRANSLATION_API_KEY", app_source)
        self.assertIn("PDF_UNICODE_FONT_PATH", app_source)
        self.assertIn("onClick={refreshApiStatus}", app_source)
        self.assertIn("A ChatGPT subscription does not automatically provide API access", app_source)

    def test_ctrl_o_uses_the_shared_pdf_picker(self) -> None:
        app_source = (Path(__file__).resolve().parents[1] / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
        self.assertIn("if (mod && event.key.toLowerCase() === 'o')", app_source)
        self.assertIn("openPdfPicker();", app_source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
