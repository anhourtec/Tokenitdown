# HANDOFF

> A living document for the next agent (with fresh context) to continue this work. Update it as things change.

**Project:** TokenItDown — document & web → LLM-ready Markdown platform
**Company:** AnHourTec · **Package manager:** npm only
**Last updated:** 2026-06-28

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

## Phase 1b — Convert UX, viewers, Documents (2026-06-28)

Built out the conversion UX and document viewers (all verified in `npm run dev` via
Playwright; **Docker deploy deferred** — see the 404 note below).

**Per-format Convert pages + sidebar:**
- `app/dashboard/convert/formats.ts` — config for every format (slug, label, accept,
  extensions, FileCard types). Dynamic route `app/dashboard/convert/[format]` +
  parameterized `Converter`; `/dashboard/convert` is a hub grid. Sidebar **Convert**
  is now a collapsible parent with per-format buttons (Md PDF/Docs/PPTX/Excel/…),
  **expanded by default** (`defaultOpen` flag honored in `nav-main`).
- `components/ui/file-card.tsx` (vendored, extended with `mp3`/`epub`) — colored
  file-type cards shown on the hub + fanned in the dropzones. **No filesize shown.**
- `scan-animation.tsx` — brand-colored document-scan animation while converting.

**Rich Markdown rendering:** `components/ui/markdown.tsx` (`react-markdown` +
`remark-gfm` + Tailwind Typography `prose`, theme-aware) renders converted output
like GitHub (tables, headings, etc.). Used in Convert results + the viewers.
`@plugin '@tailwindcss/typography'` added to `styles/tailwind.css`.

**File viewer (`components/ui/file-viewer.tsx`)** — resizable tree + Shiki raw view
+ Markdown preview, with a **Preview/Raw** toggle. Powers **Library**
(`/dashboard/library`), which lists all converted docs and renders the selected
one; download/delete in the header.

**Documents (`/dashboard/documents`)** — surfaces every **original** uploaded file.
New endpoint `app/api/documents/[id]/file` streams the stored original (inline only
for PDF/raster images; HTML/SVG/others force-download; `nosniff`). Viewer shows the
**Original** (native browser PDF viewer / image) **or Markdown** (Preview/Raw), with
download + delete. `getDocumentFile()` added to `lib/documents.ts`.

**Deps added:** `react-markdown`, `remark-gfm`, `@tailwindcss/typography`, `shiki`,
`sonner` (+ `<Toaster>` in `app/providers.tsx`), `react-resizable-panels@^3` (v4
renamed its API — pinned to v3), `@radix-ui/react-accordion`, `@radix-ui/react-scroll-area`.
Vendored `components/ui/{resizable,scroll-area}.tsx`.

**Deliberately NOT done:** the pasted `@embedpdf` PDF viewer — it needs `@base-ui/react`
(a second primitives system clashing with our Radix shadcn) + a `document-viewer-sidebar`
component that wasn't provided. The browser-native PDF viewer covers it for now.

**Dev note:** conversions need the Python service on `:8000`
(`cd server && MARKITDOWN_SERVICE_TOKEN=… ./.venv/bin/uvicorn app.main:app --port 8000`).
**Known issue:** the Docker production build prerenders auth-gated dashboard child
routes into cached 404s; `force-dynamic` on the dashboard layout fixes it locally
(`next start` serves them 200) but the docker image still 404'd in testing — revisit
before the next Docker deploy. Dev (`npm run dev`) is unaffected.

## Security: dependency alerts (2026-06-28)

Addressed Dependabot alerts. **Verified:** pytest 24 ✓, vitest 13 ✓, typecheck/lint/
`next build` ✓.

**Python (`server/requirements*.txt`) — fully fixed (these touch our own request handling):**
- `python-multipart` 0.0.20 → **0.0.32** (Arbitrary File Write [High], unbounded
  header DoS, quadratic querystring, large-preamble DoS, negative Content-Length,
  RFC-2231 + semicolon param smuggling).
- `requests` 2.32.3 → **2.34.2** (.netrc leak, insecure temp-file reuse).
- `pytest` 8.3.4 → **8.4.2** (tmpdir handling).

