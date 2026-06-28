# Plan: Clean & Process Outputs + Competitive Feature Coverage

**Status:** Planning
**Owner:** AnHourTec / TokenItDown
**Relates to:** `PLAN.md` §4.1–4.3, §4.5, §4.7 · `HANDOFF.md` Phase 1/1b · `plans/markitdown-conversion-backend.md`
**Created:** 2026-06-28

---

## 1. Why this plan exists

Two drivers:

1. **The stated next step — "Clean and Process the Outputs."** MarkItDown gives us
   ~80% of a usable conversion, but its raw Markdown has predictable defects
   (fake headings, padded/garbled tables, interleaved reading order, base64 image
   bloat, hyphenation artifacts, boilerplate). The product's namesake promise —
   *TokenItDown* — only lands if we run a **normalization + token-optimization
   pass** on every conversion and **show the tokens saved**.

2. **Competitive coverage.** A direct competitor (BlazeDocs) positions on
   "your AI can't read messy documents — we fix that": OCR incl. handwriting,
   tables/formulas preserved (LaTeX), RAG-optimized output, chat-with-documents,
   auto tag/categorize, a CLI, a REST API, an anonymous try-it demo, and
   format-perfect export to Obsidian/Notion/GitHub. This plan makes sure every
   one of those is either **already covered, planned, or scoped here**, and
   names the **net-new** items so they aren't lost.

This plan does **not** rip up `PLAN.md`. It implements the cleaning thesis and
fills the competitive gaps, and lists the small set of `PLAN.md` additions at the
end (§9).

---

## 2. Current state (grounded in the codebase)

- **Engine:** `server/` FastAPI wrapping `markitdown[all]` (PyPI 0.1.6); internal-only,
  shared-secret guarded, SSRF-guarded URL fetch. `POST /convert`, `POST /convert-url`.
- **Web → service:** `lib/markitdown-client.ts` forwards uploads/URLs; API routes
  `app/api/convert`, `app/api/convert/url`, `app/api/documents*`.
- **Formats:** `app/dashboard/convert/formats.ts` — 11 format entries (pdf, word,
  powerpoint, excel, image, audio, html, data, archive, epub, url).
- **Storage:** `document` table (`lib/db/schema.ts`) holds `markdown` + source
  metadata + `sizeBytes`; original on disk under `STORAGE_DIR`. Helpers in
  `lib/documents.ts`, paths in `lib/storage-path.ts`.
- **UI:** per-format Convert pages, hub grid, Library (`file-viewer`), Documents
  (original + markdown). Markdown render via `react-markdown` + `remark-gfm`.

**What's missing for both drivers:** there is **no cleaning step** between MarkItDown
output and what we persist; **no token measurement**; no LaTeX/formula handling;
no chunking/RAG export; no chat; no auto-tagging; no CLI; no anonymous demo; no
Obsidian/Notion export; no "don't store" ephemeral mode.

---

## 3. Part A — Markdown Cleaning & Token-Optimization Pipeline (the core ask)

The heart of this plan. A deterministic post-processing pass plus optional
AI-assisted passes, applied after MarkItDown and before persistence, with
before/after token accounting surfaced in the UI.

### 3.1 Architecture

```
MarkItDown output (raw markdown)
  → normalize()          [deterministic, always on — lossless]
  → tokenCount(raw)      [measure]
  → optional AI passes   [opt-in per conversion / tier]
       · formula→LaTeX repair
       · figure/diagram alt-text
       · table rebuild for flagged tables
  → tokenCount(clean)    [measure]
  → persist raw + clean + token metrics
```

Two separable concerns, in order: **fidelity** (faithful representation) then
**token economy** (every token carries meaning). Cleaning must never *silently*
drop content — anything removed in a lossy mode is reported.

### 3.2 Deterministic normalizer — `lib/markdown/clean.ts` (new)

Pure, unit-tested, no network. Composable transforms, each individually testable.
Runs on **every** conversion (lossless tier).

Fidelity transforms:
- **Heading promotion** — detect bold-as-heading and lone numbered/section lines
  MarkItDown left as `**...**` / paragraphs; promote to `#`–`######` preserving
  nesting; never skip levels.
- **List repair** — convert stray `•`/`◦`/`·` bullets and `1)`-style runs to GFM
  `-` / `1.` lists.
