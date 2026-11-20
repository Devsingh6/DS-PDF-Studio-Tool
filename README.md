# DS PDF Studio Tool — Advanced PDF Editor (React + Python)

**Release: 1.7.0**

Product branding in the application, browser tab, API documentation, generated PDF metadata and deployment assets is **DS PDF Studio Tool**.

A browser-based PDF workspace built with **React 18 + Vite** and a **Python FastAPI + PyMuPDF** processing API. Documents are edited in memory by the local Python service. The app does not have a user database or permanent upload storage in this starter.


## Nitro Pro-inspired ribbon workspace (v1.7.0)

The editor now uses an original DS-branded, ribbon-based workspace inspired by the category-and-command workflow common to professional desktop PDF editors. It is not a copy of Nitro Pro branding or proprietary assets. The ribbon groups tools into Home, Organize, Edit, Convert, Review, Forms & Sign, Protect, OCR & AI, Batch and Measure. Each command is labelled **Ready** when it calls a working feature in this release, or **Roadmap** when its complete processing workflow is not yet implemented. Roadmap commands explain their status rather than pretending to run.

### Ready in this release

- Upload/open, export, merge, split selected pages and ZIP packaging.
- Reorder, rotate and delete pages; add text/image overlays, watermark and page numbers.
- Find & replace selectable PDF text, with matching-page results.
- PDF to Word, Excel and RTF; PDF compression.
- Searchable OCR and layout OCR; AI translation when the provider key and Unicode font are configured.
- Reusable visual stamps and signature-image templates; AES-256 password protection.

### Roadmap items shown in the ribbon

The feature catalogue also presents the requested advanced workflows: crop and duplicate pages, PDF letterhead overlay, paragraph reflow, whiteout, shapes and markup, sticky notes, Bates numbering, blueprint measurement/takeoff, Office and image conversions, webpage/CAD/Visio conversion, e-invoice and portfolio packages, fillable forms, multi-party e-signing and audit trails, permission restrictions, unlocking, permanent redaction, deskew, repair, linearization, side-by-side comparison, AI PDF chat/summarization and batch operations. These are visibly marked Roadmap and are not represented as completed backend capabilities in v1.7.0.

## What is included

| Area | Features |
|---|---|
| Page editing | PDF preview, page selection, reorder, rotate, delete, export selected pages |
| PDF operations | Merge PDFs, advanced range splitting, ZIP packaging, stream compression and image recompression |
| Annotations | Add text and images, watermarks, page numbers, reusable stamps and signature-image templates |
| Conversion | PDF to Word (visual-fidelity or editable reconstruction), Excel table/data extraction, RTF text reconstruction |
| OCR & language | Tesseract OCR; searchable PDF; coordinate-aware layout OCR; OCR language catalogue; AI translation targets for all 22 scheduled Indian languages |
| Security | AES-256 password protection, file signature checks, upload-size and page-count limits, encrypted input PDFs are rejected unless first opened by an authorised user |
| AI translation | Translate selectable or OCR-recognised document text into an Indian language and reinsert it into the source page regions, with original page sizes and non-text elements retained where possible |
| Productivity | Core keyboard shortcuts and undo/redo for page and overlay edits |

## Important conversion and fidelity notes

PDF is a fixed-layout page format. Word, Excel and RTF are different document models, so a universal conversion cannot promise both pixel-perfect appearance and fully editable content for every source file. The editor therefore exposes conversion modes and uses different strategies:

### PDF to Word

- **Preserve page appearance (image-backed):** renders each PDF page into a full-page image inside a Word document. It is intended to keep the visual layout extremely close to the PDF, including forms, seals, signatures and unusual fonts. Text inside the page image is not individually editable.
- **Editable Word reconstruction:** uses `pdf2docx` to rebuild text, paragraphs, tables and images as Word elements. This is the editable mode, but font metrics, columns, line breaks, complex tables and page breaks may differ from the source. Inspect the converted file before relying on it.

### PDF to Excel

The converter extracts detected tables into worksheet cells. If a page has no detected table, its selectable text is placed into a worksheet as a fallback. It preserves extracted data and a basic worksheet structure, not the original PDF's exact visual page design. Scanned PDFs should be OCR-processed first.

### PDF to RTF

RTF output reconstructs selectable text with basic font size, bold, italic and text colour. It is not a pixel-perfect page-layout conversion. Complex graphics, exact columns, embedded fonts and precise table geometry may not survive.

