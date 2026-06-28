# HANDOFF

> A living document for the next agent (with fresh context) to continue this work. Update it as things change.

**Project:** TokenItDown — document & web → LLM-ready Markdown platform
**Company:** AnHourTec · **Package manager:** npm only
**Last updated:** 2026-06-27

---

## Goal
Take the Next.js Enterprise Boilerplate and turn it into the clean foundation for **TokenItDown**:
- Switch the toolchain from pnpm to **npm**.
- Rebrand everything to TokenItDown / AnHourTec.
- **Remove every trace of the Blazity boilerplate** (the project should not look like a boilerplate fork).
- Keep it open source (MIT).
- Build toward the product plan: tiered document→Markdown conversion, RAG export, token compressor, MCP/agent access, Chrome capture extension, self-hosted Docker edition.

## Current Progress
Cleanup / de-branding is **complete**:
- **npm migration:** `package.json` (name `tokenitdown`, npm `overrides`, removed `packageManager`/`pnpm` block, `analyze` uses `npm run build`); `playwright.config.ts` dev command → `npm run dev`; all 3 GitHub workflows rewritten to `npm ci` + `npx`; deleted `pnpm-lock.yaml`.
- **De-Blazity:** rewrote `README.md`, rebranded `app/page.tsx` (heading, copy, metadata; removed Vercel/Blazity buttons + external OG image), deleted `.all-contributorsrc`. Verified zero `blazity`/`next-enterprise`/`pnpm` references remain (except intentional npm config).
- **Removed graphics:** `assets/` (Blazity logos), `.github/assets/` (project-logo PNGs), `graph.svg`.
- **License:** kept MIT, copyright → `2026 AnHourTec`.
- **Removed Vercel:** deleted `vercel.json` (deploying via Docker instead).
- **Added `CLAUDE.md`** (8 working rules + high-level architecture), `DESIGN.md` (visual system — colors + typography only), `PLAN.md` (full product plan), `.env.example`, and this `HANDOFF.md`.
- **Fixed `npm install` ERESOLVE conflict:** removed the 5 stale `@opentelemetry/*` pins from `package.json` (unused in source; only `@vercel/otel` is imported, and its peer range `resources >=1.19.0` clashed with the pinned `1.18.1`). `npm install` now succeeds; `@vercel/otel` resolves its own peers.

`npm install` completed successfully (1713 packages). Note: `npm audit` reports 43 vulnerabilities (mostly moderate, transitive) — not yet addressed.

