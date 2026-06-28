# Extension Handoff

**Updated:** 2026-06-27 (M1–M5 shipped; content-script path bug fixed; first manual run done)
**Branch:** `extension`
**What this is:** A Chrome MV3 extension under `extension/` that turns a web page into
clean, LLM-ready Markdown **plus** a full-page screenshot. Pipeline: capture → route
(DOM/vision/hybrid) → describe visual regions → clean + token-report → download.

---

## Entry points (all built by Vite)

| File | Purpose |
|------|---------|
| `popup/popup.{ts,html,css}` | Popup UI: capture button, progress, preview, route badge, token line, PNG + Markdown downloads |
| `service-worker.ts` | Orchestrates the capture flow on `START_CAPTURE` (extract → screenshot → describe → clean → `CAPTURE_DONE`) |
| `content-script.ts` | Auto-injected (`<all_urls>`); answers `GET_PAGE_METRICS` / `SCROLL_TO` / `HIDE_FIXED` / `EXTRACT_MARKDOWN`. `analyzePage()` runs M1+M2(+M3 placeholders) |
| `lib/captureCDP.ts` | **M5, primary capture.** `captureFullPageCDP(session)` — DevTools-Protocol single-pass screenshot (attach → `Page.captureScreenshot` w/ `captureBeyondViewport` → detach). CDP transport injected for testability |
| `lib/screenshot.ts` + `lib/stitch.ts` | **Fallback capture.** Scroll in viewport steps → composite frames on `OffscreenCanvas`. Used when CDP can't attach |
| `lib/extract.ts` | **M1.** `extractMarkdown(doc,url)` — Readability → Turndown(GFM); falls back to `<body>`. Returns `ExtractResult` (incl. `source`, `readerable`, `textLength`) |
| `lib/route.ts` | **M2.** `collectSignals(doc,extract)` + pure `decideRoute(signals)` → `dom` / `vision` / `hybrid` |
| `lib/regions.ts` | **M3.** `collectRegions(doc)`, `injectPlaceholders(clone,regions)`, `spliceDescriptions(md,map)` |
| `lib/crop.ts` | **M3/M5.** pure `regionPixelRect()` + `cropRegions(png,regions,cssPageWidth)` (measures scale from the image) |
| `lib/describe.ts` | **M3.** `RegionDescriber` interface + default `metadataDescriber` (caption/alt/dims, no model) + `describeRegions()` |
| `lib/clean.ts` | **M4.** `cleanMarkdown(md)` — boilerplate strip + dedupe (guards headings/blockquotes) |
| `lib/tokens.ts` | **M4.** `estimateTokens(text)` (~4 chars/token) + `tokenSavings(before,after)` |
| `types.ts` | Shared message + data interfaces. `types/turndown-plugin-gfm.d.ts` — decl for the untyped plugin |

## Build & test
```bash
cd extension && npm run build      # rebuilds dist/ (copies public/ → dist/, incl. icons)
cd extension && npm run typecheck  # zero TS errors
# from repo root:
npx vitest run extension/src/lib   # 63 unit tests (screenshot7 extract6 route12 regions9 crop6 describe5 clean6 tokens7 captureCDP5)
npm run e2e:extension              # 3 Playwright e2e (loads the unpacked extension)
```

---

## Status

All of **M1–M5 are done, security-reviewed clean, and live-verified in real Chrome.**
63 unit + 3 e2e green; typecheck + build clean. Committed M1–M5 + the path fix and pushed.

**Manual testing works** for normal pages: the toolbar **Capture Full Page** → screenshot
preview + route badge + token line + PNG/Markdown downloads. (Rebuild + reload the
extension at `chrome://extensions` after any change.)

**Two open caveats** (details below): full button→download flow isn't auto-tested (needs
a toolbar gesture Playwright can't fake), and scroll-animated marketing sites distort the
screenshot.

---

## Architecture & pipeline

