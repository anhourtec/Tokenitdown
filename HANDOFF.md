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

**Data services (Docker) — Postgres + Redis only, NOT the web app:**
- Per user: web is **not** containerised (run `npm run dev` locally). `docker-compose.yml`
  runs only Postgres + Redis, intended to be deployed on **192.168.69.16**.
- Ports differ from BookYourPTO-SaaS (5432/6385/3010) to coexist on that host:
  **Postgres `5433:5432`, Redis `6386:6379`**. Redis uses `requirepass`.
- `deploy.sh` (run on the server): stop if running → `docker compose pull` →
  `up -d --force-recreate`. Mirrors BookYourPTO's `build.sh` pattern.
- `scripts/ensure-db.mjs` — creates the `tokenitdown` database if missing
  (exports a tested pure `resolveTargetDatabase` helper). npm scripts:
  `db:generate|migrate|push|studio|ensure|setup` (auto-load `.env` via
  `--env-file-if-exists`).
- `.env` (gitignored, now incl. `.env` in `.gitignore`) holds real creds;
  `.env.example` documents everything with easy placeholder passwords.

**Verified:** typecheck ✓, lint ✓, `vitest run` ✓ (7 tests incl. new
`scripts/ensure-db.test.ts`), `docker compose config` ✓, `deploy.sh` syntax ✓.
**Not yet exercised against a live DB** — signup/login needs Postgres up. Once
`deploy.sh` has run on the server, run `npm run db:setup` then `npm run dev`
and confirm signup → /dashboard → sign out.

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
- **Web is intentionally not dockerised** — `docker-compose.yml` is Postgres +
  Redis only, deployed on 192.168.69.16; the app runs via `npm run dev`.
- `lib/db/schema.ts` column names are camelCase to match better-auth defaults;
  `drizzle.config.ts` sets `casing: "camelCase"`. Regenerate via the better-auth
  CLI if plugins change, then `npm run db:generate`.

## Next Steps
1. **Deploy data services:** copy `.env.example` → `.env` on the server (192.168.69.16),
   set real passwords, run `./deploy.sh`. Then locally: `npm run db:setup` (creates DB + migrates),
   `npm run dev`, and verify signup → /dashboard → sign out in the browser (rule #6).
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
7. If the web app is later containerised, re-add a `Dockerfile` (was removed —
   web runs via `npm run dev` for now).

---
*To continue: start a fresh conversation and point the agent at `HANDOFF.md` (this file) and `CLAUDE.md`.*