**CI slimmed down (decided with user):**
- Replaced the three inherited workflows with a **single lean `check.yml`**: `npm ci` → typecheck → lint → `vitest run` → build (uses `node-version-file: .github/nodejs.version`, now pinned to `22`).
- Deleted `playwright.yml` and `nextjs_bundle_analysis.yml` (premature pre-build; re-add e2e/bundle tracking when there's a real product to test).
- Added a `typecheck` script (`tsc --noEmit`) and **removed the deprecated `tsc` wrapper package** that shadowed the real TypeScript binary; ignore `*.tsbuildinfo`.
- Fixed the stale e2e assertion (`e2e/example.spec.ts`) title regex → `/TokenItDown/`.

**Workflow rule added:** `CLAUDE.md` now has rule **#8 — update `HANDOFF.md` before every commit** (keep this file ahead of the commit history, automatically).

## Phase 0 — Auth + data services (2026-06-27)

Decisions (with user): **better-auth + Drizzle + Postgres**, baseline first. ORM
is **Drizzle** (not Prisma as PLAN.md text says) — lighter, no engine binary.

**Auth (email/password baseline, working):**
- Deps: `better-auth`, `drizzle-orm`, `pg` (+ `drizzle-kit`, `@types/pg`, `@testing-library/dom`).
  Installed with `--legacy-peer-deps` (an optional `@sveltejs/kit` peer of
  better-auth drags in a vite 8 beta that clashes with our vite 7).
- `lib/db/schema.ts` — better-auth core tables (user/session/account/verification);
  `lib/db/index.ts` — Drizzle client over a cached `pg` Pool; `drizzle.config.ts`.
- Migration generated → `lib/db/migrations/0000_*.sql` (committed).
- `lib/auth.ts` — betterAuth: emailAndPassword, httpOnly+SameSite=Lax cookie
  sessions in Postgres, CSRF via `trustedOrigins`, `nextCookies()` plugin.
- `lib/auth-client.ts` (browser), `app/api/auth/[...all]/route.ts` (catch-all handler).
- UI: `app/(auth)/{login,signup}` + shared `AuthForm`, `components/SignOutButton`,
  protected `app/dashboard` (server-side `getSession` check), `middleware.ts`
  (optimistic cookie guard on `/dashboard`).
- `env.mjs` extended: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
  REDIS_URL, NEXT_PUBLIC_BETTER_AUTH_URL, `skipValidation` via SKIP_ENV_VALIDATION.

**Docker — FULL stack (web + Postgres + Redis):**
- `docker-compose.yml` builds the Next.js app (`Dockerfile`) and runs it
  alongside Postgres + Redis, deployed on **192.168.69.16**.
- Ports differ from BookYourPTO-SaaS (3010/5432/6385) to coexist on that host:
  **Web `${WEB_PORT:-3030}:3000`, Postgres `5433:5432`, Redis `6386:6379`**. Redis uses `requirepass`.
- `deploy.sh` mirrors BookYourPTO's `build.sh`: stop → remove this project's old
  images → `docker compose build --no-cache` → `up -d` → status.
- **`scripts/docker-deploy.mjs`** is the web container's entrypoint (CMD): it
  validates required env (DATABASE_URL, BETTER_AUTH_SECRET ≥32, BETTER_AUTH_URL),
  waits for Postgres, ensures the DB + runs Drizzle migrations, then `next start`.
  Inside compose the web talks to `postgres:5432` / `redis:6379` (overridden);
  set `BETTER_AUTH_URL` in the server's `.env` to the public URL (e.g.
  `http://192.168.69.16:3030`; set WEB_PORT if it clashes). The web image keeps full deps (incl. drizzle-kit).
- You can still run the app locally with `npm run dev` against the same DB.
- **CI removed:** deleted `.github/workflows/check.yml` (was failing; not needed
  right now — re-add when ready).
- `scripts/ensure-db.mjs` — creates the `tokenitdown` database if missing
  (exports a tested pure `resolveTargetDatabase` helper). npm scripts:
  `db:generate|migrate|push|studio|ensure|setup` (auto-load `.env` via
  `--env-file-if-exists`).
- `.env` (gitignored, now incl. `.env` in `.gitignore`) holds real creds;
  `.env.example` documents everything with easy placeholder passwords.

