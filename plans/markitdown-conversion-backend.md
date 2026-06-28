# Plan: MarkItDown conversion backend + dashboard Convert/Library

## Context

TokenItDown's core promise (PLAN.md §4.1–4.2, Phase 1) is turning any document or
web page into clean, LLM-ready Markdown. Today the dashboard has a **Convert** and
**Library** sidebar item but both point at `#` — there is no conversion engine.

This change stands up the **processing service** from PLAN.md §6: a Python FastAPI
service wrapping `markitdown[all]`, wired to the Next.js dashboard so an
authenticated user can convert every format MarkItDown supports (PDF, Office,
images w/ OCR+EXIF, audio transcription, HTML, CSV/JSON/XML, ZIP, EPUB, YouTube
URLs) and have results saved to a per-user Library.

**Decisions (confirmed with user):**
- Install `markitdown[all]` from PyPI; the cloned `microsoft/markitdown` is kept as
  **reference only** at `server/vendor/markitdown` (gitignored).
- **Synchronous** conversion (HTTP request/response with a timeout). Queue/BullMQ later.
- **Persist** original + converted Markdown per user → shown in a Library.

## Architecture

```
Browser (dashboard, auth-gated)
  → Next.js API route  /api/convert        (getSession, size/type guard, persist)
      → POST http://markitdown:8000/convert (internal compose net, shared-secret header)
          → MarkItDown().convert_stream(...)  → { markdown, title }
      → save original to STORAGE_DIR, markdown+metadata to Postgres `document`
  ← { id, title, markdown }
```
The Python service is **internal-only** (no published port; on `tokenitdown-network`),
guarded by a shared secret so nothing else on the host can call it.

## 1. Python service — `server/`

