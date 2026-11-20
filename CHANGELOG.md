## 1.7.0 — Professional ribbon workspace and full feature catalogue

- Added a Nitro Pro-inspired (original DS-branded) command ribbon with Home, Organize, Edit, Convert, Review, Forms & Sign, Protect, OCR & AI, Batch and Measure categories.
- Added a searchable-feeling command launcher layout with Ready/Roadmap status for every listed feature; Ready commands route to existing working tools, Roadmap commands explain that the workflow is not implemented yet.
- Added quick navigation from ribbon commands to the corresponding editor panel sections.
- Added feature groups for the complete requested PDF24/Nitro-style specification: document management, text editing, conversions, forms/signatures, OCR/repair, security, AI and batch.
- Preserved existing PDF processing, conversion, OCR, AI translation, stamp/signature and AES-256 features.
- Updated release metadata to 1.7.0.

## 1.6.8 — Fix PDF opening, sentence replacement and AI setup diagnostics

- Changed the shared PDF input from `display:none` to a visually hidden, mounted control and use the native `showPicker()` API with a click fallback.
- Added reliable input reset so the same PDF can be opened again.
- Added a selectable-text search endpoint that returns page/match locations.
- Replaced the ambiguous checkbox-only UI with explicit Find and Apply replacement & download actions.
- Fixed an export font-selection bug: Latin replacements always use Helvetica instead of an auto-detected Tamil-only font, avoiding NUL glyph output.
- Replacements now try progressively smaller text sizes to fit the source text rectangle.
- Added AI provider status and Unicode font diagnostics to the UI.
- Added actionable messages for missing API keys, missing Indic fonts, provider authentication, model/endpoint, rate-limit, timeout and connection errors.
- Added automatic Windows/Linux font detection with glyph coverage validation.
- Added regression tests for upload control behavior, find/replace, AI setup messaging and real text replacement.

## 1.6.7 — Make PDF upload entry point persistent and visible

- Added an always-visible top-bar **Upload PDF / Open PDF** action, including when no document is loaded.
- Renamed the main landing-page action to **Upload PDF to Edit**.
- Moved the PDF file input to the application root so it stays mounted across the welcome and editor views.
- Added robust picker handling and resets so the same PDF can be selected again.
- Routed Ctrl+O / Cmd+O through the same picker handler.
- Improved file validation feedback and mobile header spacing.
- Added frontend upload-control regression tests.

# Changelog

## 1.6.6 — Production bundle optimization and PDF.js lazy loading

- Changed PDF.js and its worker to dynamic imports. The initial corporate workspace no longer downloads/parses the PDF renderer until a user opens a PDF; Vite emits a lazy renderer chunk and worker asset.
- Removed fragile hand-authored Rolldown chunk groups and let Vite/Rolldown follow the real module graph. This reduces the risk of separating tightly-coupled module dependencies into incorrect shared chunks.
- Set the production target to ES2022 for modern desktop browsers, enabled minification explicitly, reduced small-asset inlining and tightened the chunk-size warning threshold.
- Strengthened offline dependency reuse: exact direct package versions are not enough; the installer now also runs local `npm ls --depth=0` to reject incomplete or invalid dependency trees before building.
- Updated release metadata and production image tag to 1.6.6.
- The Vite bundle is still not compiled in this packaging environment because DNS resolution for `registry.npmjs.org` returns `EAI_AGAIN`; no fake `dist` folder is included.

## 1.6.5 — Production build reliability

- Changed the npm dependency installer to reuse exact-version `node_modules` without requiring an npm registry ping. This lets an already-provisioned machine build while temporarily offline.
- Added an automatic one-time `npm install --offline` / `npm ci --offline` attempt from the existing npm cache when registry DNS is unavailable.
- Kept registry diagnostics and explicit offline/cache mode for machines that still need dependencies.
- Added a Python-standard-library production bundle verifier that validates the generated index, referenced JS/CSS files, manifest version, byte sizes and SHA-256 hashes.
- Production Windows startup and Docker startup now verify the actual built asset contents before serving the application.
- Production build scripts no longer perform an unnecessary `pip` self-upgrade before installing backend requirements.
- Added tests for production homepage serving and valid/tampered bundle manifests.
- Vite 8 compilation still requires the exact frontend dependencies to be installed; this packaging environment cannot reach npm registry DNS (`EAI_AGAIN`). The cache fallback was exercised with a simulated npm command; it was not represented as an actual cached-package build.


