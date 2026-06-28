# TokenItDown processing service

A thin [FastAPI](https://fastapi.tiangolo.com/) wrapper around
[Microsoft MarkItDown](https://github.com/microsoft/markitdown) (`markitdown[all]`).
It converts uploaded files and URLs into LLM-ready Markdown for the TokenItDown
dashboard.

The full upstream MarkItDown repository is cloned to `server/vendor/markitdown`
for reference only (gitignored) — this service installs `markitdown[all]` from
PyPI, it does not build from the clone.

## Endpoints

| Method | Path           | Auth            | Body                         | Returns                  |
|--------|----------------|-----------------|------------------------------|--------------------------|
| GET    | `/health`      | none            | —                            | `{ "status": "ok" }`     |
| POST   | `/convert`     | `X-Service-Token` | `multipart/form-data` `file` | `{ markdown, title }`    |
| POST   | `/convert-url` | `X-Service-Token` | JSON `{ "url": "…" }`         | `{ markdown, title }`    |

Supported inputs (via `markitdown[all]`): PDF, PowerPoint, Word, Excel, images
(EXIF + OCR), audio (EXIF + transcription), HTML, CSV/JSON/XML, ZIP (iterated),
EPUB, YouTube URLs, and more.

## Security

- **Internal only.** In `docker-compose.yml` this service publishes no host port;
  only the `web` container can reach it over the compose network.
- **Shared secret.** Every `/convert*` call must send `X-Service-Token` matching
  `MARKITDOWN_SERVICE_TOKEN` (constant-time compared).
- **SSRF guard.** `/convert-url` validates the URL and re-validates every redirect
  hop, rejecting non-http(s) schemes and any host resolving to a private,
  loopback, link-local (incl. `169.254.169.254`), multicast or reserved address.
  Uploaded bytes use `convert_stream`, the narrowest MarkItDown API (no filesystem
  or network access). See `app/security.py`.
- **Size limit.** Uploads above `MAX_UPLOAD_BYTES` (default 50 MB) return `413`.

## Environment

| Variable                  | Default            | Purpose                              |
|---------------------------|--------------------|--------------------------------------|
| `MARKITDOWN_SERVICE_TOKEN`| _(required)_       | Shared secret for `/convert*`        |
| `MAX_UPLOAD_BYTES`        | `52428800` (50 MB) | Max upload size                      |

## Local development

```bash
cd server
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export MARKITDOWN_SERVICE_TOKEN=dev-token
uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
cd server
source .venv/bin/activate
python -m pytest
```

## Docker

Built and run as the `markitdown` service via the repo-root `docker-compose.yml`
(`./deploy.sh`). The image installs `ffmpeg` + `exiftool` for audio transcription
and image/audio EXIF extraction.