- **Table normalization** — collapse cell padding to single spaces (pure token
  waste), drop fully-empty rows/columns, ensure a header separator row, escape
  stray pipes. (AI table *reconstruction* is §3.4, separate.)
- **De-hyphenation** — join `infor-\nmation` → `information` (PDF line-break artifact),
  guarding real hyphenated compounds.
- **Unicode normalize (NFC)** — fix ligatures (`ﬁ`→`fi`), zero-width chars,
  non-breaking spaces → spaces, consistent quote handling.
- **Reading-order cleanup** — strip repeated running headers/footers and bare
  page-number lines (detected by cross-page repetition); this is the #1 PDF defect.

Token-economy transforms:
- **Whitespace collapse** — 3+ blank lines → 1, strip trailing spaces, single
  trailing newline.
- **Decoration strip** — runs of `====`/`----` separators, HTML comments,
  empty emphasis.
- **Base64 image extraction** *(critical)* — never persist `data:` URIs inline (a
  single embedded image can be tens of thousands of tokens). Replace with a
  reference + alt text; store the binary separately (or drop in ephemeral mode).

Output: `{ markdown, stats: { headingsPromoted, tablesNormalized, imagesExtracted, boilerplateLinesRemoved, ... } }`.

### 3.3 Token metering — `lib/markdown/tokens.ts` (new)

The product is named for this — measure in **real model tokens**, not chars/bytes.

- Use the **Claude token-counting endpoint** (`POST /v1/messages/count_tokens`,
  model-specific via the Anthropic SDK) as the source of truth; **do not** use
  `tiktoken` (it undercounts Claude by ~15–20% on prose, far more on code).
- Provide a fast **local estimator** fallback (char/word heuristic) for the
  anonymous demo and when no API key is configured, clearly labelled "estimate."
- Compute `rawTokens`, `cleanTokens`, `tokensSaved`, `pctSaved`.
- Cache counts; counting is cheap but networked.

### 3.4 AI-assisted passes (opt-in; tiered) — `lib/markdown/ai/*` (new)

Provider-agnostic (Anthropic / OpenAI / Ollama per `PLAN.md` §6). Each is a
separate, independently toggleable pass:

- **Formula → LaTeX** — detect math regions and emit `$...$` / `$$...$$`
  (closes the BlazeDocs "formulas preserved as LaTeX" claim). Verify against the
  rendered original where possible.
- **Figure/diagram alt-text** — fill `![](...)` placeholders with generated
  descriptions so the Markdown is complete for an LLM (PLAN §4.3.6).
- **Table rebuild** — for tables the normalizer flags as low-confidence,
  reconstruct into clean GFM (PLAN §4.3.4).
- **Aggressive prune (lossy "Compact" tier)** — strip link URLs (keep anchor
  text), footnotes/citations, repeated legalese; **report exactly what was
  dropped** (never silent). This is the token-compressor (PLAN §4.3.3).

### 3.5 Wiring

- Add a `clean` step in `app/api/convert/route.ts` and `app/api/convert/url/route.ts`
  after the service returns, before `saveDocument`.
- A **cleaning tier** flag per request: `raw` | `clean` (default) | `compact`.
- `lib/documents.ts` `saveDocument` persists both `markdownRaw` and `markdown`
  (cleaned) + token metrics (§5).
- Library/Documents viewers gain a **Raw / Clean** toggle (the viewer already has
  a Preview/Raw split — extend it) and a **"Tokens saved −NN%"** badge.

### 3.6 Tests (per CLAUDE.md rule #4)

- `lib/markdown/clean.test.ts` — table fixtures, fake-heading fixtures,
  hyphenation, base64 extraction, boilerplate removal, idempotency
  (`clean(clean(x)) === clean(x)`).
- `lib/markdown/tokens.test.ts` — estimator math; endpoint client mocked.
- pytest unchanged (engine untouched here).

---

## 4. Part B — Competitive coverage (BlazeDocs parity + our edge)

Gap analysis of every BlazeDocs claim against our state. **Covered** = shipped;
**Planned** = already in `PLAN.md`; **NEW** = scoped by this plan.

