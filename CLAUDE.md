# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository.

**Project:** TokenItDown — a self-hostable platform that turns any document or web page into clean, LLM-ready Markdown.
**Company:** AnHourTec · **Package manager:** npm (never pnpm/yarn)

---

## Working rules

### 1. Commit messages — no Claude attribution
Do not add `Co-Authored-By: Claude`, "Generated with Claude Code", or any AI attribution to commit messages, PR descriptions, or code comments. Write commit messages as a human author would.

### 2. Do not commit without explicit permission
Never run `git commit` or `git push` unless the user explicitly asks for it in that message. Staging and showing a diff is fine; committing is not, until told.

### 3. Group commits by topic — never one mega-commit
When permission to commit is given, split the work into focused commits, each scoped to a single topic or concern. Do not bundle unrelated changes into one large commit.

### 4. Write a test, then run it — verify before declaring done
For every change with testable behavior, write a test and run it. Do not claim work is complete until the relevant tests pass.

#### Running tests
```bash
npx vitest run          # unit & integration tests
npm run e2e:headless    # end-to-end (Playwright)
```

### 5. Run `/security-review` on everything you write
Before considering a change done, run `/security-review` on the code you produced and address any findings.

### 6. Live check with Playwright for UI changes
For any UI change, verify it in a real browser with Playwright — don't rely on the code looking correct. Confirm the rendered result and interactions actually work.

### 7. Stay narrow, ship complete work
Do exactly what was asked — no scope creep, no unrequested refactors. But finish it completely: no half-done features, no TODOs left where working code belongs.

### 8. Update `HANDOFF.md` before every commit
Before running `git commit`, update `HANDOFF.md` so it reflects the work being committed (progress, what worked, what didn't, next steps). The handoff must never lag behind the commit history. Do this automatically — it should never need to be asked for.

### 9. Test everything with Playwright MCP when a task is done
When a task is complete, verify it end-to-end in a real browser using the **Playwright MCP** tools (`mcp__playwright__*`) — not just the unit/e2e suites. Drive the actual flow the user cares about (log in, navigate, upload, convert, view, delete, etc.), confirm the rendered result and interactions work, and check the console for errors. Do this against the running dev server (`npm run dev`, currently `http://localhost:3000`; use the LAN origin if better-auth's trusted-origin check requires it). Don't declare a task finished until it's been exercised this way.

### 10. Every page gets a loading skeleton shaped like that page
Every route under `app/` must show a loading skeleton, and the skeleton must mirror **that specific page's layout** — never a single generic skeleton reused everywhere. When you add or restructure a page, add/update its skeleton to match its real structure (e.g. a two-pane explorer skeleton for list+viewer pages, a KPI-strip + chart + table skeleton for analytics, stacked cards for settings). Cover both entry points: a route-level `loading.tsx` for server-rendered/navigation loads, and an in-component skeleton for client components while they fetch. Shared, parameterized skeletons (e.g. one `ExplorerSkeleton` with variants) are fine **only** when the pages genuinely share a layout; reuse the *shape*, not a placeholder rectangle. Page-shaped skeletons live in `components/ui/page-skeletons.tsx`.

---

## High-level architecture

### Stack
- **Framework:** Next.js 15 (App Router) + React 19, TypeScript (strict, with `ts-reset`)
- **Styling:** Tailwind CSS v4 (config in `styles/tailwind.css`, PostCSS pipeline)
- **UI primitives:** Radix UI + CVA (`class-variance-authority`) for variant-driven components; `tailwind-merge` for class composition
- **Env:** T3 Env (`env.mjs`) — typed, validated environment variables via Zod
- **Observability:** OpenTelemetry via `@vercel/otel`, registered in `instrumentation.ts`
- **Testing:** Vitest + React Testing Library (unit/integration), Playwright (e2e), Storybook (component dev)
- **Tooling:** ESLint 9 + Prettier, bundle analyzer, semantic-release
- **Auth & data:** better-auth (email/password, cookie sessions) + Drizzle ORM + PostgreSQL
- **Processing service:** Python FastAPI wrapping `markitdown[all]` (in `server/`) — converts uploads/URLs to Markdown
- **Markdown UI:** `react-markdown` + `remark-gfm` + Tailwind Typography (rendered preview), `shiki` (raw/code), `sonner` (toasts)
- **Deployment:** Docker + `docker compose` (web + Postgres + Redis + markitdown processing service); `./deploy.sh` builds and runs the full stack

### Directory layout
- `app/` — App Router routes, layouts, and API route handlers (`app/api/*`)
- `components/` — reusable UI components, co-located with `.test.tsx` and `.stories.tsx`
- `styles/` — Tailwind entry and global CSS
- `lp-items.tsx` — landing-page content data
- `env.mjs` — validated environment schema; import `env` from here, never `process.env` directly
- `instrumentation.ts` — OpenTelemetry registration (runs once at server start)
- `e2e/` — Playwright specs

### Request lifecycle
1. **Server start** — Next.js runs `instrumentation.ts` → `register()` initializes OpenTelemetry tracing.
2. **Env validation** — `env.mjs` validates environment variables at build/boot; invalid env fails fast.
3. **Routing** — `next.config.ts` rewrites health aliases (`/healthz`, `/health`, `/ping`, `/api/healthz`) to `/api/health`. Other requests resolve through the App Router under `app/`.
4. **Render / handle** — Server Components render on the server by default; API route handlers in `app/api/*` return `Response` objects (e.g. `app/api/health/route.ts` → `{ status: "ok" }`).
5. **Response** — HTML/JSON returned to the client; fetches are logged with full URLs (`next.config.ts` → `logging.fetches`).

### Health checks
Kubernetes-compatible endpoint at `/api/health` (aliased to `/healthz`, `/health`, `/ping`) returning `{ status: "ok" }`.

---

## Conventions
- **Package manager is npm.** Use `npm install`, `npm run <script>`, `npx <bin>`. Never introduce pnpm or yarn.
- **Imports** are absolute from the project root (e.g. `import { Button } from "components/Button/Button"`).
- **Environment variables** go through `env.mjs` — add new vars to its schema, never read `process.env` directly in app code.
- **Components** ship with a colocated test and (where it's a UI primitive) a Storybook story.