```
CAPTURE  full-page screenshot + live (post-render) DOM
   │
ROUTE    text density · readability · canvas/SVG/img area dominance
   ├── dom     Readability → Turndown          (text-heavy)
   ├── hybrid  DOM skeleton + region crops      (text + charts)
   └── vision  screenshot → vision → MD          (canvas/dashboards) — not built yet
   │
CLEAN    boilerplate strip · dedupe · token report
   │
OUTPUT   page.md + screenshot.png  (+ a11y-tree.yml, bundle upload — not built yet)
```

Key decisions: DOM is the Markdown source of truth where it has text (we read the live,
hydrated DOM, so SSR/CSR is irrelevant); the screenshot is a required output and doubles
as the crop source for hybrid; vision is the universal floor for canvas/image-text pages.
Later superpowers: `all_frames` for cross-origin iframes; scroll pass to accumulate
virtualized lists.

---

## Milestones (all ✅ DONE 2026-06-27)

**M1 — DOM→Markdown.** `extract.ts`: clone doc (Readability mutates), isolate the article,
convert to GFM Markdown, normalize blanks; `<body>` fallback records `source`/`readerable`
for routing. Popup gains Download Markdown (revocable Blob URL, `slugify(title).md`). Deps:
`@mozilla/readability`, `turndown`, `turndown-plugin-gfm`.

**M2 — Router.** `collectSignals` reads text length + readability + canvas/svg/img counts and
**area ratios** (`getBoundingClientRect` area ÷ page area). Pure `decideRoute`: text<200 →
vision; visualArea≥0.6 → vision; visualArea≥0.3 or canvasArea≥0.1 → hybrid; readable+
readability → dom; else dom (low confidence). Popup shows a colored route badge (tooltip =
reason).

**M3 — Hybrid vision-assist.** For hybrid pages: `collectRegions` (canvas/svg/figure/img,
deduped, ≥200×150 except figures, with page rects + labels), clone+`injectPlaceholders`
(`<p>TIDREGION<id>ENDREGION</p>` — pure-alphanumeric token survives Readability/Turndown),
re-extract so tokens land **inline**. Service worker crops each region from the screenshot,
describes it, `spliceDescriptions`. Default `metadataDescriber` uses caption/alt/dims (no
model) and emits `> **Figure:** …`. **Provider interface ready** — an LLM describer plugs
into the same seam (see "Open decisions").

**M4 — Clean + token report.** `cleanMarkdown` strips whole-line boilerplate (cookie/social/
newsletter/legal/nav-bar ≥4 links) + consecutive dups; **conservative** — never touches
headings or blockquotes (M3 descriptions), single links survive. `estimateTokens` (~4
chars/token, labelled `≈`) + `tokenSavings`. Cleaned Markdown is what downloads; popup
shows `≈ N tokens · −X% after cleaning`.

