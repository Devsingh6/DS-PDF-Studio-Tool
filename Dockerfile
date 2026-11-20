# Build React assets in a separate stage. Only the compiled static bundle is
# copied into the final Python image.
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/ ./
ARG NPM_REGISTRY=
ARG NPM_REGISTRY_FALLBACK=
RUN if [ -n "$NPM_REGISTRY" ]; then \
      NPM_CONFIG_REGISTRY="$NPM_REGISTRY" PDF_STUDIO_NPM_REGISTRY_FALLBACK="$NPM_REGISTRY_FALLBACK" node scripts/install-deps.mjs; \
    else \
      PDF_STUDIO_NPM_REGISTRY_FALLBACK="$NPM_REGISTRY_FALLBACK" node scripts/install-deps.mjs; \
    fi
RUN npm run build:verify

FROM python:3.11-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PDF_MAX_FILE_MB=100 \
    PDF_MAX_PAGES=500

RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng ca-certificates fonts-dejavu-core libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
RUN python backend/verify_frontend.py

RUN useradd --system --uid 10001 --create-home dspdfstudio \
    && mkdir -p /app/fonts \
    && chown -R dspdfstudio:dspdfstudio /app
USER dspdfstudio

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)" || exit 1

CMD ["sh", "-c", "python backend/verify_frontend.py && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
