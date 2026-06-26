# HANDOFF

> A living document for the next agent (with fresh context) to continue this work. Update it as things change.

**Project:** TokenItDown — document & web → LLM-ready Markdown platform
**Company:** AnHourTec · **Package manager:** npm only
**Last updated:** 2026-06-25

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
- **Added `CLAUDE.md`** (7 working rules + high-level architecture), `DESIGN.md` (visual system — colors + typography only), `PLAN.md` (full product plan), `.env.example`, and this `HANDOFF.md`.
- **Fixed `npm install` ERESOLVE conflict:** removed the 5 stale `@opentelemetry/*` pins from `package.json` (unused in source; only `@vercel/otel` is imported, and its peer range `resources >=1.19.0` clashed with the pinned `1.18.1`). `npm install` now succeeds; `@vercel/otel` resolves its own peers.

`npm install` completed successfully (1713 packages). Note: `npm audit` reports 43 vulnerabilities (mostly moderate, transitive) — not yet addressed.

## What Worked
- Grep-based scrubbing (`grep -rIn -i "blazity\|next-enterprise\|pnpm"`) to confirm no stray references remain — repeat this after future edits.
- Converting `pnpm.overrides` → top-level npm `overrides` (npm uses a different key).
- Workflows: replace `pnpm/action-setup` with `actions/setup-node` `cache: npm` + `npm ci`, and `pnpm dlx` → `npx`.

## What Didn't Work / Gotchas
- This is the **Next.js** Enterprise Boilerplate, not Nuxt (the user's prompt said Nuxt). The product plan also references Nuxt/Vue — **the actual current codebase is Next.js/React.** Confirm intended framework before large UI work.
- `lp-items.tsx` still contains the generic boilerplate tech-stack feature grid (no Blazity branding). Left intact; replace with real TokenItDown product features when the landing page is built.
- `all-contributors-cli` devDep remains in `package.json` though `.all-contributorsrc` was deleted — harmless, remove if desired.
- Docker is referenced in README/CLAUDE.md but **not yet scaffolded** (no `Dockerfile` / `docker-compose.yml`).

## Next Steps
1. Run `npm install` + `npm run dev`; fix anything that breaks on first boot.
2. Scaffold the Docker stack (Phase 0): `Dockerfile` + `docker-compose.yml` for web + api + worker + Postgres + Redis + processing service.
3. Decide the real framework direction (Next.js as-is vs. the plan's Nuxt) before building product UI.
4. Begin Phase 0 foundation: auth (cookie sessions + 2FA + CSRF), DB schema (Postgres + Prisma), Redis/BullMQ job queue.
5. Replace `lp-items.tsx` / landing page with TokenItDown product messaging.
6. Confirm final product name (TokenItDown vs Markpipe vs Readymark) — see the product plan's open decisions.

---
*To continue: start a fresh conversation and point the agent at `HANDOFF.md` (this file) and `CLAUDE.md`.*