### OCR and Indian-language coverage

OCR is performed by the external Tesseract application. The API can return extracted text (`output=text`), a searchable PDF (`output=pdf`) or layout-aware JSON (`output=layout`). Layout JSON includes page dimensions, text blocks and their bounding boxes so downstream conversion and translation can work with page geometry instead of a plain text dump.

The language selector includes English and all 22 languages in the Eighth Schedule of the Constitution: Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri, Konkani, Maithili, Malayalam, Manipuri (Meitei), Marathi, Nepali, Odia, Punjabi, Sanskrit, Santali, Sindhi, Tamil, Telugu and Urdu. This is the translation target catalogue. Actual OCR availability depends on whether a compatible Tesseract `*.traineddata` model is installed. Some scripts or languages require community/third-party Indic OCR trained-data rather than the standard Tesseract bundle. The API endpoint `/api/pdf/languages` reports which Tesseract language packs are installed on the current server. See the upstream Tesseract language-data information and Indic OCR model project for model availability: https://github.com/tesseract-ocr/tesseract/wiki/Data-Files and https://indic-ocr.github.io/tessdata/.

OCR accuracy depends on scan quality, font, skew, language model and resolution. Install matching models for mixed-language documents and enter codes such as `eng+hin`, `eng+tam` or `hin+tam`.

### Fixes for AI translation and sentence editing (v1.6.8)

The editor now reports whether the Python API, AI provider key and an Indic Unicode font are available. AI translation is not activated by default: add your own OpenAI-compatible API key in `backend/.env`, save it, and restart the Python server. Example Windows setup:

```cmd
copy backend\.env.example backend\.env
notepad backend\.env
```

Set these values in `backend/.env` (do not put secrets in React or share them in chat):

```dotenv
AI_TRANSLATION_API_KEY=your_provider_api_key
AI_TRANSLATION_API_URL=https://api.openai.com/v1/chat/completions
AI_TRANSLATION_MODEL=gpt-4.1-mini
PDF_UNICODE_FONT_PATH=C:/Windows/Fonts/Nirmala.ttf
```

Use a model available to your provider account. A ChatGPT subscription does not itself grant API access; API usage may be billed separately. After restarting the backend, click **Refresh status** in the AI panel. The panel shows whether the key and Unicode font were detected. Provider errors now identify common causes such as invalid credentials (401/403), unavailable model/endpoint (404), quota or rate limits (429), timeouts and connection/DNS errors.

For text editing, enter the exact phrase in **Find & replace text**, click **Find in document**, review the matching pages, enter replacement text, and click **Apply replacement & download PDF**. This creates a new PDF and leaves the original untouched. The feature edits selectable text; scanned/image-only pages need OCR first. Complex layout, font and spacing changes still require visual review.

### AI translation with layout-aware PDF reconstruction

The new **AI translation & layout** tool translates native PDF text blocks and, for scanned/image-only pages, uses Tesseract OCR to recover paragraph text and coordinates. Each translated block is drawn back into its original page region. Page size, block positions, text colour and approximate font size are retained where possible. The tool supports translation targets for all 22 scheduled Indian languages; real translation quality and script handling depend on the configured AI model.

To enable translation:

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `AI_TRANSLATION_API_KEY` to your own provider key.
3. Set `AI_TRANSLATION_MODEL` to a model available in your account. The default is `gpt-4.1-mini`.
4. Optionally set `AI_TRANSLATION_API_URL` to an OpenAI-compatible Chat Completions endpoint.
5. Set `PDF_UNICODE_FONT_PATH` to a font file covering the output script, such as a licensed Nirmala UI or Noto Sans Tamil font, then restart the API.
6. Open the editor, choose source language (or auto-detect) and target language, tick the consent box, and select **Translate & preserve page layout**.

The API sends extracted text blocks—not the original PDF binary—to the configured AI translation provider. The document text leaves the local machine only after the user explicitly checks the consent box and starts translation. Never put provider keys into the React source code or commit `backend/.env` to source control.

**Formatting limitation:** this is layout-aware reconstruction, not a guarantee of pixel-perfect or legally authoritative translation. Longer translated text can need a smaller font and may not fit the original box. For scanned pages, text regions are covered with white rectangles before translated text is placed; this can be visible on coloured, patterned or photographic backgrounds. Complex tables, multi-column pages, stamps and fine typography should be proofread and may need manual adjustment. Keep the original PDF and have a qualified reviewer check legal, compliance and official documents before use.

