# Product Plan — Document & Web → Markdown Platform for LLMs/Agents

**Company:** AnHourTec
**Working names:** `TokenItDown` (token/agent theme) · `Markpipe` (clean/descriptive) — *final name TBD; Readymark held as backup*
**Status:** Planning / pre-build
**Last updated:** 2026-06-24

> **Note:** The current repository is scaffolded on **Next.js 15 / React 19**. This plan proposes Nuxt 3 / Vue 3 for the dashboard — confirm the final framework direction before building product UI. See `HANDOFF.md`.

---

## 1. Vision

A fast, self-hostable platform that turns any document or web page into clean, LLM-ready Markdown — and goes past the conversion to deliver the things every existing tool stops short of: visible quality control, RAG-ready output, token economics, and native agent access.

The conversion engine itself is commoditized (MarkItDown, Docling, Marker all exist and are self-hostable). **Our moat is the workflow around the conversion** — the library, the repair loop, the RAG export, the agent integration, and the web-capture extension — packaged cleanly for both cloud users and self-hosters.

**One-line positioning:** "Drop in a file or a web page, get agent-ready Markdown out — and let your AI read it directly, for a fraction of the tokens."

### Target users
- AI/agent builders who feed documents into RAG pipelines and context windows.
- Self-hosters / homelab + privacy-conscious teams who want their docs to never leave their machine.
- Knowledge workers who want a clean "library of everything, as Markdown."

---

## 2. Naming (decision pending)

| Name | Theme | Pros | Cons |
|------|-------|------|------|
| **TokenItDown** | Token/agent | Direct MarkItDown homage; sells the token thesis in one word; exact name is free | "token" sits in a crypto-coded namespace; needs camelCase to parse |
| **Markpipe** | Clean/descriptive | Reads as a conversion pipeline; no crypto/gaming baggage; ages well | Less evocative of the AI angle |
| **Readymark** *(backup)* | RAG-ready | Ties to the killer feature (RAG-ready markdown) | Slightly generic |

**Decision criteria to settle later:** crypto-association tolerance, .com + trademark availability, how hard we want the name itself to do the AI marketing.
Both primary names sit under the AnHourTec brand and inherit its visual system.

---

## 3. Architecture (high level)

Two deployment targets from one codebase:

- **Cloud** — `app.<domain>` multi-tenant SaaS, managed processing, Stripe billing, hosted MCP endpoint.
- **Self-hosted** — single `docker compose up`, all processing local, optional local-LLM mode (Ollama), no data egress.

### Core components
1. **Web dashboard** (Nuxt 3 / Vue 3) — upload, convert, view, edit, organize, export.
2. **Processing engine** — tiered converter service (queue-based, async).
3. **Library / storage** — original files + converted Markdown + context bundles, versioned.
4. **Auth & session service** — cookie-based, 2FA, CSRF-protected.
5. **MCP server + REST API** — agent and programmatic access.
6. **Chrome extension** — capture pages → Markdown + context bundle into the platform.
7. **Job queue + workers** — BullMQ/Redis for conversion, embedding, repair jobs.

---

## 4. Feature Set

### 4.1 Conversion Engine (tiered, "faster processing")

A routed pipeline rather than a single converter, so most documents take the fast path and only the hard ones pay for the heavy engines.