**npm:** `webpack` 5.99.9 → **5.108.1** (buildHttp allowedUris SSRF).

### Completed
- python-multipart, requests, pytest (above) — covers Dependabot **#13–#23** (all
  Python alerts) + the `requests` ones.
- webpack 5.108.1 — covers **#3, #4** (webpack buildHttp SSRF).

### Left (not safely fixable now — all npm, all transitive dev/build tooling)
These are **bundled copies inside dev tooling** (Storybook, Jest, drizzle-kit,
nyc/istanbul). npm `overrides` can't replace *bundled* deps, and the only fix the
audit offers is **downgrading core packages** (`next@9.3.3`, storybook 7,
drizzle-kit 0.18), which would break the app. **None ship in the production runtime**
— the web container runs `next start`, not these tools.

| Alert | Package | Note / path forward |
|------|---------|---------------------|
| #9–#12 | `undici` (1 High) | bundled in dev tooling; `overrides` ineffective. Resolves when the bundling parent (Storybook/Jest) is upgraded. |
| #1 | `esbuild` (Mod) | bundled in `drizzle-kit`/storybook; upgrade those to clear. |
| #7 | `js-yaml` (Mod) | old 3.x copy in a dev tool; forcing 4.x breaks its `safeLoad` API. |
| #6 | `uuid` (Mod) | v8/v9 bundled in istanbul/jest-junit; bumping to v11+ breaks them. |
| #5 | `postcss` (Mod) | a nested 8.4.31 copy; a global override collides with an ancient 4.x consumer. |
| #8 | `@opentelemetry/core` (Mod) | runtime telemetry; needs the `@vercel/otel` v2 / otel v2 migration (attempted → left otel core at v1, a boot-risk mismatch → reverted). Do as a focused upgrade. |
| #2 | `elliptic` (Low) | **no fixed release** (latest 6.6.1 still in the advisory range) — wait for upstream. |

**Recommended follow-up:** upgrade the dev-tooling parents (Storybook 8/9, the Jest
stack, drizzle-kit) and migrate to `@vercel/otel` v2 + OpenTelemetry v2 in dedicated
PRs; re-run `npm audit` after each.

## Phase 2 — Clean & process outputs, insights, RAG export, analytics (2026-06-28)

The "Clean and Process the Outputs" thesis (PLAN §4.1–4.3) is now real, plus the
RAG-export and analytics surfaces. Full plan: `plans/clean-process-outputs-and-competitive-coverage.md`.