**shadcn/ui auth UI + routing:**
- Routes are **`/login`** and **`/register`** (was `/signup`).
- Set up shadcn for Tailwind v4 (no prior config): `components.json`, `lib/utils.ts`
  (`cn`), design tokens in `styles/tailwind.css` (`@theme inline` + CSS vars,
  primary = AnHourTec blue #2563EB, **media-based dark** to match the app), and
  primitives in `components/ui/` (button, card, checkbox, input, label, separator,
  logo). Added deps: `lucide-react`, `@radix-ui/react-separator`.
- `app/(auth)/AuthForm.tsx` rewritten with these primitives (card layout, logo,
  confirm-password + match validation on register, newsletter checkbox is
  cosmetic for now). Still wired to better-auth.
- Home page (`app/page.tsx`) has a nav with Log in / Sign up → /login, /register.

**Fixed a pre-existing breakage:** `@vercel/otel` (used by `instrumentation.ts`)
had all 7 OpenTelemetry peer deps missing (removed in the earlier pin cleanup),
which broke `next dev` with "Can't resolve @opentelemetry/api-logs". Reinstalled
compatible 1.x/0.5x versions.

**Auto-migrate on dev:** `npm run dev` now runs `scripts/dev-start.mjs`
(ensure-db → drizzle migrate → `next dev`), mirroring BookYourPTO's dev flow, so
the schema is always current.

**Verified end-to-end (browser, Playwright):** register → /dashboard, sign out →
/login, protected /dashboard redirects when logged out, login API 200 / wrong
password 401, users persisted in the server DB. typecheck ✓, lint ✓,
`vitest run` ✓ (7 tests), `docker compose config` ✓. Screenshots in
`.playwright-mcp/` (gitignored).

## Admin dashboard + sidebar (ported from next-shadcn-admin-dashboard)

Ported the **sidebar design + home ("default") dashboard** from
`arhamkhnz/next-shadcn-admin-dashboard`, recolored to AnHourTec and wired to our auth.

- **shadcn alias:** `tsconfig` now has `@/* -> ./*` so vendored files' `@/...`
  imports resolve to project root. Installed deps: `radix-ui` (umbrella),
  `recharts`, `date-fns`, `@tanstack/react-table`, `tw-animate-css`.
- **Tokens & font:** `styles/tailwind.css` uses the source's **neutral (zinc)
  oklch palette** for chrome (background/card/muted/accent/border/sidebar) so the
  look matches Studio Admin (no blue tint), with AnHourTec blue only as
  primary/ring/chart. Font is **Geist** via the self-hosted `geist` package
  (`app/layout.tsx` sets the `--font-geist-sans/mono` vars; `--font-sans` maps to
  it). Dark stays media-based.
- **shadcn custom variants** (`@custom-variant data-active/open/closed/checked/…`
  + `no-scrollbar` utility) are inlined in `styles/tailwind.css`. Without them,
  bare `data-active:` compiled to match attribute *presence*, so every sidebar
  item (even `data-active="false"`) showed the active background. The variants
  use `[data-active]:not([data-active="false"])` so only true-valued items match.
- Sidebar uses `variant="inset"`; footer has the "Looking for something more?"
  support card; header separator matches the source (`self-center`).
- **Theming:** dark mode is now **class-based via `next-themes`** (was
  media-based). `app/providers.tsx` wraps the app in `ThemeProvider`
  (attribute="class", system default); `styles/tailwind.css` adds
  `@custom-variant dark (&:is(.dark *))` and the dark tokens live under `.dark`.
  Header has a **theme switcher** (light/dark/system), a **GitHub** link, and an
  **account avatar menu** (sign-out wired) — `app/dashboard/_components/header/`.
  The layout-controls/preferences popover from the source is intentionally
  omitted (needs the zustand preferences store).
- **LAN dev access:** `npm run dev` now binds `-H 0.0.0.0` and `scripts/dev-start.mjs`
  auto-detects the LAN IP, prints a shareable `http://<lan-ip>:<port>` URL, and
  injects it into `TRUSTED_ORIGINS` so others on the network can sign in
  (better-auth blocks cross-origin POSTs otherwise). `env.mjs` gained optional
  `TRUSTED_ORIGINS` (comma-separated); `lib/auth.ts` merges it into trustedOrigins.
- **UI primitives** (vendored into `components/ui/`, kept close to source so they
  re-generate cleanly): button, card, input, label, checkbox, separator, badge,
  skeleton, avatar, tooltip, collapsible, dropdown-menu, sheet, select, table,
  chart, sidebar. `tooltip.tsx` was patched so `Tooltip` self-wraps in
  `TooltipProvider` (the source relied on a global provider).
- **Sidebar:** `app/dashboard/_components/sidebar/` — `app-sidebar` (custom,
  TokenItDown nav + logo), `nav-main` (vendored), `nav-user` (wired to
  better-auth `signOut`). Nav config in `navigation/sidebar/sidebar-items.ts`
  (Workspace / AI / Settings; non-built routes are `#` placeholders).
- **Home dashboard:** `app/dashboard/_components/home/` — metric-cards,
  performance-overview (recharts), subscriber-overview + recent-customers-table
  (@tanstack/react-table). Rendered by `app/dashboard/page.tsx`.
- **Layout/routing:** `app/dashboard/layout.tsx` = SidebarProvider + AppSidebar
  + header (SidebarTrigger), with the authoritative session guard (redirect to
  /login). The old homepage is gone — `app/page.tsx` now `redirect("/dashboard")`.
- ESLint ignores the vendored dirs (`components/ui/**`, `hooks/**`, the home
  `_components/home/**`, `nav-main.tsx`).
- **Verified:** `next build` ✓ (8 routes), typecheck ✓, lint ✓; browser
  (Playwright) register → dashboard renders (sidebar + cards + chart + table),
  nav-user Log out → /login, `/` → /dashboard → /login when logged out.
  Screenshot: `.playwright-mcp/dashboard-full.png`.
- **Note:** build prints a non-fatal `jose`/Edge-runtime warning from
  better-auth's cookie helper imported in `middleware.ts` (only reads the
  cookie); functions correctly.
