# Architecture

How TokenItDown is put together: the services, how a conversion flows through them,
the data model, and how AI agents call in over MCP.

For product scope and the roadmap see [PLAN.md](./PLAN.md); for the visual system
see [DESIGN.md](./DESIGN.md).

---

## Services

TokenItDown is a small set of cooperating services, all brought up by
`docker compose` (`./deploy.sh`):

| Service | Tech | Role | Exposure |
|---------|------|------|----------|
| **web** | Next.js 15 (App Router) + React 19 | Dashboard, auth, and all API routes (`app/api/*`). Owns the database. | Published (`${WEB_PORT:-3030}`) |
| **markitdown** | Python / FastAPI + `markitdown[all]` (`server/`) | Converts uploads and URLs to Markdown. | Internal only |
| **markitdown-mcp** | Same image, MCP entrypoint (`server/app/mcp_server.py`) | MCP server so AI agents can call TokenItDown. | Published (`${MCP_PORT:-8001}`) |
| **postgres** | PostgreSQL 17 | Users, sessions, documents, API keys. | Published (dev) |
| **redis** | Redis 7 | Reserved for the job queue / session store. | Published (dev) |

The web app never converts files itself — it proxies to the **markitdown** service
over the internal compose network, gated by a shared secret
(`MARKITDOWN_SERVICE_TOKEN`). The conversion core itself lives in
`server/app/conversion.py` and is shared by both the FastAPI routes and the MCP
server, so there is a single, security-reviewed conversion path.

```
            ┌─────────── browser ───────────┐         ┌──────── AI agent ────────┐
            │ dashboard (session cookie)    │         │ Claude Code / Codex / …  │
            └──────────────┬────────────────┘         └────────────┬─────────────┘
                           │ /api/convert*                          │ MCP (stdio | HTTP)
                           ▼                                         ▼
                    ┌──────────────┐   X-Service-Token        ┌──────────────────┐
                    │   web (Next) │ ───────────────────────► │  markitdown      │
                    │  app/api/*   │      /convert /convert-url│  (FastAPI)       │
                    └──────┬───────┘                          └──────────────────┘
                           │ Drizzle                                  ▲
                           ▼                                          │ HTTP-mode MCP proxies
                    ┌──────────────┐                                  │ back through /api/convert*
                    │  PostgreSQL  │ ◄────── markitdown-mcp ──────────┘ (forwarding the agent's key)
                    └──────────────┘
```

## Request lifecycle (a dashboard conversion)

1. **Boot** — Next.js runs `instrumentation.ts` → OpenTelemetry. `env.mjs` (T3 Env)
   validates environment variables at build/boot; invalid env fails fast.
2. **Auth** — the user signs in (better-auth, httpOnly cookie session in Postgres).
   `app/dashboard/*` is gated server-side.
3. **Convert** — `POST /api/convert` (upload) or `/api/convert/url`. The route reads
   the file/URL, calls the **markitdown** service via `lib/markitdown-client.ts`,
   then runs the cleaning pass (`lib/markdown/clean.ts`) and token counting
   (`lib/markdown/tokens.ts`, a real GPT BPE tokenizer).
4. **Persist** — `lib/documents.ts` writes the original to disk (`STORAGE_DIR`) and
   inserts a `document` row (raw + cleaned Markdown, token counts, source metadata).
5. **Respond** — the cleaned Markdown + token savings return to the client; the
   document appears in the Library.

## Agent integration (MCP)

The MCP server (`server/app/mcp_server.py`, built on FastMCP) lets any agent call
TokenItDown the moment it's handed a file or URL. It runs in two modes:

- **stdio** (local) — the editor launches it as a subprocess. It converts the
  user's own files **in-process** (no upload, no account). Exposes
  `convert_url_to_markdown` and `convert_file_to_markdown` (local path). The
  file-path tool is registered **only** here.
- **streamable HTTP** (hosted) — remote agents authenticate with a **per-user API
  key**. The server validates the key (`server/app/mcp_auth.py` →
  `/api/mcp/verify`) and **proxies each conversion back through the web app's
  pipeline**, forwarding the key. So agent conversions are cleaned, token-counted,
  saved to the user's Library, and attributed to the key — which powers the
  dashboard's per-key transparency view. Exposes `convert_url_to_markdown` and
  `convert_document` (base64 — no server-side path read).

The **Connect editor** page (`app/dashboard/connect/`) is where users install the
server (per-editor snippets), manage API keys + see per-key usage, and download
instance-aware `AGENTS.md` / `CLAUDE.md` / `skills.md` drop-in files
(`lib/agent-files.ts`) so the integration works with any agent, not just Claude.

### Security boundaries

- **SSRF** — URL conversion validates the target and re-validates every redirect
  hop, rejecting private/loopback/link-local/metadata addresses (`server/app/security.py`).
- **Filesystem** — the local-file MCP tool exists only in stdio mode (the user's own
  machine); HTTP callers send bytes, never server paths.
- **API keys** — stored as SHA-256 hashes; the token is shown once at creation.
  Convert routes accept either a session or a `Bearer tid_…` key.
- **Internal calls** — web↔markitdown and mcp→web use a shared service-token header,
  compared in constant time.

## Data model (Drizzle, `lib/db/schema.ts`)

- `user`, `session`, `account`, `verification` — better-auth core.
- `document` — one conversion: raw + cleaned Markdown, token counts, source type/name,
  stored-original path, and `apiKeyId` (the agent key that created it, or null for
  dashboard conversions).
- `user_preference` — per-user defaults (clean tier, chunk level, store-originals).
- `api_key` — per-user keys: `keyHash` (SHA-256), `lastFour`, timestamps, `revokedAt`.

Migrations live in `lib/db/migrations/` (generated by drizzle-kit) and run on web
container startup (`scripts/docker-deploy.mjs`).

## Directory map

- `app/` — App Router routes, layouts, API handlers (`app/api/*`).
- `components/` — UI components (co-located `.test.tsx` / `.stories.tsx`).
- `lib/` — server logic: `db/`, `markdown/`, `documents.ts`, `api-keys.ts`,
  `agent-files.ts`, `markitdown-client.ts`, `auth.ts`.
- `server/` — the Python processing service + MCP server.
- `env.mjs` — validated environment schema (import `env` from here, never `process.env`).
- `docker-compose.yml` / `deploy.sh` — the self-hosted stack.

## Health checks

Kubernetes-compatible `/api/health` (aliased to `/healthz`, `/health`, `/ping` via
`next.config.ts`) returns `{ status: "ok" }`. The markitdown service has its own
`/health`; the MCP container is checked on its listening socket.