**M5 — CDP single-pass screenshot.** `captureFullPageCDP` via `chrome.debugger` is the
**primary** path (one compositor pass — no seams, captures fixed headers); scroll-stitch is
the fallback when attach fails (chrome:// / Web Store / DevTools attached / declined). Added
`"debugger"` permission.
- **Scale fix (surfaced here):** CDP renders at a device scale that is **not** necessarily
  `window.devicePixelRatio` (observed 1.5× while DPR=1.0). `cropRegions` now **measures**
  scale from `img.width / cssPageWidth` (`metrics.scrollWidth`) — correct for CDP *and*
  stitch images. `regionPixelRect` param `dpr` → `scale`.

---

## Capture quality (Strategy A shipped; B open)

The CDP path (M5 = **Strategy A**) fixes most scroll-stitch defects for normal pages: seams,
DPR resample, scrollbar stretch, sub-pixel seams, dropped fixed header, lazy-content settle.

**Strategy B — harden the scroll-stitch fallback** (still open; for the no-banner / restricted
-page path to reach GoFullPage parity):
1. Throttle `captureVisibleTab` to ≥500ms + retry on quota error.
2. Derive scale from captured image width; draw frames 1:1 at integer offsets.
3. Re-measure `scrollHeight` during the loop (lazy content grows the page).
4. Keep fixed elements on frame 1, hide for the rest.
5. Longer settle + dispatch scroll events + `await img.decode()` for lazy media.
6. Tile output past the 16384px canvas limit instead of cropping.

Refs: [CDP captureBeyondViewport](https://screenshotone.com/blog/capture-beyond-viewport-in-puppeteer-and-chrome-devtools-protocol/) ·
[GoFullPage](https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl)

---

## Known limitations

- **Scroll-animated / pinned sites repeat the hero** (e.g. iotkinect.com → hero ~14× down a
  12,916px image). **Not a code bug** — confirmed in real Chrome that a `position:fixed`
  header captures correctly, and `Emulation.setDeviceMetricsOverride` does *not* fix it.
  These sites (GSAP ScrollTrigger / `fullPage.js`) reveal panels one-per-scroll; the
  single-screen view only exists mid-scroll, so any full-page render stacks them. Markdown
  is unaffected (router picks DOM). *Future idea:* detect such pages (very tall `scrollHeight`
  + thin text) and prefer scroll-stitch, or warn. Lesson: **verify screenshot content, not
  just dimensions** — M5's dimension-only check missed this.
- **Full button→download flow isn't auto-tested.** `executeScript` and `captureVisibleTab`
  need the `activeTab` gesture granted by a real toolbar click, which Playwright can't do.
  `EXTRACT_MARKDOWN` (auto-injected content script) and the CDP capture (`chrome.debugger`)
  *don't* need the gesture, so they're driven directly in verification scripts. Verify the
  full click flow manually.

---

## e2e / tooling gotchas (load-bearing)

- **Service worker is IIFE, not ESM** — `vite-plugin-web-extension@4` hardcodes `iife`, so
  the manifest must NOT set `"type":"module"`.
- **Icons must live in `public/`** — the plugin doesn't bundle `icons`/`action.default_icon`;
  it copies `public/` → `dist/` verbatim. They're at `public/src/icons/`. (Chrome silently
  refuses to load an extension with missing referenced files.)
- **Content-script injected path is `src/content-script.js`** (the dist layout), with a
  `window.__tokenitdownContentLoaded` guard so the manifest auto-inject + capture re-inject
  don't register the message listener twice. *(This was the `Could not load file` bug — fixed.)*
- **Playwright extension loading:** `ignoreDefaultArgs: ["--disable-extensions",
  "--disable-component-extensions-with-background-pages"]`; read the extension id from
  `context.serviceWorkers()` (the `serviceworker` event doesn't fire for extension SWs); use
  one shared context with a 10s teardown race (per-test `context.close()` hangs on Windows
  headed). Keep native Windows backslash paths for `--load-extension`.

---

## What's next

- **Real icons** — replace the 1×1 placeholders in `public/src/icons/` (keep them in `public/`).
- **Strategy B** — harden the scroll-stitch fallback (list above).
- **Bundle upload** — wire `page.md` + `screenshot.png` (+ a11y tree) into the authenticated
  platform upload (PLAN.md §4.4).
- **CI** — extension e2e needs `headless:false`; on Linux CI wrap with `xvfb-run` (separate job).

## Open decisions

- **LLM provider location** (gates M3b vision-describe and M4b AI-prune — both plug into the
  existing `RegionDescriber` / `cleanMarkdown` seams): Next.js `/api/describe` route (key
  server-side) vs direct Anthropic from the extension (user key in storage) vs local Ollama
  (llava). No backend/key exists yet.

## Security model

Untrusted page content (Markdown, region labels, descriptions) only ever lands in the
**download-only** `text/markdown` Blob — never rendered as HTML anywhere in the extension.
The popup shows only numeric stats (`textContent`). `chrome.debugger` uses static CDP
commands against the user's own active tab, always detaches, no network sink. ⚠️ If a future
milestone renders Markdown as HTML in-popup, sanitize it (DOMPurify) first.