- **Fast path** — PyMuPDF4LLM / MarkItDown for native digital PDFs and Office files (no GPU, sub-second).
- **Structure path** — Docling for table-heavy, multi-column, and academic layouts (CPU-capable, best table fidelity).
- **High-fidelity path** — Marker for math/equations and messy scans (GPU-accelerated; note Marker's >$2M-revenue commercial license).
- **Auto-routing** — heuristics (tables detected? headings/body ratio? scanned?) decide the path; user can override and force an engine.
- **Supported inputs** — PDF, DOCX, PPTX, XLSX, images (OCR), HTML, CSV/JSON/XML, EPUB, audio (transcription), ZIP (iterate contents), YouTube URLs.
- **Outputs** — Markdown (default), JSON, HTML, chunked.

### 4.2 Dashboard — all MarkItDown features, made user-friendly

Everything MarkItDown does on the CLI, exposed as a clean UI:

- Drag-and-drop single + **batch** upload.
- Live conversion progress with per-file status.
- **Side-by-side viewer** — original (rendered) next to the Markdown output.
- Built-in **Markdown editor** with live preview (GFM, Mermaid, LaTeX, code highlighting).
- One-click **download / copy / export** (`.md`, `.json`, `.html`, zipped bundle).
- Format-specific options surfaced as toggles (OCR on/off, force engine, page range, image handling).
- Conversion history per file with re-run.

### 4.3 AI / Differentiator Features (the traction drivers)

These are the parts competitors haven't packaged well — the launch should lead with the first three.

1. **Visual confidence + one-click AI repair** *(hero)*
   - Render the original page beside the Markdown; AI flags low-confidence regions (broken tables, dropped columns, garbled OCR) with a heat overlay.
   - Click a flagged region → re-run only that span through a stronger engine. The tiered pipeline made visible and interactive.

2. **PDF → RAG-ready in one click** *(hero)*
   - Auto-chunk by heading, show token counts per chunk, generate embeddings.
   - Export straight to JSONL / LangChain / LlamaIndex document format / vector DB.
   - The actual job-to-be-done: "get this into my pipeline," done in one step.

3. **Token-budget / context compressor** *(thesis feature)*
   - Show the token cost of the output.
   - AI "prune" strips boilerplate (repeated headers/footers, legal disclaimers, nav cruft) and reports tokens saved (e.g. "−38%").
   - A token-aware converter — ties the whole product to the "agents use fewer tokens" narrative.

4. **AI table rebuilder** — reconstruct a mangled table into an editable live grid that writes back to Markdown. Tables are the universal failure point; this is the "finally" moment.

5. **Schema extraction UI** — point at invoices/datasheets/POs, define fields (or let AI infer them), batch-extract to structured JSON + Markdown front matter. (Vertical wedge — fits IoT datasheets.)

6. **Inline figure/diagram descriptions** — auto-generate alt text and chart/diagram descriptions inline so the Markdown is complete for an LLM, not just `![image]` placeholders. Editable.

7. **Multi-doc library + chat across the corpus** — not chat-with-one-PDF, but ingest a corpus and chat/search across all of it with citations back to source page. Self-hosted NotebookLM, conversion-native.

8. **Summaries & mind maps** — table-stakes (competitors have them); include as supporting, not headline.

### 4.4 Chrome Extension — web → platform capture

More than "page to Markdown." Each capture produces an agent-consumable **context bundle**:

- `page.md` — the page content as clean Markdown.
- `a11y-tree.yml` — Playwright-MCP-style accessibility-tree snapshot (deterministic, token-cheap, ref-addressable — like the `[ref=e1]` snapshots agents consume instead of pixels).
- `screenshot.png` — full-page screenshot.
- `network.log` *(optional)* — request log for replayability.

Bundles land directly in the user's library, pushed to the platform via authenticated API. This turns "save page as Markdown" into "save page as a replayable, agent-ready artifact" — a wedge nobody in the PDF→MD crowd is filling, and a natural bridge to dashboard/IoT screen capture.

### 4.5 Agent Integration — "any chatbot reads the .md directly"

- **Bundled MCP server** — Claude consumes MCP natively; ChatGPT supports MCP via connectors/Apps. One MCP server satisfies both — no separate integrations.
  - Tools exposed: list documents, fetch Markdown by id, search library, fetch context bundle.
- **REST API** — programmatic convert + fetch for pipelines and the extension.
- **Self-hosted instances expose their own MCP endpoint** — agents read local Markdown without the source files ever leaving the box.
- **Token-cost benefit** — agents pull pre-converted Markdown instead of re-parsing raw files every call.

### 4.6 Authentication & Security

- Full auth: email/password + email verification, password reset.
- **2FA** — TOTP authenticator app **and** email OTP.
- **Cookie-based sessions only** — `httpOnly` + `Secure` + `SameSite` cookies; **nothing auth-related in localStorage** (prevents XSS token theft).
- **CSRF protection** — CSRF tokens on state-changing requests (required since cookies auto-send) plus `SameSite=Lax/Strict`.
- **Session rotation** on login and privilege change; server-side session store (Redis).
- Rate limiting on auth + conversion endpoints.
- Audit log for security-relevant events.
- Self-hosted: option to run fully offline with local LLM (Ollama) so no document or key ever leaves the machine.

### 4.7 Library / Document Management

- Folders/tags, search across all converted Markdown.
- Versioning — keep original + re-convert with a different engine + diff outputs.
- Watch-folder / source connectors — auto-convert on arrival (NAS share, Drive, S3) and push results out (Notion, GitHub, vector DB) via webhook.
- Bulk operations (re-convert, re-chunk, export).

---

## 5. Cloud vs Self-Hosted (feature split)

| Capability | Cloud | Self-hosted |
|------------|:-----:|:-----------:|
| Tiered conversion engine | ✅ managed | ✅ local |
| Dashboard + editor + viewer | ✅ | ✅ |
| AI repair / RAG export / compressor | ✅ | ✅ (own LLM keys or Ollama) |
| Chrome extension | ✅ | ✅ (points at local instance) |
| MCP server + REST API | ✅ hosted endpoint | ✅ local endpoint |
| Local-LLM / fully-offline mode | — | ✅ |
| Billing / teams / SSO | ✅ Stripe + RBAC | self-managed |
| Auto-updates | ✅ | manual / image pull |

**Positioning pillar:** "100% local / your keys, your data" for the self-hosted edition — the emotional hook that wins this audience.

---

## 6. Tech Stack (proposed)

- **Frontend:** Nuxt 3 / Vue 3, TypeScript, Tailwind, AnHourTec design system.
- **Backend:** Nuxt server / Nitro (or a separate Node service), TypeScript.
- **Processing service:** Python (FastAPI) wrapping the converters (MarkItDown / Docling / Marker / PyMuPDF4LLM) — keeps the Python ecosystem where it's strongest, behind a clean API.
- **DB:** PostgreSQL + Prisma.
- **Queue / sessions / cache:** Redis (+ BullMQ for jobs).
- **Storage:** S3-compatible (cloud) / local volume (self-host) for files + bundles.
- **Embeddings / vector:** pgvector (default, self-host friendly) with adapters for external vector DBs.
- **LLM:** provider-agnostic — hosted (Anthropic/OpenAI) or local (Ollama) for repair, descriptions, compression, schema extraction.
- **Extension:** Chrome (Manifest V3); reuses the Playwright-MCP a11y-snapshot approach for the bundle.
- **Packaging:** Docker + `docker compose` for the self-hosted bundle (web + api + worker + postgres + redis + processing service).

---

## 7. Phasing (functionality mapped to stages)

**Phase 0 — Foundation**
Auth (+2FA, cookie sessions, CSRF), project scaffolding, DB schema, Docker compose skeleton.

**Phase 1 — MVP converter**
Tiered engine (fast + structure paths), batch upload, side-by-side viewer, Markdown editor, download/export. All-MarkItDown-features dashboard.

**Phase 2 — Launch heroes**
Visual confidence + AI repair, PDF→RAG-ready export, token compressor. These are the Product Hunt demo set.

**Phase 3 — Agent + capture**
Bundled MCP server + REST API, Chrome extension with context bundles.

**Phase 4 — Library + automation**
Folders/tags/search, versioning + re-convert diff, watch-folder + webhooks, multi-doc chat.

**Phase 5 — Polish + self-host edition**
Local-LLM mode, billing/teams (cloud), schema extraction UI, table rebuilder, inline image descriptions.

> Functionality is the priority per scope; phases are a suggested build order, not a hard gate — heroes (Phase 2) can be pulled forward for an earlier launch.

---

## 8. Branding (AnHourTec)

Inherits the AnHourTec visual system. Product gets its own wordmark; company identity stays AnHourTec.

- **Primary Blue** `#2563EB` — brand, CTAs, theme.
- **Blue 500** `#3B82F6` — buttons, interactive, logo.
- **Blue 400** `#60A5FA` — gradients, secondary accent.
- **Blue 300** `#93C5FD` — dark-mode primary.
- **Neutrals** — Gray 900 `#111827`, Gray 600 `#4B5563`, Gray 400 `#9CA3AF`, Gray 200 `#E5E7EB`, Gray 100 `#F3F4F6`, White `#FFFFFF`.
- **Dark mode** — bg `#030712`, card `#111827`, border `#1F2937`, muted `#9CA3AF`, primary `#93C5FD`.
- **Semantic** — Success `#22C55E`, Error `#EF4444`, Purple accent `#8B5CF6`.
- **Gradient (hero/emphasis)** — `linear-gradient(135deg, #2563EB, #60A5FA, #8B5CF6)`.
- **Type** — system stack; H1 extrabold tracking-tight; body `leading-relaxed`.
- **Voice** — professional yet approachable, benefit-led, no hype words.

---

## 9. Open Decisions

- [ ] Final product name (TokenItDown vs Markpipe vs Readymark) + domain/trademark check.
- [ ] Marker GPU/licensing: ship as optional add-on engine vs default high-fidelity path.
- [ ] Default embedding model (local vs hosted) for the RAG-ready feature.
- [ ] Pricing model (cloud tiers; open-source core vs source-available for self-host).
- [ ] Which source connectors ship first for watch-folder (NAS / Drive / S3).
- [ ] Free tier / open-source posture for Product Hunt + GitHub audience.
