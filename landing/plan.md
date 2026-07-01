# Landing page — plan & spec

The marketing site for TokenItDown (tokenitdown.com). A **separate Next.js 15 app** in `landing/`, mirroring the app's design system, running on **port 3050** (app 3030, docs 3040, landing 3050). Built with the `/impeccable` brand register. Grounded in `PRODUCT.md` + `DESIGN.md`.

## Non-negotiables

- **All content lives in `content/*.md`.** No copy hardcoded in components. Editors change headlines, features, FAQs, blog posts by editing Markdown. Loader: `lib/content.ts`.
- **Design = the app.** Tailwind v4 tokens copied from `styles/tailwind.css`; AnHourTec Blue `#2563EB`; Geist Sans + Geist Mono. Light + dark first-class.
- **Motion = GSAP ScrollTrigger** (`components/scroll-reveal.tsx`), scroll-driven reveals, honors reduced-motion.
- **Impeccable brand laws:** no gradient text, no hero-metric template, no identical card grids, no side-stripe borders, no em dashes, OKLCH tinted neutrals.
- **SEO-first:** semantic headings, real questions in FAQ, metadata, fast static render.
- **Responsive on all screens** (verify with playwright-mcp at mobile / tablet / desktop widths).

## Sections (each driven by a content/*.md file)

1. **Nav** — `site.md` (logo, links, theme toggle, CTAs: Open app, GitHub).
2. **Hero** — `hero.md` — headline "your agent reads clean Markdown, not raw bytes", terminal snippet, raw→clean token savings, CTAs, spec strip.
3. **Problem / why convert first** — `problem.md` — "Markdown to agents, HTML to humans"; before/after (raw PDF/HTML breaks LLMs vs clean Markdown); the token + accuracy argument.
4. **Formats / supported today** — `formats.md` — PDF, scans, images (OCR), DOCX, PPTX, XLSX, audio, HTML, EPUB, URLs, YouTube.
5. **See it in action** — `showcase.md` — real document types: **Handwritten Form · Financial Tables · Tax Form · Research Paper**, each with a rendered-Markdown sample (structure, tables, formulas, reading order preserved).
6. **Features** — `features.md` — the real product moat: Library (preview/raw), Documents (original/markdown), per-key transparency, repair loop, RAG export, real-data dashboard.
7. **Screenshots** — `screenshots.md` — GitHub-readme-style gallery of the real UI (`public/screenshots/*.png`).
8. **For agents (MCP + CLI + API)** — `agents.md`:
   - Package managers: `npm i -g`, `pnpm add -g`, `yarn global add`, `bun add -g`.
   - Skills: `npx skills add https://github.com/anhourtec/tokenitdown --skill tokenitdown`.
   - MCP install: stdio + hosted HTTP snippets; the 3 tools.
   - API: `curl -X POST .../api/v1/convert -H "Authorization: Bearer …" -F file=@paper.pdf`.
9. **Architecture** — `architecture.md` — web, processing (MarkItDown), MCP server, Postgres, Redis; self-host vs cloud.
10. **Trust** — `trust.md` — **Powered by Microsoft MarkItDown** (Microsoft logo, as open-source attribution); MIT; self-hosted / no egress; open source.
11. **FAQ** — `faq.md` — SEO questions: why can't ChatGPT read PDFs, best format for AI, how to prep for RAG, accuracy, security, agents.
12. **Community / open source** — `community.md` — MIT, star the repo, contribute, agent-compatibility reports, star history.
13. **Blog** — `content/blog/*.md` — teaser list on home + `/blog` + `/blog/[slug]`. Seed: "Markdown to agents, HTML to humans".
14. **Footer** — `footer.md` — use-cases, resources, company, legal, newsletter.

## Requirements checklist (from product owner)

- [ ] Fully responsive on all screens — verify with playwright-mcp (mobile/tablet/desktop).
- [x] Tested end-to-end on real Claude Code (hosted MCP `tokenitdown-hosted` connected + converted).
- [ ] Package-manager install matrix: npm / pnpm / yarn / bun (global).
- [ ] Skills download snippet: `npx skills add … --skill tokenitdown`.
- [ ] API convert support surfaced (curl example) — NOTE: a public `/api/v1/convert` REST route may need building in the app; today conversion is via `/api/convert*` + MCP. Track as app work.
- [ ] Showcase the 4 document types (Handwritten Form, Financial Tables, Tax Form, Research Paper).
- [ ] Microsoft MarkItDown trust badge with logo.
- [ ] **Terminal-callable CLI** — a real `tokenitdown` binary so users can convert straight from the shell (e.g. `tokenitdown convert paper.pdf --output paper.md`, guided setup on first run to store an API key, `npx tokenitdown convert …` with no global install). This is APP/tooling work the landing page's install matrix advertises; it must exist for those snippets to be true. Distributed via npm/pnpm/yarn/bun global install and `npx`.

## Open questions for the product owner

- Production domains for CTAs: app (`app.tokenitdown.com`?), docs, and where the landing itself is hosted. Currently overridable via `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_DOCS_URL` / `NEXT_PUBLIC_GITHUB_URL`.
- Add `landing` as a service in `docker-compose.yml` (port 3050) + reverse-proxy at the apex domain? (Mirrors the docs service.)
- Is a public REST convert API (`/api/v1/convert`) in scope now, or is MCP + dashboard enough for v1? (The API section advertises it.)
- Pricing section: include cloud pricing tiers, or keep the site open-source-first with no pricing for now?

## Status

Foundation built: app scaffold, design tokens, content pipeline, ScrollReveal, layout, Button, Markdown, Nav/Hero content. Remaining: build out sections 3–14 + content, install-verify, responsive pass. See `HANDOFF.md`.