## Corporate design refresh (v1.6.5)

The React interface now uses a professional corporate visual system: deep navy and teal accents, restrained surfaces, clearer information hierarchy, larger accessible labels and controls, refined PDF page panels, a more legible editing workspace, and responsive layouts for desktop, tablet and mobile. The PDF editor actions and API workflows are unchanged.

## Requirements

- Python 3.11 recommended (Python 3.10 or newer may work depending on optional conversion package wheels)
- Node.js 20.19+ or 22.12+ (Vite 8 requirement) and npm 10 or newer (Node.js 22.16.0 is pinned in `.nvmrc` and `.node-version`)
- Windows: `py` Python launcher is used in the included batch files
- Tesseract OCR application and required language data for OCR features

## Run locally on Windows

In development, open `http://localhost:5173` for the React UI. For convenience, opening `http://127.0.0.1:8000/` in the browser automatically redirects to the Vite UI. In production, the same port-8000 root serves the built React application.

1. Extract the ZIP package.
2. Open the extracted `DS-PDF-Studio-Tool` folder.
3. Double-click **`start-dev.bat`**.
4. The batch file creates a Python virtual environment, installs backend dependencies, installs React dependencies and starts both services.

Open:

- React editor: http://localhost:5173
- Python API health: http://127.0.0.1:8000/api/health
- Interactive API documentation: http://127.0.0.1:8000/docs

### Manual start

Backend terminal, from the project root:

```powershell
py -m venv .venv
.venv\Scripts\activate
py -m pip install --upgrade pip
py -m pip install -r backend\requirements.txt
py -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend terminal:

```powershell
cd frontend
node scripts/install-deps.mjs
npm run dev
```

## Set up multilingual Tesseract OCR on Windows

1. Install the Tesseract OCR application on the same PC that runs FastAPI.
2. Make sure its executable folder is on `PATH`. A common installation folder is `C:\Program Files\Tesseract-OCR`.
3. Install the trained-data files for the languages you need in Tesseract's `tessdata` directory. Common language codes include `eng` (English), `tam` (Tamil), `hin` (Hindi), `tel` (Telugu), `kan` (Kannada), `mal` (Malayalam), `ben` (Bengali), `guj` (Gujarati), `mar` (Marathi) and `urd` (Urdu).
4. Open a new terminal and verify the installation:

```powershell
tesseract --version
tesseract --list-langs
```

5. In the editor's OCR field, enter combinations such as `eng`, `tam`, `eng+tam`, or `eng+tam+hin`.

The codes only work when their matching `*.traineddata` files are installed. OCR is limited to 60 pages per request in this starter; split larger documents first.

For adding Tamil or other Indic text as a new overlay or replacement, configure `PDF_UNICODE_FONT_PATH` to a licensed Unicode `.ttf` or `.otf` font that covers those characters. For example, on Windows a font such as `C:/Windows/Fonts/Nirmala.ttf` may be available. The backend returns a clear validation error for unsupported non-Latin text if no font is configured.

## Conversion details

The following packages are installed by `backend/requirements.txt`:

- `python-docx` — Word document generation
- `pdf2docx` — editable PDF-to-Word reconstruction
- `openpyxl` — Excel workbook creation
- `pytesseract` + `Pillow` — OCR image processing
- `PyMuPDF` — PDF parsing, rendering, editing, compression and encryption

If `pdf2docx` cannot be imported, the API returns a clear `501` error for editable Word mode and the faithful image-backed Word mode remains available. Re-run `py -m pip install -r backend\requirements.txt` after changing requirements.

## Features and usage details

### Advanced splitting

Enter one-based ranges separated by commas, for example:

- `1-3,5,8-10` creates one PDF for pages 1–3, one for page 5, and one for pages 8–10.
- `4` creates one PDF containing only page 4.

The result is a ZIP archive containing one PDF per range. Overlapping or out-of-bounds ranges are rejected.

### PDF compression

Compression removes unused PDF objects, deflates streams and recompresses supported opaque photos using the selected quality. Transparent images are left unchanged to avoid altering their appearance. Text and vector paths remain vector content. Compression may not reduce every file; a PDF containing already-compressed JPEG images can show little or no size reduction.

### Stamp and signature templates

Built-in stamps include APPROVED, RECEIVED, DRAFT, CONFIDENTIAL and COPY. Custom text stamps and up to three small signature-image templates are kept in the current browser's `localStorage`; they are not uploaded to a central template library and are not shared across browsers/devices. A signature image is a visual overlay only—not a cryptographic digital signature or proof of signer identity.

### Password protection

The Protect tool creates an AES-256 encrypted PDF that requires the supplied open password. Use a strong password and keep it safely. This starter cannot recover lost passwords. The feature is password encryption, not certificate-based signing, PAdES, timestamping or identity validation.

### Keyboard shortcuts implemented

| Action | Shortcut |
|---|---|
| Open PDF | `Ctrl + O` / `Cmd + O` |
| Export PDF | `Ctrl + S` / `Cmd + S` |
| Export selected pages | `Ctrl + Shift + S` / `Cmd + Shift + S` |
| Undo / redo | `Ctrl + Z`, `Ctrl + Y` (also `Ctrl + Shift + Z`) |
| Rotate active page | `Ctrl + ←` / `Ctrl + →` |
| Delete active page | `Delete` |

These are the core shortcuts implemented in this version, not complete one-to-one parity with every Adobe Acrobat, Foxit or other paid-editor shortcut. Shortcuts are suppressed while typing in input fields.

## Production security checklist

This is a local development starter, not a fully hardened public SaaS deployment. Before internet exposure:

- Put the application behind HTTPS and a trusted reverse proxy.
- Add authentication, authorisation and per-user document ownership.
- Keep `CORS_ORIGINS` restricted to the real frontend origin; do not use wildcard origins with credentialed sessions.
- Add rate limiting, concurrent-job limits, request timeouts, per-user quotas and server-side audit logs.
- Configure reverse-proxy and ASGI upload limits to match `PDF_MAX_FILE_MB`.
- Run the process as a non-root, restricted service account; keep the OS and Python dependencies patched.
- Add malware scanning and a documented retention/deletion policy if documents can come from external users.
- Move stamp/signature templates to an authenticated, access-controlled library with encryption at rest before supporting shared or business-critical assets.
- Keep secrets outside source control and never log passwords, document contents or access tokens.
- For certificate-based digital signatures, use a separate managed signing workflow with private keys protected by a certificate store/HSM. Do not store private signing keys in browser local storage.
- Test with representative PDFs, including scanned pages, Tamil and other scripts, mixed page sizes, embedded fonts, tables, redactions and large images.

## Environment settings

Copy `backend/.env.example` as a reference and supply environment variables through the shell/service manager:

- `PDF_MAX_FILE_MB` — upload limit per PDF (default 100 MB)
- `PDF_MAX_PAGES` — input document page limit (default 500)
- `CORS_ORIGINS` — comma-separated development frontend origins
- `AI_TRANSLATION_API_KEY` — optional AI translation provider key
- `AI_TRANSLATION_API_URL` — optional OpenAI-compatible Chat Completions endpoint
- `AI_TRANSLATION_MODEL` — model name supported by the configured provider
- `PDF_UNICODE_FONT_PATH` — licensed font file that covers the translated script

The backend automatically loads `backend/.env` when present. Copy `backend/.env.example` to `backend/.env` and set the values you need. The `.env` file is ignored by Git and should never be shared or committed.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API status |
| POST | `/api/pdf/info` | PDF page count and metadata |
| POST | `/api/pdf/export` | Reorder, rotate, overlays, watermark, page numbers and basic text replacement |
| POST | `/api/pdf/split` | Export selected pages to one PDF |
| POST | `/api/pdf/merge` | Merge multiple uploaded PDFs |
| POST | `/api/pdf/split/zip` | Export each page range as a separate PDF in a ZIP |
| POST | `/api/pdf/compress` | Optimise images and PDF streams |
| POST | `/api/pdf/zip` | Package multiple PDFs into one ZIP |
| POST | `/api/pdf/convert/docx` | PDF to Word (`mode=faithful` or `mode=editable`) |
| POST | `/api/pdf/convert/xlsx` | Extract PDF tables/text to Excel |
| POST | `/api/pdf/convert/rtf` | Reconstruct selectable text as RTF |
| GET | `/api/pdf/languages` | Indian language catalogue and installed OCR models |
| POST | `/api/pdf/ocr` | Multilingual OCR; `output=pdf`, `output=text` or `output=layout` |
| POST | `/api/pdf/translate` | AI translation with page-coordinate-aware text replacement |
| POST | `/api/pdf/protect` | AES-256 password-protected PDF |

## Production build and verification (recommended)

The project includes a verifiable production workflow rather than relying only on the Vite development server. The v1.6.8 installer skips all registry requests when every exact-version frontend package is installed and `npm ls --depth=0` confirms the tree is complete. It uses Vite 8.3.8 with `@vitejs/plugin-react` 6.3.0 and React 18. PDF.js and its worker are dynamically loaded only after a document is selected, producing a separate lazy renderer chunk. Vite/Rolldown's dependency-aware chunking is used instead of hand-authored chunk groups. The build targets ES2022, minifies output and caps inline assets at 4 KB. [Vite build configuration](https://vite.dev/config/build-options).

### Vite 8 toolchain requirements

This release pins Vite 8.3.8 and `@vitejs/plugin-react` 6.3.0. Use Node.js 20.19+ or 22.12+ (Node 22.16.0 is the pinned baseline in `.nvmrc` and `.node-version`); Node 21 is not supported by the Vite 8 engine range. The build verifier checks the installed package versions before writing `BUILD-INFO.json`. The production target is ES2022, with minification enabled and small-asset inlining limited to 4 KB.

### Windows — one command

1. Open the project folder.
2. To compile React independently, double-click `build-frontend.bat`. This step needs Node.js/npm only and creates `frontend/dist` plus `frontend/dist/BUILD-INFO.json`.
3. To build the entire local website, double-click `build-production.bat`. It runs the frontend build first, then installs Python backend requirements, verifies the assets, compiles Python and runs the API smoke tests.
4. On the first successful npm install, npm creates `frontend/package-lock.json`. Keep/commit this file with the source code; subsequent installs use `npm ci` for repeatability.
5. Double-click `start-production.bat` to start the combined production server.

Open **http://127.0.0.1:8000**. The React site and `/api/*` endpoints are served from the same origin by FastAPI. The API docs remain at `/docs`. The production launcher refuses to start without the build-verification manifest and rechecks every referenced JavaScript/CSS SHA-256 hash before serving the application.

### npm registry / `EAI_AGAIN` troubleshooting (v1.6.1)

`EAI_AGAIN` means the operating system could not resolve the npm registry hostname at that moment. It is not a React/Vite source-code compilation error. The build now runs `frontend/scripts/install-deps.mjs` before installing dependencies. It uses the same npm configuration as the actual install, checks connectivity using `npm ping`, gives a specific diagnosis, and will not silently switch package sources.

On Windows Command Prompt, check DNS:

```bat
nslookup registry.npmjs.org
npm ping --registry=https://registry.npmjs.org/
```

If `nslookup` fails, resolve the computer/network DNS, VPN, proxy or firewall issue first. You can flush the Windows DNS cache with `ipconfig /flushdns`. Do not hard-code a registry IP address; the registry uses managed hosts and HTTPS certificates.

If your company provides an approved npm registry/mirror, configure it for this terminal session. PowerShell example:

```powershell
$env:NPM_CONFIG_REGISTRY = "https://your-approved-registry.example/"
.\build-production.bat
```

Or keep the official registry as primary and explicitly configure an approved fallback:

```powershell
$env:PDF_STUDIO_NPM_REGISTRY_FALLBACK = "https://your-approved-fallback.example/"
.\build-production.bat
```

The installer tests the primary registry up to three times, tries the existing npm cache in offline mode when DNS is unavailable, and only uses a different registry when an approved fallback was explicitly supplied. The fallback must use HTTPS (HTTP is allowed only for localhost testing). For Docker, use `docker compose build --build-arg NPM_REGISTRY=https://your-approved-registry.example/` or add `--build-arg NPM_REGISTRY_FALLBACK=https://your-approved-fallback.example/`. You can test connectivity without installing packages with:

```bat
cd frontend
npm run check:registry
```

The npm retry settings are now bounded to avoid waiting many minutes on an unreachable DNS server.

If this PC already has all exact dependencies installed, or its npm cache contains every required package, you can also attempt a fully offline build without contacting any registry:

```powershell
$env:PDF_STUDIO_NPM_OFFLINE = "1"
.\build-production.bat
```

Offline mode first reuses `frontend/node_modules` only when every direct dependency version exactly matches `package.json` and `npm ls --depth=0` confirms the installed dependency tree is complete; otherwise it asks npm to install from its local cache using `--offline`. It fails clearly when the cache is incomplete. It does not invent or download missing packages.

### Manual frontend-only production build

From the project root, double-click `build-frontend.bat`, or run:

```powershell
cd frontend
node scripts/install-deps.mjs
npm run build:verify
```

This builds only the React/Vite frontend and does not require Python to be installed. After it succeeds, `frontend/dist/BUILD-INFO.json` must exist.

### Manual full production build

```powershell
# Frontend — run in frontend/; installer chooses npm install or npm ci
cd frontend
node scripts/install-deps.mjs
npm run build:verify
cd ..

# Backend — run from project root
py -m venv .venv
.venv\Scripts\activate
py -m pip install -r backend\requirements.txt
py -m compileall -q backend tests
py -m unittest discover -s tests -v
py -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### Linux/macOS — one command

From the project root, run:

```bash
chmod +x build-production.sh
./build-production.sh
```

The script installs the Python and npm dependencies, runs the Vite build verifier, and executes the Python API smoke tests.

### Docker production deployment

Docker is the recommended repeatable deployment route because it builds the React assets and Python runtime in separate stages and runs the final service as a non-root user.

```powershell
copy .env.example .env
# Edit .env and add AI_TRANSLATION_API_KEY only when translation is enabled.
docker compose build
docker compose up -d
docker compose logs -f ds-pdf-studio-tool
```

Open **http://localhost:8000**. Stop the service with `docker compose down`. The default Docker image includes English Tesseract OCR. Add the required Tesseract language packages to the `apt-get install` line in `Dockerfile` (or install them in a derived image) for regional-language OCR. Mount a licensed Unicode font into `./fonts` and set `PDF_UNICODE_FONT_PATH` in `.env` for Tamil/Indic PDF text rendering.

### Automated cloud build

`.github/workflows/ci.yml` runs on every GitHub push and pull request. It builds and verifies the optimized React production bundle (including the `BUILD-INFO.json` manifest and asset hashes) and runs the Python API smoke tests on Python 3.11. The frontend job uploads `frontend/dist` and the generated `frontend/package-lock.json` as the **ds-pdf-studio-tool-frontend-production** workflow artifact (14-day retention). After pushing this folder to a GitHub repository, open the repository's **Actions** tab and download the artifact from the successful run. `.github/dependabot.yml` checks npm, Python and GitHub Actions dependencies monthly and opens update pull requests.

### Test commands

```powershell
py -m compileall -q backend tests
py -m unittest discover -s tests -v
```

The smoke suite verifies API health, the language catalogue, development and production homepage routing, favicon routes, production manifest and asset hashes (including tamper detection), PDF metadata, reorder/rotate export, merge, ZIP range splitting, layout-aware text extraction, Excel and RTF conversion, compression, AES-256 protection, and rejection of non-PDF uploads.

**Build-environment limitation:** the source package does not contain `node_modules` or a prebuilt `frontend/dist`. The packaging environment used to create this release could not resolve `registry.npmjs.org` (`EAI_AGAIN`), so it could not download Vite/React or create the actual production bundle here. Version 1.5.0 added a registry preflight installer that reports this as a DNS/network/proxy issue, retries the check briefly, and supports an explicitly configured organisation-approved fallback registry. The production workflow and checks are prepared, but the Vite bundle is only considered built after `build-production.bat`, `build-production.sh`, Docker build or the GitHub Actions job completes successfully. The verified bundle contains `frontend/dist/BUILD-INFO.json`, including SHA-256 hashes for compiled assets. No prebuilt bundle is claimed in this release.

FastAPI serves `frontend/dist` from the same origin when the production build exists. The React source is in `frontend/src` and the Python API is in `backend/main.py`.


### Production build optimization update (v1.6.8)

- PDF.js and `pdf.worker.min.mjs` now load on demand after a PDF is selected. The initial React workspace is no longer forced to download the full PDF rendering engine on first page load.
- Removed manually configured Rolldown chunk groups and retained Vite 8's dependency-aware chunk graph to avoid splitting tightly coupled library modules incorrectly.
- Set the production JavaScript target to ES2022, enabled minification, capped inline assets at 4 KB, and lowered the chunk warning threshold to 900 KB.
- Local dependency reuse now verifies `npm ls --depth=0` in addition to direct package versions, preventing an incomplete `node_modules` folder from being mistaken for a build-ready installation.
- Added `build-frontend.bat` and `build-frontend.sh` so the React production bundle can be compiled and verified independently of Python backend setup.
- Updated backend API, npm package, Docker image and release metadata to 1.6.8.

### Production build reliability update (v1.6.5)

- If `frontend/node_modules` already contains the exact versions pinned in `frontend/package.json`, the dependency installer now skips npm registry checks and package installation. This is useful when the workstation already has a working dependency installation but internet/DNS is temporarily unavailable.
- If packages are missing, the installer retains the registry check, retry diagnostics and approved mirror option. When the registry is unavailable, it automatically makes one attempt to install from npm's existing local cache (`--offline`) before failing. You can still force offline mode with `PDF_STUDIO_NPM_OFFLINE=1`.
- When upgrading from an earlier DS PDF Studio Tool folder, you may copy its `frontend\node_modules` (and `frontend\package-lock.json`, if present) into the new release folder. The installer checks all direct package versions and reuses the packages without contacting npm only when they match the current pins.
- `backend/verify_frontend.py` validates the production `index.html`, JS/CSS references, application version, build manifest, asset sizes and SHA-256 hashes using Python's standard library.
- `start-production.bat` and the Docker runtime perform that verification before starting FastAPI. The build script also runs it after Vite compilation.
- A genuine Vite production bundle is generated only by `npm run build:verify`; the source ZIP does not include a fake or hand-written `dist` directory.


## PDF upload / open control (v1.6.8)

The PDF picker is mounted once at the application root so it remains available in both the welcome screen and editing workspace. Use the always-visible **Upload PDF** button in the top bar, the **Upload PDF to Edit** button in the welcome card, drag a PDF into the drop area, or press `Ctrl+O` / `Cmd+O`. In the editor, the header button changes to **Open PDF** and the document action bar also provides **Open another**. The file picker resets after selection so the same PDF can be reopened. The browser accepts PDF files up to 100 MB; PDF contents are loaded by PDF.js in the browser and sent to the local API only when a server-side PDF operation is requested.


## v1.6.8 — Troubleshooting upload, sentence editing and AI translation

### PDF picker
The single PDF input stays mounted off-screen (not `display:none`) so Chrome/Edge can open it through the native picker. Header and welcome upload buttons use `showPicker()` with a `.click()` fallback. If you are upgrading an existing install, stop the old server, replace the source files, rebuild the frontend, and hard-refresh the browser with `Ctrl+F5`.

### Find and replace a sentence
1. Open a PDF that contains selectable text (not just scanned page images).
2. In **Find & replace text**, enter the exact sentence or phrase.
3. Click **Find in document** and select the page result.
4. Enter the replacement sentence and click **Apply replacement & download PDF**.
5. The result is downloaded as `-text-edited.pdf`; the original source file is not overwritten.

For scanned/image-only pages, first create a searchable PDF using OCR, open that OCR output, and then use Find & Replace. The export redacts the original text area and inserts replacement text; the original font/spacing can differ and must be reviewed.

### AI translation must be configured
AI translation cannot run until a real provider API key is configured. The starter intentionally ships with an empty key; it does not include an AI service account or free credits. A ChatGPT subscription does not automatically grant API access.

On Windows, from the project root:

```cmd
copy backend\.env.example backend\.env
notepad backend\.env
```

Set the API key/model and a Unicode font path in `backend/.env`:

```dotenv
AI_TRANSLATION_API_KEY=your_provider_api_key
AI_TRANSLATION_API_URL=https://api.openai.com/v1/chat/completions
AI_TRANSLATION_MODEL=gpt-4.1-mini
PDF_UNICODE_FONT_PATH=C:/Windows/Fonts/Nirmala.ttf
```

Save the file and restart the Python backend. In the AI translation panel, click **Refresh status**. The panel reports API connection, provider-key presence and Unicode-font detection without ever exposing the key. Provider errors now give specific next steps for 401/403, 404, 429, timeout and connection failures. Never put the API key in React files, screenshots or source control.