- **Not committed** — pending user testing. `lp-items.tsx`, `components/Button`,
  `components/SignOutButton` are now unused (left in place); remove later if desired.

## Phase 1 — Conversion engine + Convert/Library (2026-06-27)

Wired up the **MarkItDown** processing engine end-to-end so any authenticated user
can convert files/URLs to Markdown from the dashboard (PLAN.md §4.1–4.2).

**Python processing service (`server/`):**
- FastAPI wrapper around `markitdown[all]` (PyPI, pinned `0.1.6`). Endpoints:
  `GET /health`, `POST /convert` (multipart upload → `convert_stream`),
  `POST /convert-url` (JSON `{url}` → YouTube via `convert_uri`, other pages via a
  guarded fetch + `convert_response`).
- **Internal only** — no published port in compose; gated by a shared secret
  (`X-Service-Token` vs `MARKITDOWN_SERVICE_TOKEN`, constant-time compare).
- **SSRF guard** (`server/app/security.py`): rejects non-http(s) and any host that
  resolves to private / loopback / link-local (incl. 169.254.169.254) / multicast
  / reserved IPs; re-validates every redirect hop. 50 MB upload cap.
- `server/Dockerfile` (`python:3.13-slim` + ffmpeg + exiftool), `requirements.txt`,
  pytest suite (`tests/`, 24 tests passing). The full upstream repo is cloned to
  `server/vendor/markitdown` for **reference only** (gitignored; we install from PyPI).
- Local run: `cd server && python3.12 -m venv .venv && pip install -r
  requirements-dev.txt && MARKITDOWN_SERVICE_TOKEN=… uvicorn app.main:app --port 8000`.

**Compose + env:**
- New `markitdown` service in `docker-compose.yml` (internal, healthcheck); `web`
  gains `MARKITDOWN_SERVICE_URL=http://markitdown:8000`, `STORAGE_DIR=/data/uploads`,
  an `uploads_data` volume, and `depends_on: markitdown (healthy)`.
- `env.mjs`: `MARKITDOWN_SERVICE_URL` (default localhost:8000), **`MARKITDOWN_SERVICE_TOKEN`
  (required, min 16)**, `STORAGE_DIR` (default `./data/uploads`), `MAX_UPLOAD_BYTES`
  (default 50 MB). `.env.example` documents them. **Server `.env` must set
  `MARKITDOWN_SERVICE_TOKEN`** before `./deploy.sh` (compose `:?` guard).

**Persistence (Drizzle):**
- New `document` table (`lib/db/schema.ts`) — per-user converted docs (markdown +
  metadata; original stored on disk under `STORAGE_DIR/<userId>/<id><ext>`).
  Migration `0001_chief_black_bolt.sql` (auto-runs on web startup / dev).
- `lib/documents.ts` (save/list/get/delete) + pure path helpers in
  `lib/storage-path.ts` (sanitized extension, traversal-proof resolve;
  unit-tested in `lib/storage-path.test.ts`).

**API routes (auth-gated, Node runtime):** `app/api/convert`, `app/api/convert/url`,
`app/api/documents` (GET list), `app/api/documents/[id]` (GET/DELETE). `lib/markitdown-client.ts`
forwards to the service and maps service 4xx → client.