New files:
- `server/app/main.py` — FastAPI app, CORS off, requires `X-Service-Token` header
  (compared to `MARKITDOWN_SERVICE_TOKEN`).
  - `GET /health` → `{status:"ok"}`.
  - `POST /convert` — `multipart/form-data` file upload. Reads bytes into
    `io.BytesIO`, builds `StreamInfo(filename=…, extension=…, mimetype=…)` from the
    upload, calls `MarkItDown(enable_plugins=False).convert_stream(stream, stream_info=…)`.
    Returns `{markdown, title}`. This is the **narrowest** API (no path/URL access) —
    matches MarkItDown's security guidance. Enforce `MAX_UPLOAD_BYTES`.
  - `POST /convert-url` — JSON `{url}` for HTML pages + YouTube.
    **SSRF guard (required):** allow only `http`/`https`; resolve the host and reject
    any private / loopback / link-local / multicast / reserved IP or the cloud
    metadata address (169.254.169.254). YouTube watch URLs route to MarkItDown's
    YouTube transcript path (`convert_uri`); other URLs are fetched via a guarded
    `requests.get` then `convert_response` (per MarkItDown's "call requests.get
    yourself" guidance).
- `server/app/security.py` — `assert_safe_url(url)` SSRF helper (reused by tests).
- `server/requirements.txt` — `fastapi`, `uvicorn[standard]`, `python-multipart`,
  `markitdown[all]`, `requests`.
- `server/Dockerfile` — `python:3.13-slim`; `apt-get install ffmpeg exiftool`
  (needed for audio transcription + image EXIF, mirrors upstream Dockerfile);
  `pip install -r requirements.txt`; run `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- `server/tests/test_convert.py` + `server/tests/test_security.py` — pytest:
  convert a tiny CSV/HTML fixture → assert Markdown; assert `assert_safe_url`
  rejects `http://169.254.169.254`, `http://localhost`, `http://10.0.0.1`, `file://…`.
- `server/README.md`, `server/.dockerignore`.
- `.gitignore` += `server/vendor/`, `server/.venv/`, `server/__pycache__`.

Clone (reference only): `git clone --depth 1 https://github.com/microsoft/markitdown
server/vendor/markitdown` (gitignored).

## 2. Compose + env wiring

- `docker-compose.yml`: add `markitdown` service (build `./server`, on
  `tokenitdown-network`, **no published ports**, healthcheck on `/health`,
  `MARKITDOWN_SERVICE_TOKEN` from `.env`, `restart: unless-stopped`). `web` gains
  `MARKITDOWN_SERVICE_URL=http://markitdown:8000`, `MARKITDOWN_SERVICE_TOKEN`,
  `depends_on: markitdown`, and an `uploads_data:/data/uploads` volume.
- `env.mjs`: add server vars `MARKITDOWN_SERVICE_URL` (url),
  `MARKITDOWN_SERVICE_TOKEN` (min 16), `STORAGE_DIR` (default `./data/uploads`) +
  add to `runtimeEnv`.
- `.env.example`: document the three new vars (placeholder token).
- For local `npm run dev`: service runs via `docker compose up markitdown` (or a
  documented `uvicorn` invocation); `MARKITDOWN_SERVICE_URL=http://localhost:8000`.

## 3. Persistence (Drizzle)

- `lib/db/schema.ts`: add `document` table — `id` (uuid/text pk), `userId` (fk →
  user, cascade), `title`, `sourceType` ('file'|'url'), `sourceName`, `mimetype`,
  `sizeBytes`, `storagePath` (nullable; original on disk), `markdown` (text),
  `createdAt`. Index on `userId`.
- `npm run db:generate` → new `lib/db/migrations/000X_*.sql` (committed). Dev/Docker
  auto-migrate already runs it (`scripts/dev-start.mjs`, `scripts/docker-deploy.mjs`).
- `lib/documents.ts` — helpers: `saveDocument(...)`, `listDocuments(userId)`,
  `getDocument(id, userId)`, `deleteDocument(id, userId)`; original bytes written
  under `STORAGE_DIR/<userId>/<id>.<ext>`.

## 4. Next.js API routes (auth-gated)

- `app/api/convert/route.ts` — `POST`. `getSession` (401 if none); read `FormData`
  file; guard size (`MAX_UPLOAD_BYTES`) + reject empty; forward as multipart to
  `${MARKITDOWN_SERVICE_URL}/convert` with `X-Service-Token`; persist via
  `saveDocument`; return `{id, title, markdown}`. 502 on service error, 413 too large.
- `app/api/convert/url/route.ts` — `POST {url}`; same auth + persist; forwards to
  `/convert-url`.
- `app/api/documents/route.ts` (GET list) + `app/api/documents/[id]/route.ts`
  (GET one, DELETE) — all scoped to `session.user.id`.

## 5. Dashboard UI (reuse shadcn primitives in `components/ui/`)

- `app/dashboard/convert/page.tsx` (+ `_components/`): drag-and-drop **single +
  batch** file upload, a URL field (YouTube/HTML), per-file status (idle→
  converting→done/error), and a result viewer (`<pre>`/markdown) with **Copy** and
  **Download .md** buttons. Uses `Card`, `Button`, `Input`, `Badge`, `Skeleton`.
- `app/dashboard/library/page.tsx`: `@tanstack/react-table` list of the user's
  documents (title, type, size, date) with view / download / delete (delete uses a
  confirm — avoid native `confirm()` per browser-automation rules; use a small
  dialog or inline confirm).
- `navigation/sidebar/sidebar-items.ts`: point `convert` → `/dashboard/convert`,
  `library` → `/dashboard/library` (remove the `#`).
- Add `components/ui/` primitives only if missing (e.g. `progress`); prefer existing.

## 6. Tests & verification (CLAUDE rules #4, #5, #6)

- **Python:** `cd server && pip install -r requirements.txt && python -m pytest` —
  convert fixture + SSRF guard pass.
- **Node unit:** `npx vitest run` — test the size guard + a pure `assertSafeFile`/
  filename-sanitize helper and `lib/documents` path building (no real DB).
- **Build/lint:** `npm run typecheck && npm run lint && npm run build`.
- **e2e (Playwright, rule #6):** with the service up (`docker compose up -d
  markitdown postgres redis`) and `npm run dev`: register → /dashboard/convert →
  upload a sample PDF/CSV → assert Markdown renders + Download works → /dashboard/
  library shows the doc → delete it. Screenshot to `.playwright-mcp/`.
- **Security review:** run `/security-review` — focus on SSRF (URL path), upload
  size/type limits, path traversal in `storagePath` (sanitize filename, never trust
  client name), the service shared-secret, and that the service is not published.
- Update `HANDOFF.md` before any commit (rule #8). Do **not** commit without
  explicit permission (rule #2).

## Out of scope (future phases, per PLAN.md)
Job queue/BullMQ, AI repair / RAG export / token compressor, side-by-side original
viewer, MCP server, Chrome extension, Azure Doc-Intel / Content-Understanding,
LLM image descriptions. Service is structured so these slot in later.

## Key files
- New: `server/**`, `lib/documents.ts`, `app/api/convert/**`, `app/api/documents/**`,
  `app/dashboard/convert/**`, `app/dashboard/library/**`.
- Modified: `docker-compose.yml`, `env.mjs`, `.env.example`, `.gitignore`,
  `lib/db/schema.ts`, `lib/db/migrations/**`, `navigation/sidebar/sidebar-items.ts`,
  `HANDOFF.md`.