## 1.6.3 — Corporate interface refresh

- Reworked the landing workspace and editor styling with a restrained navy, blue and teal corporate palette.
- Improved typographic hierarchy, form readability, page thumbnails, editing panels, tool sections and document-stage contrast.
- Added responsive refinements for tablet and mobile layouts.
- Updated browser theme colour, product metadata and branded favicon.
- Kept existing PDF editing and API workflows unchanged.

## 1.6.1 — Local browser routing fix
- Opening the Python server root (`http://127.0.0.1:8000/`) now redirects to the React/Vite development server when no production bundle exists.
- In production, the root serves `frontend/dist/index.html`.
- Added a branded SVG favicon and favicon routes to prevent `/favicon.ico` 404 noise.
- Added API smoke tests for browser-root routing and favicon delivery.


## 1.6.0 — Vite 8 production toolchain upgrade

- Upgraded Vite to 8.3.8 and `@vitejs/plugin-react` to 6.3.0, the current supported toolchain versions checked for this release.
- Migrated build configuration from deprecated Rollup `manualChunks` to Vite 8/Rolldown `rolldownOptions.output.codeSplitting.groups`.
- Tightened Node.js compatibility checks to accept Node 20.19+ or 22.12+ (and later supported majors), rejecting unsupported Node 21.
- Added verification that the installed Vite and React plugin versions exactly match `package.json` before a build manifest can be written.
- Pinned the development/CI baseline to Node 22.16.0 using `.nvmrc` and `.node-version`; CI inspects the installed dependency tree.
- Bumped the backend/API and Docker application version to 1.6.0.
- The actual Vite bundle remains dependent on npm registry connectivity; the local build attempt in this environment is still blocked by DNS `EAI_AGAIN`.

## 1.5.1 — Rebrand to DS PDF Studio Tool

- Renamed the product throughout the React interface, browser title, Python API metadata, build output, Docker service/image, GitHub Actions artifact and documentation.
- Updated the npm package identity to `ds-pdf-studio-tool`.
- Kept existing browser storage keys and API response headers compatible so saved stamp/signature templates and existing frontend integration continue to work.
- Bumped the application version to 1.5.1.

## 1.5.0 — npm registry diagnostics and resilient dependency installation

- Added `frontend/scripts/install-deps.mjs`, which checks the configured npm registry with `npm ping` before dependency installation.
- Added an explicit, opt-in fallback registry using `PDF_STUDIO_NPM_REGISTRY_FALLBACK`; the installer never changes package sources silently.
- Added actionable `EAI_AGAIN`, DNS, network, proxy and firewall diagnostics.
- Updated Windows, Linux/macOS, Docker and GitHub Actions build paths to use the same dependency installer.
- Added `npm run check:registry` for a quick registry connectivity test.
- Added offline installation mode that reuses exact-version `node_modules` or the npm cache without contacting a registry.
- Shortened npm retries/timeouts to make unavailable registries fail more promptly.
- Bumped application version to 1.5.0.

## 1.4.0 — Production build verification

- Added a post-build verifier for the actual Vite output.
- The verifier checks the generated HTML, confirms compiled JS/CSS assets exist, rejects Vite development entry references, and hashes generated assets.
- Successful Vite builds now emit `frontend/dist/BUILD-INFO.json` with version, toolchain, build time, byte counts and SHA-256 hashes.
- Added `npm run build:verify`; Windows, Linux/macOS, Docker and GitHub Actions use the same verified build path.
- `start-production.bat` refuses to start a folder that does not contain a verified build manifest.
- Added a Linux/macOS `build-production.sh` script and npm retry settings for transient registry failures.
- The Python API version is now 1.4.0.

## 1.3.0

- Added production Docker configuration, GitHub Actions build workflow and Dependabot dependency update configuration.
- Added the initial production build script and expanded Python API smoke tests.


## v1.6.7 — PDF upload entry point fix

- Added an always-visible **Upload PDF / Open PDF** action in the corporate top bar.
- Renamed the welcome CTA to **Upload PDF to Edit** for clarity.
- Moved the PDF file input to the application root so it remains mounted across welcome/editor state changes.
- Added same-file reselection support, clearer file validation messages, and the Ctrl+O / Cmd+O picker action.
- Added upload button focus treatment and responsive mobile header sizing.
- Kept drag-and-drop support and existing editor actions.
