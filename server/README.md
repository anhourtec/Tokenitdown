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

## MCP server — let coding agents use TokenItDown

`app/mcp_server.py` exposes the same conversion engine as an
[MCP](https://modelcontextprotocol.io) server, so a developer's agent
(Claude Code, Cursor, VS Code Copilot, Claude Desktop, …) calls TokenItDown
automatically whenever the user points it at a file or a URL. The conversion
logic is shared with the HTTP API via `app/conversion.py` — one
security-reviewed path.

Two run modes (selected by `TOKENITDOWN_MCP_HTTP`):

| Mode | For | Tools exposed | Auth | Conversion |
|------|-----|---------------|------|------------|
| **stdio** (default) | local editors; the user's own machine | `convert_url_to_markdown`, `convert_file_to_markdown` | none (local subprocess) | in-process |
| **streamable HTTP** | hosted; remote agents | `convert_url_to_markdown`, `convert_document` (base64 upload) | per-user API key (Bearer) and/or optional static admin token | **proxied to the web app's pipeline** |

In HTTP mode the agent authenticates with a **per-user API key** (minted in the
dashboard). The server validates the key against the web app's `/api/mcp/verify`
endpoint (using the shared `MARKITDOWN_SERVICE_TOKEN`) and **proxies each
conversion to the web app's convert pipeline**, forwarding the key — so the agent
gets the same cleaned + token-counted Markdown a dashboard user does, the result
is saved to that user's Library, and the conversion is attributed to the key
(powering the dashboard's per-key transparency view). See `app/mcp_auth.py`.

Security boundary: the local-filesystem tool is registered **only** in stdio
mode. Over HTTP a `path` argument would be an arbitrary server-side file read,
so HTTP callers send the document's bytes as base64 instead. URL conversion is
SSRF-guarded in both modes.

```bash
# Local (stdio) — run by the editor, or smoke-test with the inspector:
python -m app.mcp_server
npx @modelcontextprotocol/inspector python -m app.mcp_server

# Hosted (HTTP) — validates per-user keys via the web app:
TOKENITDOWN_MCP_HTTP=1 TOKENITDOWN_WEB_URL=http://web:3000 \
  MARKITDOWN_SERVICE_TOKEN=<shared secret> python -m app.mcp_server   # serves :8001/mcp/
```

| Variable                  | Default   | Purpose                                                    |
|---------------------------|-----------|------------------------------------------------------------|
| `TOKENITDOWN_MCP_HTTP`    | _(unset)_ | `1` → streamable-HTTP mode; else stdio                     |
| `TOKENITDOWN_WEB_URL`     | _(unset)_ | Web app base URL — required in HTTP mode (key validation + proxy) |
| `MARKITDOWN_SERVICE_TOKEN`| _(unset)_ | Shared secret used to call the web app's internal endpoints |
| `TOKENITDOWN_MCP_TOKEN`   | _(unset)_ | Optional static admin token (escape hatch)                 |
| `TOKENITDOWN_MCP_HOST`    | `0.0.0.0` | HTTP bind host                                             |
| `TOKENITDOWN_MCP_PORT`    | `8001`    | HTTP bind port                                             |

### Adding it to an editor

```bash
# Claude Code — local:
claude mcp add tokenitdown -- python -m app.mcp_server
# Claude Code — hosted (create a key on the dashboard's Connect editor page):
claude mcp add --transport http tokenitdown https://mcp.your-host/mcp \
  --header "Authorization: Bearer YOUR_TOKENITDOWN_API_KEY"
```

The dashboard's **Connect editor** page also offers per-agent install snippets and
downloadable `AGENTS.md` / `CLAUDE.md` / `skills.md` drop-in files so any agent
(Codex, Cursor, Gemini, Windsurf, …) knows to use TokenItDown.

```jsonc
// Cursor ~/.cursor/mcp.json  ·  Claude Desktop claude_desktop_config.json
{ "mcpServers": { "tokenitdown": { "command": "python", "args": ["-m", "app.mcp_server"] } } }

// VS Code .vscode/mcp.json  (note: top-level key is "servers")
{ "servers": { "tokenitdown": { "type": "stdio", "command": "python", "args": ["-m", "app.mcp_server"] } } }
```

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