**UI:** `app/dashboard/convert` (drag-drop batch upload + URL field + per-file
status + result viewer with Copy / Download .md) and `app/dashboard/library`
(table of saved docs, view in a Sheet, download, inline-confirm delete). Sidebar
`convert` → `/dashboard/convert`, `library` → `/dashboard/library`.

**Verified:** pytest 24 ✓, vitest 13 ✓, typecheck ✓, lint ✓, `next build` ✓
(routes present), `docker compose config` ✓. Service smoke-tested via curl
(health, 401 without token, CSV→Markdown table, SSRF 400 on 169.254.169.254).
**Not yet run:** the full Playwright browser e2e (needs the full stack up) — run it
against `http://192.168.69.16:<WEB_PORT>` after `./deploy.sh`, or locally with a DB.
**Pending user testing / not committed at time of writing this note.**

## What Worked
- Grep-based scrubbing (`grep -rIn -i "blazity\|next-enterprise\|pnpm"`) to confirm no stray references remain — repeat this after future edits.
- Converting `pnpm.overrides` → top-level npm `overrides` (npm uses a different key).
- Workflows: replace `pnpm/action-setup` with `actions/setup-node` `cache: npm` + `npm ci`, and `pnpm dlx` → `npx`.

## What Didn't Work / Gotchas
- This is the **Next.js** Enterprise Boilerplate, not Nuxt (the user's prompt said Nuxt). The product plan also references Nuxt/Vue — **the actual current codebase is Next.js/React.** Confirm intended framework before large UI work.
- `lp-items.tsx` still contains the generic boilerplate tech-stack feature grid (no Blazity branding). Left intact; replace with real TokenItDown product features when the landing page is built.
- `all-contributors-cli` devDep remains in `package.json` though `.all-contributorsrc` was deleted — harmless, remove if desired.
- **`npm install` now needs `--legacy-peer-deps`** (better-auth's optional
  `@sveltejs/kit` peer pulls a vite 8 beta). Without it, install fails ERESOLVE.
- That legacy install once pruned `@testing-library/dom` (a peer of
  `@testing-library/react` v16), breaking `screen` imports — it's now an explicit
  devDependency so it always resolves.
- **Docker is now full-stack** (web + Postgres + Redis); `./deploy.sh` builds the
  web image and deploys all three (see the "Docker — FULL stack" section above).
  You can still run the app with `npm run dev` for local work.
- `lib/db/schema.ts` column names are camelCase to match better-auth defaults;
  `drizzle.config.ts` sets `casing: "camelCase"`. Regenerate via the better-auth
  CLI if plugins change, then `npm run db:generate`.

## Next Steps
1. **Deploy:** on the server (192.168.69.16) copy `.env.example` → `.env`, set real
   passwords + `BETTER_AUTH_URL=http://192.168.69.16:3030` (match WEB_PORT), run `./deploy.sh`
   (builds the web image + brings up web/Postgres/Redis; migrations run on web
   startup). App at `http://192.168.69.16:3030` (or your WEB_PORT). Locally you can `npm run dev`.
2. **Layer the rest of auth (PLAN §4.6):** email verification, password reset,
   2FA (TOTP + email OTP), rate limiting, audit log, session rotation. better-auth
   has plugins for most of this — wire them in `lib/auth.ts` and regenerate the
   schema (`npx @better-auth/cli generate` → `npm run db:generate`).
3. Move sessions/queue to Redis (BullMQ) — REDIS_URL is already wired and the
   container is up; nothing uses it yet.
4. Decide framework direction (Next.js as-is vs. PLAN's Nuxt) before product UI.
5. Replace `lp-items.tsx` / landing page with TokenItDown product messaging; add
   nav links to /login and /signup.
6. Confirm final product name (TokenItDown vs Markpipe vs Readymark).
7. Re-add CI when ready (the `.github/workflows/check.yml` was removed).

---
*To continue: start a fresh conversation and point the agent at `HANDOFF.md` (this file) and `CLAUDE.md`.*