| BlazeDocs claim | Our status | Where |
|---|---|---|
| PDF/scan/screenshot/DOCX/PPTX → Markdown | **Covered** (+ xlsx, audio, html, data, zip, epub, url) | `formats.ts` |
| Image OCR → Markdown | **Covered** (MarkItDown OCR) | `image` format |
| **Handwriting OCR / "99.9% accuracy, 50+ languages"** | **NEW** — needs AI-OCR engine path | §4.1 |
| Tables preserved | **Covered→improved** | §3.2 + §3.4 |
| **Formulas → LaTeX** | **NEW** | §3.4 |
| Reading order / H1–H6 hierarchy preserved | **NEW** (normalizer) | §3.2 |
| **RAG-optimized output / semantic chunk boundaries** | **Planned → scope here** | §4.2 |
| **Chat with your documents (single + corpus)** | **Planned (§4.3.7) → scope here** | §4.3 |
| **Auto categorization & tagging** | **NEW** | §4.4 |
| **CLI (`npm i -g`, `convert <file>`)** | **NEW** | §4.5 |
| Conversion REST API + Bearer key | **Planned → scope here** | §4.6 |
| **Anonymous try-it demo (page 1, 5MB, no signup)** | **NEW** | §4.7 |
| **Obsidian (WikiLinks/tags) / Notion / GitHub export** | **NEW** | §4.8 |
| "Documents never stored" / enterprise security | **NEW — ephemeral mode** | §4.9 |
| Token economy / "fraction of the tokens" | **Covered by Part A** | §3 |
| Side-by-side original vs markdown, copy/download .md | **Covered** | viewers |
| Recent-conversions dashboard | **Covered** (Library/Documents) | — |

### 4.1 Handwriting / high-accuracy AI-OCR engine path *(NEW)*

MarkItDown's OCR is weak on handwriting and degraded scans. Add a **second OCR
engine** behind the existing tiered routing (`PLAN.md` §4.1):
- New engine option in `server/` — an AI-OCR backend (e.g. a vision LLM or a
  dedicated OCR service) selected when the input is a scan/image or the user
  forces high-fidelity. Keep it pluggable (cloud vision model **or** local).
- Surface as a Convert toggle: "Standard / High-accuracy (handwriting & scans)."
- Multi-language is a property of the chosen engine; expose a language hint.
- Feed its output through the same §3 cleaning pipeline.

### 4.2 RAG-ready export *(scope of PLAN §4.3.2)*

- Chunk cleaned Markdown on heading boundaries (the normalizer guarantees a clean
  heading tree, making this near-free), with per-chunk token counts.
- Export formats: JSONL, LangChain/LlamaIndex document shape, plain chunked `.md`.
- Optional embeddings via pgvector (later; behind the same export UI).
- Surfaced as a one-click "Export → RAG" action in Library.

### 4.3 Chat with documents *(scope of PLAN §4.3.7)*

- Single-doc chat first (answer over the cleaned Markdown of one document with
  citations to headings), then corpus chat across the library.
- Provider-agnostic LLM; respects ephemeral mode (no persistence of chat over
  not-stored docs).
- New route `app/dashboard/chat` + `app/api/chat`.

### 4.4 Auto tag & categorize *(NEW)*

- After cleaning, an AI pass proposes tags + a category; user can accept/edit.
- New columns on `document` (§5) + a tags filter in Library.
- Cheap model, batchable; skippable in ephemeral mode.

### 4.5 CLI — `tokenitdown` npm package *(NEW)*

A globally-installable CLI mirroring BlazeDocs's developer wedge and serving
agents/CI:
- `npx tokenitdown convert <file> --output out.md` and `tokenitdown` guided setup
  storing an API key.
- Thin client over the REST API (§4.6); Node 18+.
- Lives in a workspace package (e.g. `packages/cli/`) or a sibling repo; ship
  `--version`, `--help`, `convert`, `login`.
- Flags: `--tier raw|clean|compact`, `--format md|json|chunked`, `--engine`.

### 4.6 REST API + API keys *(scope of PLAN §4.5)*

- `POST /api/v1/convert` (Bearer key, multipart) → `{ markdown, tokens, ... }`,
  matching the CLI and agent use.
- API-key model: new `apiKey` table (hashed), per-user, scoped, revocable; key
  management UI under Settings.
- Reuse the cleaning pipeline and tiers. Rate-limited (Redis).

### 4.7 Anonymous try-it demo *(NEW)*

Top-of-funnel: convert without signup.
- Public route `app/(marketing)/try` + `app/api/try/convert` (no auth).
- Hard limits: **page 1 only**, **5 MB max**, PDF/image only, strict rate limit
  by IP, ephemeral (never stored), token-savings shown to sell the value.
