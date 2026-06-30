# TokenItDown

> Drop in a file or a web page, get agent-ready Markdown out — and let your AI read it directly, for a fraction of the tokens.

**TokenItDown** is a fast, self-hostable platform that turns any document or web page into clean, LLM-ready Markdown — and goes past the conversion to deliver visible quality control, RAG-ready output, token economics, and native agent (MCP) access.

Built and maintained by **AnHourTec**.

## Vision

The conversion engine itself is commoditized. Our value is the workflow around it — the library, the repair loop, the RAG export, the agent integration, and the web-capture extension — packaged cleanly for both cloud users and self-hosters.

Two deployment targets from one codebase:

- **Cloud** — multi-tenant SaaS with managed processing, billing, and a hosted MCP endpoint.
- **Self-hosted** — a single `docker compose up`, all processing local, optional local-LLM mode, no data egress.

## Features

- **Convert anything to Markdown** — powered by [Microsoft MarkItDown](https://github.com/microsoft/markitdown): PDF, Word, PowerPoint, Excel, images (OCR + EXIF), audio (transcription), HTML, CSV/JSON/XML, ZIP (iterated), EPUB, and YouTube / web-page URLs.
- **Per-format convert pages** — a dedicated page per source type (Md PDF, Md Docs, Md PPTX, Md Excel, Md Image, Md Audio, Md HTML, Md Data, Md ZIP, Md EPUB, Md URL), each with drag-and-drop batch upload, a document-scan animation while converting, and a GitHub-style rendered result.
- **Library** — every converted document in a resizable file viewer with a **Preview / Raw** toggle (rendered Markdown via `react-markdown` + GFM, or syntax-highlighted source via Shiki), plus copy, download, and delete.
- **Documents** — every **original** uploaded file, previewed in place: PDFs in the browser's native viewer, images inline, others downloadable — with an **Original / Markdown** toggle and delete. Originals are stored on a local volume; the converted Markdown lives in Postgres.
- **Use it from your AI coding agent (MCP)** — a built-in [Model Context Protocol](https://modelcontextprotocol.io) server (`server/app/mcp_server.py`) lets Claude Code, Cursor, VS Code Copilot, or Claude Desktop call TokenItDown automatically the moment you hand the agent a file or URL. Runs **local (stdio)** for converting your own files in place with no account, or **hosted (HTTP)** for remote agents authenticated with a per-user API key. See the in-dashboard **Connect editor** page.
- **Works with any agent, not just Claude** — the Connect editor page offers per-editor install snippets and downloadable, instance-aware **`AGENTS.md` / `CLAUDE.md` / `skills.md`** drop-in files (viewable full-page, GitHub-style) so Codex, Cursor, Gemini, Windsurf, Cline, Aider, or any MCP host knows to use TokenItDown.
- **Per-user API keys + full transparency** — issue revocable API keys from the dashboard. Conversions an agent makes with a key run through the same pipeline as the dashboard (cleaned, token-counted, saved to your Library) and are attributed to that key, so the **Connect editor** page shows, per key, how many calls it made, tokens saved, and exactly what it converted.
- **Auth** — email/password with httpOnly cookie sessions ([better-auth](https://www.better-auth.com/)) stored in Postgres, CSRF via trusted origins, protected dashboard.
- **Admin dashboard** — shadcn-style sidebar, theme switcher (light/dark/system), and account menu.

## Architecture

- **Web** — Next.js app (dashboard, auth, API routes). Conversions are proxied from `app/api/convert*` to the processing service over an internal network, gated by a shared secret. The convert routes accept either a session (dashboard) or an `Authorization: Bearer tid_…` API key (agents).
- **Processing service** (`server/`) — a Python [FastAPI](https://fastapi.tiangolo.com/) wrapper around `markitdown[all]` with `/convert` (uploads) and `/convert-url` (SSRF-guarded). Internal-only.
- **MCP server** (`server/app/mcp_server.py`) — the `markitdown-mcp` container. In hosted/HTTP mode it authenticates an agent's API key and **proxies conversions back through the web pipeline**, so agent activity is cleaned, tracked, and saved like any other conversion.
- **Postgres** — users, sessions, converted documents (tagged with the API key that created them), and API keys (Drizzle ORM). Keys are stored as SHA-256 hashes; the full token is shown once.
- **Redis** — reserved for the job queue / session store.

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) + [Tailwind Typography](https://github.com/tailwindlabs/tailwindcss-typography)
- Strict [TypeScript](https://www.typescriptlang.org/) with [ts-reset](https://github.com/total-typescript/ts-reset)
- [Radix UI](https://www.radix-ui.com/) + [CVA](https://cva.style/) design system; [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm), [Shiki](https://shiki.style/), [sonner](https://sonner.emilkowal.ski/)
- [better-auth](https://www.better-auth.com/) + [Drizzle ORM](https://orm.drizzle.team/) + PostgreSQL
- Processing: [Python](https://www.python.org/) 3.10+ / [FastAPI](https://fastapi.tiangolo.com/) / [MarkItDown](https://github.com/microsoft/markitdown)
- Testing: [Vitest](https://vitest.dev), [React Testing Library](https://testing-library.com/react), [Playwright](https://playwright.dev/), [pytest](https://docs.pytest.org/)
- [T3 Env](https://env.t3.gg/) for typed environment variables; [OpenTelemetry](https://opentelemetry.io/) + Kubernetes-compatible health checks

## Requirements

- [Node.js](https://nodejs.org/) `>=22` and [npm](https://www.npmjs.com/) (the project's package manager)
- [Docker](https://www.docker.com/) + Docker Compose (for Postgres/Redis and the full-stack deploy)
- [Python](https://www.python.org/) `>=3.10` (only if running the processing service outside Docker)

## Getting started

```bash
# 1. Install deps (a better-auth peer requires legacy-peer-deps)
npm install --legacy-peer-deps

# 2. Configure env
cp .env.example .env   # then fill in secrets (BETTER_AUTH_SECRET, MARKITDOWN_SERVICE_TOKEN, DB creds…)

# 3. Bring up Postgres, Redis and the MarkItDown service
docker compose up -d postgres redis markitdown

# 4. Run the web app (auto-creates the DB + applies migrations)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register, then convert from **Convert** in the sidebar; view results in **Library** and originals in **Documents**.

> Running the processing service without Docker: `cd server && python3.12 -m venv .venv && ./.venv/bin/pip install -r requirements-dev.txt && MARKITDOWN_SERVICE_TOKEN=<token> ./.venv/bin/uvicorn app.main:app --port 8000`

## Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Ensure DB + migrate, then start the dev server |
| `npm run build`         | Create a production build                     |
| `npm run start`         | Start the production server                   |
| `npm run typecheck`     | Type-check with `tsc`                         |
| `npm run lint`          | Run ESLint                                    |
| `npm run test`          | Run unit & integration tests (Vitest)        |
| `npm run e2e:headless`  | Run end-to-end tests (Playwright)            |
| `npm run db:generate`   | Generate a Drizzle migration from the schema |
| `npm run db:migrate`    | Apply migrations                             |
| `npm run db:studio`     | Open Drizzle Studio                          |
| `npm run storybook`     | Start Storybook on port 6006                  |

Processing-service tests: `cd server && ./.venv/bin/python -m pytest`.

## Deployment

The self-hosted edition ships as a `docker compose` bundle — **web + Postgres + Redis + the MarkItDown processing service**. On the host, copy `.env.example` → `.env`, set real secrets (including `MARKITDOWN_SERVICE_TOKEN`), then:

```bash
./deploy.sh
```

This builds the images and brings the stack up; the web container waits for the processing service, ensures the database, and runs migrations on startup. App at `http://<host>:${WEB_PORT:-3030}`.

## License

[MIT](./LICENSE) © AnHourTec