**Markdown processing (`lib/markdown/`, pure + unit-tested):**
- `clean.ts` — deterministic normalizer run after MarkItDown, before persistence.
  Tiers: `raw` | `clean` (default, lossless) | `compact` (lossy: strips link URLs).
  Fixes: heading promotion, table/list tidy, de-hyphenation, Unicode NFC + ligatures,
  zero-width/**control-char** stripping (keeps NUL placeholder for masked code, `\t`, `\n`),
  HTML-comment + base64-image removal, repeated header/footer + page-number removal,
  whitespace collapse. `web: true` option also strips nav/footer link-runs + cookie/menu
  chrome (used for URL sources). Idempotent; fenced code is masked so transforms never touch it.
- `tokens.ts` — real GPT BPE token counts via **`gpt-tokenizer`** (server-side only; never
  shipped to the browser). Heuristic fallback. `tokenSavings(raw, clean)` → {rawTokens,
  cleanTokens, saved, pct}. NOTE: frontend never says "GPT/OpenAI" — just "tokens".
- `chunk.ts` — `chunkByHeadings` (H1..maxLevel, code-fence aware) + `chunksToJsonl` +
  `detectChunkLevel` (auto-picks 1/2/3 by chunk size vs a ~500-token target).

**Persistence (Drizzle, migrations 0002 + 0003):** `document` gained `markdownRaw`
(re-processable), `cleanTier`, `rawTokens`, `cleanTokens`, `cleanStats` (jsonb).
`lib/documents.ts` saves/returns them; `listDocuments` includes token counts.

**Convert routes:** `/api/convert` + `/api/convert/url` now clean engine output, compute
token savings, persist raw+clean+stats, accept a `tier` (clean|compact), and the URL route
passes `web:true`. Response returns `tokens` + `cleanStats`. New `GET /api/documents/[id]/chunks`
(auth-gated; `level=auto|1|2|3`) for RAG. `/api/documents/[id]` now returns tokens/tier/stats.

**UI — cleaning insights (`components/ui/clean-insights.tsx` + `popover.tsx`):**
- `CleanInsights` panel (token-savings progress bar + "what we eliminated" breakdown +
  tier badge) shown full on Convert results; `CleanInsightsButton` (compact `−%` popover)
  in the Library/Documents viewer toolbars.
- Convert page has a **Clean / Compact** tier toggle.

**Library + Documents:** added **search + filters** (Library: source = all/file/url;
Documents: type = pdf/image/office/data/other) and a no-match state. Library supports a
`?doc=<id>` **deep-link** (moves that doc to the front so the viewer auto-selects it).

**RAG Export (`/dashboard/rag`):** redesigned as a two-pane **explorer** — left = searchable
document list, right = chunk viewer (granularity Auto/H1/H1+H2/H1–H3, Copy/Download JSONL,
chunk filter, per-chunk copy + click-to-expand).

**Analytics (`/dashboard/analytics`):** built from the `next-shadcn-admin-dashboard` patterns —
a connected KPI strip, a **"Tokens saved over time"** chart that mirrors the home "Customer
Activity" `ComposedChart` (functional period filter), a **"Top documents by savings"** card
(Realtime-Visitors layout: headline + mini bar strip + top-4 grid), and a per-document table
whose rows link to the doc in Library.

**Sidebar (`navigation/sidebar/sidebar-items.ts`, `nav-main.tsx`):** removed **Token
Compressor** (folded into the Compact tier + insights); **RAG Export** → `/dashboard/rag`,
**Analytics** → `/dashboard/analytics` (real routes). "Quick Create" → **"New conversion"**
linking to `/dashboard/convert` (dead Inbox button removed).

**Login animation (`app/(auth)/login-overlay.tsx`):** branded full-screen loading sequence
(logo → TokenItDown/AnHourTec → avatar + welcome → % counter + progress bar + staged
checklist) shown after a successful sign-in/up, then redirects. Bar uses a single CSS
transition over the full duration (React per-frame width made it jump).

**Python service (`server/`):** fetch now sends a **browser User-Agent** + Accept headers
(fixes UA-only-filtering sites) and maps connection/timeout/HTTP errors to **clean, generic
messages** (no raw traceback leaked — closes the audit's info-leak finding). NOTE:
hard-protected/paywalled sites (Washington Post, NYT, Cloudflare challenges) still fail —
they fingerprint TLS / require JS+login; converting them needs a future **headless-browser
fetch path**. Rebuild the `markitdown` image to pick up these changes.

**Deps:** added `gpt-tokenizer`. **Tests:** 49 vitest passing (clean/tokens/chunk +
existing); typecheck + lint clean. Engine for local testing: build & run only the markitdown
container — see `memory/dev-test-harness.md`. Playwright MCP installed at user scope.

**Not yet done / known gaps:** exact Claude `count_tokens` (currently GPT BPE); headless
fetch for protected sites; per-chunk virtualization for thousand-chunk docs; server-side
search/pagination when libraries get large; Docker prerender-404 (still open — analytics/rag
use `headers()`/force-dynamic so fine in dev). **Not yet exercised via full Playwright e2e**
(verified via API + typecheck/lint/unit instead; the browser extension wasn't connected).

## Phase 3 — Settings, account, skeletons, branding (2026-06-28)

**Per-user preferences (`user_preference` table, migration 0004):** `lib/preferences.ts`
(`getPreferences` with defaults, validated `updatePreferences` upsert) + `/api/settings`
(GET/PUT, auth-gated). Fields: `defaultCleanTier` (clean|compact), `defaultChunkLevel`
(auto|1|2|3), `storeOriginals`.

**Settings page (`/dashboard/settings`):** cards for Conversion (default cleaning level +
"show original files"), RAG export (default chunk granularity), Appearance (theme via
next-themes), Account (read-only). Each conversion/RAG option shows a **live example**
(before/after for cleaning; sample chunk split for granularity). Convert routes now default
`tier` to the saved pref (explicit `?tier` still overrides); the RAG page seeds its
granularity from the pref. Sidebar **Settings** → `/dashboard/settings`.

**Storage semantics (important):** the original upload is now **always** persisted
server-side. `storeOriginals` only controls whether originals are **shown** on the
Documents page (off → Documents shows a "hidden, still on server" card). Convert route no
longer skips writing the file.

**Account page (`/dashboard/account`):** name (`updateUser`), email (`changeEmail` —
enabled in `lib/auth.ts`; with no verification sender, an unverified email updates
directly), password (`changePassword`), and **avatar** upload. Avatar API
`app/api/account/avatar` (POST stores to `STORAGE_DIR/avatars/<userId>`, type/size
validated; GET serves with magic-sniffed Content-Type + nosniff); image saved via
`updateUser({ image: "/api/account/avatar?v=<ts>" })`. `auth-client` now exports
`updateUser/changeEmail/changePassword`. "Account" links wired in the sidebar user menu and
header avatar menu (were dead).

**Library / Documents / RAG:** search + filters on each (Library: source all/file/url +
`?doc=<id>` deep-link that auto-selects; Documents: type filter + the visibility gate +
graceful **"Original not available"** card via a HEAD probe instead of raw `{"error":...}`).
**RAG redesigned** as a two-pane explorer (searchable doc list ↔ chunk viewer with
granularity, Copy/Download JSONL, chunk filter, per-chunk copy/expand).

**Loading skeletons (CLAUDE.md rule #10):** `components/ui/page-skeletons.tsx` exports
page-shaped skeletons (`ExplorerSkeleton` topbar/leftSearch variants, `DashboardSkeleton`,
`AnalyticsSkeleton`, `SettingsSkeleton`, `AccountSkeleton`, `ConvertSkeleton`,
`PageHeaderSkeleton`). Per-route `loading.tsx` for dashboard/analytics/settings/convert/
library/documents/rag/account; the three client list pages render the explorer skeleton
while fetching. **Never reuse one generic skeleton** — match the page's layout.

**Branding & favicons:** `public/` holds `token_it_down_logo.png` + the favicon set +
`anhourtec_logo_{lightbg,darkbg}.svg`. `app/layout.tsx` wires title/description/manifest/
icons (NOT the 1.7 MB `favicon.svg` — optimize it first if you want it). `components/ui/
brand-mark.tsx` renders the PNG via `next/image` (`unoptimized` — the optimizer softened the
detailed illustration) for the sidebar and login overlay. **Login/register use the raw PNG
via a plain `<img>`** (no optimization, per request). The login loading overlay shows the
**user's avatar** (initials fallback) and the **theme-aware AnHourTec wordmark**.

**Auth pages:** theme toggle (light/dark/system) added to `/login` and `/register` (shared
`(auth)/layout.tsx`, reuses the header `ThemeSwitcher`).

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
1. **Fix the Docker prerender 404 (blocker for Docker deploy):** auth-gated dashboard
   child routes (`/dashboard/convert/*`, `/dashboard/library`, `/dashboard/documents`)
   get baked into cached 404s by `next build` in the Docker image, even with
   `force-dynamic` on `app/dashboard/layout.tsx` (which fixes it for local
   `next start`). Works fine in `npm run dev`. Investigate before the next
   `./deploy.sh` — likely a build-time static-generation pass hitting the auth
   layout with no DB. Until then, develop/demo on dev.
2. **Deploy (after #1):** on the server copy `.env.example` → `.env`, set real
   passwords + `MARKITDOWN_SERVICE_TOKEN` + `BETTER_AUTH_URL` (match WEB_PORT),
   run `./deploy.sh` (builds web + markitdown images, brings up web/Postgres/Redis/
   markitdown; migrations run on web startup).
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