- Reuses engine + cleaning; isolated from the authed path's quotas.

### 4.8 Export targets: Obsidian / Notion / GitHub *(NEW)*

"Format-perfect output, no cleanup":
- **Obsidian** — `[[WikiLinks]]` option + `#tags` from §4.4 + YAML front-matter;
  export as a vault-friendly `.md` / zip.
- **Notion** — push via Notion API to a selected page/database (blocks).
- **GitHub** — already GFM; offer "copy as GFM" + optional commit-to-repo later.
- Front-matter is **separate from the LLM body** (front-matter costs tokens) —
  export toggle "with / without front-matter."

### 4.9 Ephemeral "don't store" mode *(NEW)*

BlazeDocs leans on "documents never stored." We default to a library (a feature),
but offer parity:
- Per-conversion **"Don't save"** toggle and an account-level default; in this
  mode originals and markdown are returned and **not persisted** (or purged
  immediately), only token metrics retained anonymously.
- This is the honest version of their claim and supports privacy/self-host
  positioning (`PLAN.md` §5).

---

## 5. Data-model changes (`lib/db/schema.ts`)

Add to `document` (new migration `0002_*`):
- `markdownRaw text` — pre-clean output (re-process without re-converting).
- `cleanTier text` — `raw|clean|compact`.
- `rawTokens integer`, `cleanTokens integer` — token accounting.
- `category text`, `tags text[]` (or a join table) — §4.4.
- `engine text` — which conversion/OCR engine produced it.

New tables:
- `apiKey` — `id, userId, name, hashedKey, lastUsedAt, createdAt, revokedAt`.
- (Later) `chunk` / embeddings for RAG + corpus chat.

All additive; regenerate via `npm run db:generate`.

---

## 6. Security & correctness (CLAUDE.md rules #5, #7)

Carry forward the open audit items so new surfaces don't inherit them:
- **SSRF** — validate URL scheme + resolved IP on the Node side too (not only
  Python); pin resolved IP in the Python fetch. New anonymous + API surfaces make
  this load-bearing.
- **Upload limits** — enforce size *before* buffering the whole body (Node and
  Python) on the new `/api/try` and `/api/v1` routes.
- **Rate limiting** — Redis-backed on convert, try, chat, and API routes.
- **API keys** — store hashed, constant-time compare, never log.
- **Ephemeral mode** — guarantee no disk/DB residue; cover with a test.
- Run `/security-review` on every new route and the cleaning pipeline.

## 7. Verification (CLAUDE.md rules #4, #6, #9)

- Unit: `clean.test.ts`, `tokens.test.ts`, chunker, tag-parser, api-key hashing.
- Integration: convert → clean → persist → token badge; ephemeral leaves no row.
- Playwright MCP end-to-end against `npm run dev` (service on :8000): upload a
  messy PDF → see cleaned output + "tokens saved" → export to RAG/Obsidian →
  anonymous demo converts page 1 → CLI `convert` round-trips via the API.

## 8. Suggested sequencing

1. **Part A cleaning pipeline + token metering + viewer badge** (the stated next
   step; highest leverage, no new infra).
2. Ephemeral mode (§4.9) + data-model additions (§5).
3. RAG export (§4.2) — rides directly on the clean heading tree.
4. REST API + API keys (§4.6) → CLI (§4.5) → anonymous demo (§4.7).
5. Auto-tag (§4.4) + Obsidian/Notion export (§4.8).
6. AI passes: formula→LaTeX, alt-text, table rebuild (§3.4).
7. High-accuracy/handwriting OCR engine (§4.1).
8. Chat with documents (§4.3), single then corpus.

Each step is independently shippable and testable; heroes (cleaning + token
savings, RAG export, chat) can be pulled forward for a launch demo.

## 9. PLAN.md additions (made alongside this plan)

New items folded into `PLAN.md` so the master plan stays the source of truth:
- §4.1 — second **high-accuracy/handwriting AI-OCR** engine in the tiered router.
- §4.2 — **deterministic cleaning/normalization pass** + **LaTeX formula** output.
- §4.3 — **auto tag/categorize** added to the AI feature list.
- §4.5 — **CLI tool** and **anonymous try-it demo** alongside MCP/REST.
- §4.7 — **Obsidian/Notion/GitHub export targets** and **ephemeral "don't store"
  mode**.
