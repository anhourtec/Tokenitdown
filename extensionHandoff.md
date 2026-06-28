# Extension Testing Handoff

**Last updated:** 2026-06-27 (after M5 — CDP single-pass screenshot capture, primary path)
**Branch:** `extension`
**Scope:** Testing the Chrome extension (`extension/`) — what was done, what works, what's still unverified, and exactly where to continue.

---

## What Exists in the Extension

The Chrome MV3 extension lives entirely under `extension/`. It captures a full-page screenshot by scrolling the active tab and stitching viewport-sized frames into a single PNG, and (as of M1) **extracts the page's main content as clean Markdown** from the live DOM. The popup offers both as downloads.

### Entry points (all built by Vite)

| File | Purpose |
|------|---------|
| `src/popup/popup.ts` + `popup.html` + `popup.css` | Extension popup UI: capture button, progress bar, preview image, download link, error display |
| `src/service-worker.ts` | Background worker — receives `START_CAPTURE` from the popup, orchestrates scroll → capture → stitch |
| `src/content-script.ts` | Injected into every page — responds to scroll/metrics/hide-fixed messages **and `EXTRACT_MARKDOWN`** from the service worker |
| `src/lib/captureCDP.ts` | M5: `captureFullPageCDP(session)` — single-pass full-page screenshot via the DevTools Protocol (attach → `Page.getLayoutMetrics` → `Page.captureScreenshot` w/ `captureBeyondViewport` → detach). **Primary** capture path; CDP transport injected for testability |
| `src/lib/screenshot.ts` | Pure logic: `captureFrames()` — scrolls top-to-bottom in viewport steps, calls injected callbacks. **Fallback** path when CDP can't attach |
| `src/lib/stitch.ts` | Pure logic: `stitch()` — composites frames onto an `OffscreenCanvas`, returns a PNG data URL (fallback path) |
| `src/lib/extract.ts` | Pure logic: `extractMarkdown(doc, url)` — Readability main-content extraction → Turndown (GFM) → clean Markdown. Returns `ExtractResult` |
| `src/lib/route.ts` | M2 router: `collectSignals(doc, extract)` reads DOM signals (text length, readability, canvas/svg/img counts + area ratios, link density); pure `decideRoute(signals)` → `RouteDecision` (`dom` / `vision` / `hybrid`) |
| `src/lib/regions.ts` | M3: `collectRegions(doc)` finds visual regions (canvas/svg/figure/img, size-filtered, deduped) with page rects + labels; `injectPlaceholders(clone, regions)` puts inline tokens at each region's spot; `spliceDescriptions(md, descs)` swaps tokens for descriptions |
| `src/lib/crop.ts` | M3: pure `regionPixelRect()` (CSS→device px, clamped) + `cropRegions(screenshotPng, regions, metrics)` — crops each region out of the stitched PNG via `OffscreenCanvas` |
| `src/lib/describe.ts` | M3: `RegionDescriber` provider interface + default `metadataDescriber` (caption/alt/dimensions, no model) + `describeRegions()` helper. A vision/LLM provider plugs in here |
| `src/lib/clean.ts` | M4: `cleanMarkdown(md)` — high-precision boilerplate strip (cookie/social/newsletter/legal lines, nav link bars), consecutive-duplicate dedupe, blank-line collapse. Guards headings + blockquotes |
| `src/lib/tokens.ts` | M4: `estimateTokens(text)` (~4 chars/token heuristic) + `tokenSavings(before, after)` → `TokenStats` |
| `src/types.ts` | Shared message type definitions (pure TypeScript interfaces, no Chrome API usage) — incl. `PageSignals`, `RouteDecision`, `PageAnalysis`, `Region`, `RegionCrop`, `TokenStats` |
| `src/types/turndown-plugin-gfm.d.ts` | Minimal type decl for `turndown-plugin-gfm` (ships no types) |

### Build & test
```bash
cd extension && npm run build     # rebuilds dist/ (copies public/ → dist/, incl. icons)
cd extension && npm run typecheck # zero TS errors
# unit tests run from the repo root via Vitest:
npx vitest run extension/src/lib   # screenshot 7 + extract 6 + route 12 + regions 9 + crop 6 + describe 5 + clean 6 + tokens 7 + captureCDP 5 = 63 tests
npm run e2e:extension              # 3 Playwright e2e tests (loads the unpacked extension)
```

---

## Current Status — extension loads, 3 e2e tests pass ✅

| Item | Status |
|------|--------|
| `extension/manifest.json` — service worker format fix | ✅ Fixed (`"type": "module"` removed) |
| `extension/public/src/icons/` — placeholder PNG icons | ✅ Moved to `public/`; build copies them to `dist/` every time |
| `extension/src/lib/screenshot.test.ts` — 7 unit tests | ✅ All pass |
| `extension/src/lib/extract.test.ts` — 6 unit tests (DOM→MD) | ✅ All pass |
| `extension/src/lib/route.test.ts` — 12 unit tests (M2 router) | ✅ All pass |
| `extension/src/lib/{regions,crop,describe}.test.ts` — 20 unit tests (M3) | ✅ All pass |
| `extension/src/lib/{clean,tokens}.test.ts` — 13 unit tests (M4) | ✅ All pass |
| `extension/src/lib/captureCDP.test.ts` — 5 unit tests (M5) | ✅ All pass |
| `e2e/extension.spec.ts` — 3 Playwright e2e tests | ✅ All pass (3.4s) |
| `playwright.extension.config.ts` + npm script | ✅ In place |
| M1 DOM→Markdown — live-verified in real Chrome + security review | ✅ Clean |
| M2 router — live-verified in real Chrome (3/3 routes) + security review | ✅ Clean |
| M3 hybrid region crop + inline describe — live-verified + security review | ✅ Clean |
| M4 clean stage + token report — popup UI live-verified + security review | ✅ Clean |
| M5 CDP single-pass capture — live-verified in real Chrome + security review | ✅ Clean |

### Resolution of the "Chrome launch crash" (session 2026-06-27)

The real failure was **never a Chrome crash** — Chrome launched fine, but the
extension silently failed to load because its **icon files were missing from
`dist/`**. Chrome refuses (silently) to load an unpacked extension whose manifest
references files that don't exist.

**Why the icons were missing:** `vite-plugin-web-extension@4.x` only treats
specific manifest fields as build entrypoints (`default_popup`,
`background.service_worker`, `content_scripts.*`, etc. — see `renderManifest` in
the plugin source). It does **not** process the `icons` or `action.default_icon`
fields at all, so manifest-referenced icons are never bundled. The plugin expects
static assets to live in a **`public/` directory**, which it copies to `dist/`
verbatim on every build.

The previous session worked around this by hand-copying icons into
`extension/dist/src/icons/`. But `dist/` is gitignored **and** the build runs with
`emptyOutDir`, so those icons were wiped on the very next `npm run build` and never
committed. Every fresh build silently broke extension loading again.

**The fix (durable):**
- Created `extension/public/src/icons/icon{16,32,48,128}.png` (tracked in git).
- The build copies `public/` → `dist/` automatically, so `dist/src/icons/*` exists
  after every `npm run build`. Matches the manifest paths (`src/icons/icon16.png`).
- Removed the now-dead `extension/src/icons/` (the build never read it).

Verified: clean `npm run build` produces `dist/src/icons/*`; the extension service
worker registers in Playwright; all 3 e2e tests pass.

---

## What Was Done This Session

### 1. Root project `npm install` — was missing
`node_modules/` didn't exist in the project root. Ran `npm install` (1712 packages).

### 2. Fixed the service worker build format
**Problem:** `extension/manifest.json` declared `"type": "module"` for the background service worker, but `vite-plugin-web-extension` v4 always builds service worker scripts with `format: "iife"`.

**Root cause:** In `vite-plugin-web-extension/dist/index.js`, `getIndividualConfig()` hardcodes `formats: ["iife"]` as the second arg to `vite.mergeConfig()` which always wins over `scriptViteConfig`.

**Fix:** Removed `"type": "module"` from `extension/manifest.json`. Chrome loads the service worker as a classic script, which is compatible with IIFE output.

### 3. Unit tests for `captureFrames` — 7 tests, all pass
Written at `extension/src/lib/screenshot.test.ts`, run via root Vitest:
```bash
npm run test -- run extension/src/lib/screenshot.test.ts
```

`stitch.ts` is NOT unit-tested — it requires `OffscreenCanvas` which jsdom doesn't support.

### 4. Playwright extension infrastructure
- `e2e/extension.spec.ts` — 3 tests
- `playwright.extension.config.ts` — timeout: 90s, actionTimeout: 15s
- `"e2e:extension"` script in `package.json`

### 5. Key bugs found and fixed in the Playwright test

#### Bug 1: Playwright's default flags block extension loading
Playwright adds `--disable-extensions` and `--disable-component-extensions-with-background-pages` to Chrome by default. Both must be suppressed:
```ts
ignoreDefaultArgs: [
  "--disable-extensions",
  "--disable-component-extensions-with-background-pages",
],
```

#### Bug 2: Windows path — use native backslashes
`path.resolve(__dirname, "../extension/dist")` returns a native Windows path. Do NOT call `.replace(/\\/g, "/")` — forward slashes cause Chrome to misparse the path as separate CLI flags.

#### Bug 3: Missing icon files prevented extension from loading
`manifest.json` references `src/icons/icon{16,32,48,128}.png` but these files didn't exist. Chrome silently refuses to load the extension if referenced files are missing. Fix: created minimal 1×1 placeholder PNGs at `extension/src/icons/` and `extension/dist/src/icons/`.

#### Bug 4: Shadow DOM search started from wrong element
The `resolveExtensionId()` function searched for the extension ID by walking shadow DOM starting from the `extensions-manager` ELEMENT. But `element.querySelectorAll("*")` doesn't pierce shadow DOM — all the extension content lives in `extensions-manager.shadowRoot`. Fix: start from `document.documentElement` so `extensions-manager` appears as a light-DOM element, and the function properly enters its shadow root via the recursion.

#### Bug 5: Race condition — button re-enabled before Playwright polls
After clicking "Capture Full Page" from an extension-page URL, the service worker errors immediately (can't inject content scripts into extension pages). The button is disabled briefly and re-enabled before Playwright's first `toBeDisabled()` poll. Fix: removed the transient disabled assertion; tests now just wait for the terminal error/result state.

#### Bug 6: Per-test Chrome launch causing Windows teardown hangs
Original design launched a fresh `launchPersistentContext` for each of 3 tests. `context.close()` on Windows with headless:false hangs, causing "Worker teardown timeout". Fix: moved to a shared context created in `test.beforeAll` and torn down in `test.afterAll` with a 10s timeout race.

---

## Key Technical Facts

- **Why IIFE and not ESM?** `vite-plugin-web-extension@4.x` always builds scripts as IIFE. It merges `formats: ["iife"]` as the override arg to `mergeConfig`, so `scriptViteConfig` cannot change it.
- **Why `ignoreDefaultArgs`?** Playwright hardcodes `--disable-extensions` in its Chrome default args. Without suppressing it, `--load-extension` is silently ignored.
- **Why not `waitForEvent('serviceworker')`?** Playwright's `serviceworker` event fires for web page service workers registered via `navigator.serviceWorker.register()`. Chrome extension service workers are registered by the browser itself and don't emit this event in Playwright contexts.
- **Why `document.documentElement` in shadow DOM search?** `element.querySelectorAll("*")` does NOT pierce shadow boundaries. Starting from `document.documentElement` allows the extension-manager element to appear as a light-DOM element; the recursion then enters its shadow root via `.shadowRoot`.
- **Why the race condition?** The service worker errors in <100ms when no valid tab exists. Playwright's `toBeDisabled()` polls at ~100ms intervals, so the first poll often sees the button already re-enabled.

---

## Files Changed / Created

| File | Change |
|------|--------|
| `extension/manifest.json` | Removed `"type": "module"` from background service worker |
| `extension/src/icons/icon{16,32,48,128}.png` | **New** — minimal placeholder PNGs |
| `extension/dist/src/icons/icon{16,32,48,128}.png` | **New** — same, in dist (so current build works) |
| `extension/src/lib/screenshot.test.ts` | **New** — 7 unit tests for `captureFrames`, all pass |
| `e2e/extension.spec.ts` | **New** — 3 Playwright extension tests, all pass |
| `playwright.extension.config.ts` | **New** — Playwright config for extension tests (no web server, 90s timeout) |
| `package.json` | Added `"e2e:extension"` script |
| `extensionHandoff.md` | **This file** |

---

---

## Step 1 Attempt — Full Capture Flow (session 2026-06-26)

### What was tried

The goal was to add a Playwright test that navigates to a real page, opens the popup, clicks "Capture Full Page", and verifies a PNG preview + download link appear.

**Core constraint:** The manifest only has `activeTab` permission. `activeTab` is only granted when the user physically clicks the toolbar icon — not when Playwright navigates directly to the popup URL as a regular tab. This means `chrome.scripting.executeScript` and `chrome.tabs.captureVisibleTab` both fail without a real user gesture.

**Attempted fix:** Add `"host_permissions": ["<all_urls>"]` to `extension/manifest.json`. This would allow programmatic capture on any HTTP/HTTPS page without requiring `activeTab` to be granted by gesture.

**Result:** Adding `host_permissions: ["<all_urls>"]` caused Chrome to **completely refuse to load the extension** — `chrome://extensions/` showed zero extensions. The exact cause is unclear (Playwright's bundled Chrome may reject unpacked extensions with broad host permissions silently), but it was consistent across two runs.

**Reverted:** The manifest change was reverted. The dist was rebuilt to the original state.

### Root cause: Chrome exits immediately after launch

After multiple debugging attempts, the issue is clear: **Chrome itself is crashing or exiting shortly after launch**, before any extension can load. The symptom is:

```
Error: browserContext.newPage: Target page, context or browser has been closed
```

This happens during the polling loop in `resolveExtensionId`, meaning Chrome exits within the first ~10 seconds. The `chrome://extensions/` page (when we do reach it) shows zero extensions — confirming the extension never loaded.

**What was ruled out:**
- The `e2e/extension.spec.ts` file has been restored to the original 3-test form (HTTP server code removed, 4th test removed, `resolveExtensionId` updated to poll via service workers first, then shadow DOM as fallback)
- Chrome enterprise policies: `HKLM:\SOFTWARE\Policies\Google\Chrome` key exists but is empty
- Stale Chrome processes: killed all; no change
- Corrupt dist: clean rebuild of `extension/dist`; no change
- `host_permissions: ["<all_urls>"]`: reverted; no change
- Playwright 1.61.1 / Chromium build 1228

**Most likely cause:** Playwright's bundled Chromium 1228 (the version shipped with Playwright 1.61.1) has a regression or policy change on Windows that causes `launchPersistentContext` with `--load-extension` to crash. This was working with an earlier Playwright version in the previous session.

**Current state of `e2e/extension.spec.ts`:**
- The HTTP server code is removed ✅
- The 4th capture flow test is removed ✅  
- `resolveExtensionId` now tries `context.serviceWorkers()` first (polling 20×500ms), then falls back to the shadow DOM search with `waitForFunction` polling instead of a fixed 3s wait
- The file is otherwise identical to the previously passing state

### How to unblock the 3 tests

**Option 1: Downgrade Playwright**
The previous passing session used an earlier version. Try:
```bash
npm install --save-dev playwright@1.48 @playwright/test@1.48
npx playwright install chromium
npm run e2e:extension
```

**Option 2: Use system Chrome instead of Playwright's bundled Chromium**
Add `channel: "chrome"` to the `launchPersistentContext` call in `playwright.extension.config.ts` or in the `beforeAll`. This uses the locally installed Google Chrome rather than Playwright's bundled Chromium.
```ts
sharedContext = await chromium.launchPersistentContext(userDataDir, {
  channel: "chrome",   // ← add this
  headless: false,
  ...
})
```
Requires Google Chrome to be installed on the machine.

**Option 3: Debug Chrome crash**
Add `--enable-logging=stderr` to the Chrome args and capture output to find the crash reason:
```ts
args: [
  "--enable-logging=stderr",
  "--log-level=0",
  `--disable-extensions-except=${EXTENSION_PATH}`,
  `--load-extension=${EXTENSION_PATH}`,
]
```
Then pipe test output to a file and search for Chrome's exit reason.

### Unblocking the capture flow test — options

**Option A: Use `chrome.action.openPopup()` from service worker context**
Playwright can access service workers via `context.serviceWorkers()`. Calling `chrome.action.openPopup()` from the service worker grants `activeTab` and opens the popup as a real popup window (not a tab). The popup would then see the real underlying page as active. This is the cleanest approach and doesn't require changing permissions. Main risk: `chrome.action.openPopup()` requires Chrome 127+ and may or may not work in Playwright's persistent context.

**Option B: Narrower host permission (`http://127.0.0.1/*`)**
Instead of `<all_urls>`, add only `"host_permissions": ["http://127.0.0.1/*"]` to the manifest. This targets only the local test server and might not trigger whatever Chrome validation blocks `<all_urls>`. Needs testing.

**Option C: Add the `tabs` permission**
Adding `"tabs"` to `permissions` allows `chrome.tabs.query` to return full tab info including URL. It does NOT grant `captureVisibleTab` by itself — you'd still need `activeTab` or host permissions for that. Partial help only.

**Option D: Manual / CI-manual verification**
Accept that Playwright can't easily test the full capture pipeline, and instead:
- Keep the unit tests for `captureFrames` (already done)
- Test `stitch.ts` via `page.evaluate` in a browser context
- Document that the popup capture should be verified manually after each extension change

---

## What to Do Next

### Step 0 — Fix the Chrome launch crash (urgent) — ✅ DONE
Resolved 2026-06-27. Root cause was missing `dist/` icons (not a Chrome crash);
icons now live in `extension/public/src/icons/` and are copied on every build.
`npm run e2e:extension` shows 3/3 passing. See "Resolution" section above.

> Note: the earlier diagnosis (Playwright/Chromium 1228 regression, downgrade,
> `channel: "chrome"`) was a red herring — Playwright's bundled Chromium launches
> the extension fine once the icons are present. No Playwright/config change was needed.

### Step 1 — Test the full capture flow end-to-end
Attempt Option A (`chrome.action.openPopup()`) first. If that doesn't work, try Option B (narrower host permission). If both fail, fall back to Option D (manual verification) and document it clearly.

The target behavior to test:
1. Navigate to a page with controlled height (two viewport heights = two frames)
2. Click "Capture Full Page" from the popup
3. Verify a PNG preview appears and the download link is present with a `data:image/png;base64,...` href

### Step 2 — Unit test `stitch.ts`
`stitch()` uses `OffscreenCanvas` + `createImageBitmap` which jsdom doesn't support. Test via:
- A Playwright test that injects a minimal stitch call and checks canvas dimensions
- Or `page.evaluate()` in a real browser context

### Step 3 — Security review
Run `/security-review` on the extension source before shipping.

### Step 4 — Real icon assets
Replace the 1×1 placeholder PNGs in `extension/public/src/icons/` with actual
branded icons (16, 32, 48, 128px). Keep them under `public/` so the build copies
them to `dist/` automatically — do NOT put them in `src/icons/` (the build ignores
that path).

### Step 5 — CI support
The Playwright extension tests require `headless: false`. On Linux CI this needs `xvfb-run`. The extension tests are excluded from the main Playwright config (`playwright.config.ts`) — they need a separate CI job or `xvfb-run` wrapper.

---

## Capture Quality — Findings & Improvement Plan (session 2026-06-27)

A live capture of a tall marketing page (bookyourpto.com, ~17.5k px) surfaced
that our output quality lags dedicated extensions (Awesome Screenshot, GoFullPage).
This section records what those tools do and the concrete defects in our pipeline.

### What the best extensions use

- **Awesome Screenshot & GoFullPage use the same family as us** — scroll in
  viewport steps, capture each with `chrome.tabs.captureVisibleTab`, stitch onto a
  canvas. Their quality comes from handling the hard parts carefully, not a secret API.
- **The one genuinely higher-fidelity API is the Chrome DevTools Protocol** via the
  `chrome.debugger` permission:
  ```js
  chrome.debugger.attach({ tabId }, "1.3")
  chrome.debugger.sendCommand({ tabId }, "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true })
  chrome.debugger.detach({ tabId })
  ```
  This renders the whole page in a single compositor pass — no scrolling, no
  stitching, so no seams / fixed-element duplication / scroll-timing / DPR
  resampling. Trade-offs: shows the yellow "DevTools is debugging this browser"
  banner, needs the `debugger` permission, can't capture `chrome://` / Web Store
  pages, and is bounded by encode/size limits.

### Concrete defects in our current scroll-and-stitch

| # | Defect | Where | Effect |
|---|--------|-------|--------|
| 1 | `captureVisibleTab` rate-limit ignored — Chrome caps it at ~2 calls/sec; settle is 150ms | `service-worker.ts:13` | Quota errors → failed/duplicated frames → seams & duplicated strips (biggest issue) |
| 2 | DPR/width resampling — canvas width is `scrollWidth*DPR` but frames are drawn rescaled to it, not 1:1 with `img.width` | `stitch.ts:19,52` | Horizontal rescale → soft/blurry text |
| 3 | Scrollbar width counted in `scrollWidth` but absent from the capture | `stitch.ts:19` | Slight horizontal stretch |
| 4 | Page height measured once, up-front | `service-worker.ts:54` | Lazy/reveal content grows the page mid-capture → misaligned stitch / missed bottom |
| 5 | Sub-pixel seams — `scrollY*DPR` placed without integer rounding | `stitch.ts:42,45` | Faint horizontal seam lines |
| 6 | Header dropped entirely — we hide *all* fixed elements for the whole capture | `service-worker.ts:57` | Fixed nav/header missing from output |
| 7 | Settle too short for lazy/animated content | `service-worker.ts:13` | Reveal-on-scroll sections come out blank |

### Plan

**Strategy A — Add a CDP capture path (recommended; biggest quality jump, least code).** ✅ SHIPPED in M5 (2026-06-27).
1. ~~Add `"debugger"` to manifest permissions.~~ Done.
2. ~~New `lib/captureCDP.ts`: `attach` → `Page.enable` → `Page.getLayoutMetrics`
   (read `cssContentSize`) → `Page.captureScreenshot({ captureBeyondViewport: true, clip })`
   → `detach`.~~ Done. (Did **not** use `Emulation.setDeviceMetricsOverride` to pin
   the scale — that would relayout the page and shift region positions vs what the
   content script measured. Instead, crop scale is now measured from the produced
   image; see the M5 milestone note on the DPR finding.)
3. ~~Make it **primary**; fall back to scroll-stitch when attach fails / page restricted.~~ Done.
4. ~~Playwright e2e: capture a tall page, assert output dimensions.~~ Done — live-verified
   (5208px single-pass capture of a 720px-viewport page). This also fixes defects
   #1, #2, #3, #5, #6, #7 above (seams, DPR resample, scrollbar, sub-pixel seams,
   dropped fixed header, lazy-content settle) for the primary path in one move.

**Strategy B — Harden the scroll-stitch fallback to GoFullPage parity** (no-banner mode + restricted pages):
1. Throttle captures to ≥500ms **and** catch the quota error with retry/backoff (#1).
2. Derive scale from the actual captured image width vs `innerWidth`; draw frames
   1:1 at integer device-pixel offsets (#2, #5).
3. Re-measure `scrollHeight` during the scroll loop; continue until it stops growing (#4).
4. Keep fixed elements visible on frame 1, hide for the rest (#6).
5. Longer settle + dispatch scroll events + `await img.decode()` for lazy media (#7).
6. Tile output when it exceeds the 16384px canvas limit instead of cropping.

**Sequencing:** ship A first (~80% of the gap for normal pages), then B so the
fallback is solid for `chrome://` / debugger-declined cases. One focused commit each.

**Sources:** [Full-Page-Screenshot (CDP)](https://github.com/sssstf0rest/Full-Page-Screenshot) ·
[captureBeyondViewport — screenshotone](https://screenshotone.com/blog/capture-beyond-viewport-in-puppeteer-and-chrome-devtools-protocol/) ·
[GoFullPage](https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl)

---

## Web → Markdown Pipeline — Architecture & Progress

The capture work feeds a larger goal: **turn any web page into clean, LLM-ready
Markdown** (plus the screenshot as a required artifact). Agreed architecture:

```
CAPTURE  (always)  full-page screenshot + DOM snapshot (live, post-render)
   │
ROUTE   per page (later per-region): text density · readability · canvas/SVG/img dominance
   ├── DOM path     Readability → Turndown            (text-heavy pages)
   ├── Hybrid       DOM skeleton + vision on charts    (text + visual blocks)
   └── Vision path  tile screenshot → vision → MD       (canvas/dashboards)
   │
CLEAN    boilerplate strip · dedupe · token compress
   │
OUTPUT   page.md  +  screenshot.png  +  a11y-tree.yml   (the bundle)
```

**Key decisions (from the design discussion):**
- **Mixed / auto-route** — build a router that picks DOM vs vision per page.
- **Screenshot is a required output**, not just a means — it doubles as the
  source for per-region vision crops in the hybrid path.
- **DOM is the markdown source of truth where it has text.** We read the *live,
  rendered* DOM in the content script, so **SSR is irrelevant** — CSR/SPA pages are
  already hydrated when we read them. The vision path is the universal floor for
  canvas / closed-shadow-DOM / image-text / obfuscated pages (anything a human can
  see, we can capture as pixels).
- Extension superpowers to exploit later: `all_frames: true` lets us read
  cross-origin iframes; the existing scroll pass can accumulate DOM to capture
  virtualized/infinite-scroll lists.

### Milestone M1 — DOM → Markdown ✅ DONE (2026-06-27)

First slice of the DOM path. Produces clean Markdown alongside the screenshot.

**What was built:**
- `src/lib/extract.ts` — `extractMarkdown(doc, url)`: clones the document (Readability
  mutates its input), runs `@mozilla/readability` to isolate the main article
  (strips nav/footer/ads), converts to Markdown with `turndown` + `turndown-plugin-gfm`
  (ATX headings, fenced code, GFM tables/strikethrough/task-lists), and normalizes
  blank lines. Falls back to whole-`<body>` conversion when Readability finds no
  article; records `source: "readability" | "fallback"` and `readerable` so the M2
  router can decide DOM-vs-vision.
- `content-script.ts` — new `EXTRACT_MARKDOWN` message → `sendResponse(extractMarkdown(...))`
  (Readability is synchronous, so it replies on the same channel).
- `service-worker.ts` — `requestMarkdown(tabId)` extracts before scrolling/hiding
  elements; `CAPTURE_DONE` now carries `markdown` + `title`.
- `popup.{html,ts,css}` — result panel now offers **Download PNG** + **Download
  Markdown** side-by-side. The `.md` is backed by a `Blob` object URL (revoked on
  replacement); filename is `slugify(title).md`.
- `types.ts` — `ExtractResult` interface; `EXTRACT_MARKDOWN` message; `CAPTURE_DONE`
  extended with `markdown`/`title`.
- Deps added to `extension/package.json`: `@mozilla/readability`, `turndown`,
  `turndown-plugin-gfm`, `@types/turndown`.

**Verification:**
- `npx vitest run extension/src/lib/extract.test.ts` — 6 unit tests pass (headings,
  emphasis, links, GFM tables, nav/footer stripping, canvas-only fallback).
- **Live-verified in real Chrome**: loaded the unpacked extension, served a test
  article page, and called `EXTRACT_MARKDOWN` through the service worker
  (`context.serviceWorkers()[0].evaluate(...)` → `chrome.tabs.sendMessage`). Bundled
  Readability + Turndown run correctly in the content script; all 8 content checks
  passed (clean Markdown, nav/footer stripped, tables/links preserved). This path
  needs **no `activeTab` gesture** (content scripts auto-inject on `<all_urls>`), so
  unlike the screenshot flow it *is* e2e-testable.
- Existing `e2e/extension.spec.ts` still 3/3; popup two-button layout verified live
  via Playwright (forced result panel).
- `/security-review` — **clean, no findings**. Markdown is only ever *downloaded*
  (a `text/markdown` Blob), never rendered as HTML, so no DOM-XSS sink. ⚠️ If a
  future milestone adds an in-popup Markdown **preview**, it must sanitize
  (DOMPurify) or render with HTML disabled — the content is untrusted page HTML.

### Milestone M2 — Page Router ✅ DONE (2026-06-27)

Decides, per page, which pipeline should produce the Markdown: **DOM**, **vision**,
or **hybrid**. This is the routing layer the rest of the web→Markdown pipeline
branches on.

**What was built:**
- `src/lib/route.ts`:
  - `collectSignals(doc, extract): PageSignals` — reads the live DOM for `textLength`
    + `readerable` + `source` (carried from the extract), `canvas/svg/img` counts,
    their **area ratios** (sum of `getBoundingClientRect` area / total page layout
    area, clamped 0–1), combined `visualAreaRatio`, and `linkDensity` (anchor text /
    body text).
  - `decideRoute(signals): RouteDecision` — **pure** (no DOM), so fully unit-testable.
    Ordered rules: (1) text < `DOM_MIN_TEXT` (200) → **vision**; (2) `visualAreaRatio`
    ≥ `VISION_VISUAL_RATIO` (0.6) → **vision**; (3) `visualAreaRatio` ≥
    `HYBRID_VISUAL_RATIO` (0.3) **or** `canvasAreaRatio` ≥ `HYBRID_CANVAS_RATIO`
    (0.1) → **hybrid**; (4) readable + `readability` source → **dom**; (5) else body
    fallback → **dom** (low confidence). Returns `{ path, confidence, reason }`.
- `types.ts` — `RoutePath`, `PageSignals`, `RouteDecision`, `PageAnalysis`; `CAPTURE_DONE`
  extended with `route`.
- `content-script.ts` — `analyzePage()` = `extractMarkdown` + `collectSignals` +
  `decideRoute`; `EXTRACT_MARKDOWN` now returns the full `PageAnalysis`.
- `service-worker.ts` — `requestMarkdown` returns `PageAnalysis`; forwards `route`
  to the popup in `CAPTURE_DONE`.
- `popup.{ts,html,css}` — a colored **route badge** (DOM=blue / Hybrid=purple /
  Vision=amber) with the decision `reason` as its tooltip. Rendered via `textContent`
  + `title` + `dataset` (no HTML sink).

**Verification:**
- `npx vitest run extension/src/lib` — **25/25 pass** (route.test.ts adds 12: every
  `decideRoute` branch + the `DOM_MIN_TEXT` boundary + `collectSignals` counts/link
  density + ratio clamping).
- **Live-verified in real Chrome** (area signals can't be measured in jsdom):
  served 3 HTTP pages and called `EXTRACT_MARKDOWN` through the service worker —
  text article → **DOM** (visualAreaRatio 0.000), full-viewport canvas → **VISION**
  (canvasAreaRatio 1.000), article + chart canvas → **HYBRID** (canvasAreaRatio 0.157).
  All 3 routed correctly. `getBoundingClientRect` area math works under real layout.
- Existing `e2e/extension.spec.ts` still 3/3; `npm run build` + `typecheck` clean.
- `/security-review` — **clean, no findings.** `route.reason` is built only from
  numeric signals (no page text), and the popup badge uses non-HTML sinks.

### Milestone M3 — Hybrid Vision-Assist ✅ DONE (2026-06-27)

For pages the M2 router flags `hybrid` (real text *and* significant visual
regions), detect those regions, crop them from the full-page screenshot, describe
each, and splice the description **inline** where the region sat in the Markdown.

**Decision (this session):** built the deterministic core now behind a
`describeRegion()` provider interface, with a **default no-model describer**
(`metadataDescriber`: figcaption / alt / aria-label, else kind + dimensions) so
the feature ships complete and testable today. A vision/LLM provider plugs into
the same interface later — see "Wiring a vision provider" below.

**What was built:**
- `lib/regions.ts`:
  - `collectRegions(doc)` — finds `canvas / svg / figure / img` regions in the
    live DOM (needs layout for rects), deduped (a `<figure>` represents its inner
    media; nested `<svg>` dropped), size-filtered (`figure` always kept; others
    ≥200×150 CSS px to skip icons), each with a page-coordinate `rect` and a text
    `label` (figcaption / alt / aria-label / svg `<title>`).
  - `injectPlaceholders(clone, regions)` — on the extraction clone (which has no
    layout, so we map regions to clone elements by document-order `sourceIndex`),
    replaces each region element with `<p>TIDREGION<id>ENDREGION</p>` (a pure-
    alphanumeric token that survives Readability and is never escaped by Turndown),
    landing the token **inline** at the region's position.
  - `spliceDescriptions(md, Map<id, desc>)` — swaps each token for its description;
    tokens with no description are stripped and blank lines collapsed (clean fallback).
- `lib/crop.ts` — pure `regionPixelRect(rect, dpr, w, h)` (CSS→device px, clamped
  to image bounds; `null` when a region falls outside the 16384px-capped PNG) +
  `cropRegions(screenshotPng, regions, metrics)` cropping each region via `OffscreenCanvas`.
- `lib/describe.ts` — `RegionDescriber` interface, default `metadataDescriber`
  (emits `> **Chart\|Figure\|Image:** <label or dims>`), and `describeRegions()`
  (pairs each region with its crop, calls the describer sequentially).
- `content-script.ts` — `analyzePage()` routes on the **clean** extraction first
  (so placeholder text never skews M2 signals); only for `hybrid` does it
  `collectRegions`, clone + `injectPlaceholders`, and re-extract with tokens inline.
  Returns `regions` in `PageAnalysis`.
- `service-worker.ts` — after stitching, `describeRegionsInline()` crops → describes
  → splices; best-effort (any failure strips tokens to keep Markdown clean). Forwards
  the region count to the popup.
- `popup.ts` — route badge now appends `· N regions` on hybrid pages (count only —
  no page text rendered).
- `types.ts` — `Region`, `RegionKind`, `RegionRect`, `RegionCrop`; `PageAnalysis.regions`;
  `CAPTURE_DONE.regions` (count).

**Verification:**
- `npx vitest run extension/src/lib` — **45/45 pass** (M3 adds 20: regions 9 —
  detection/dedupe/size-threshold/label, inject+extract integration, splice; crop 6 —
  `regionPixelRect` scaling/clamping/out-of-bounds; describe 5 — `metadataDescriber`
  formats + crop pass-through).
- **Live-verified in real Chrome** (region rects need real layout): served a hybrid
  page (prose + captioned `figure>canvas` + a large labelled `img` + a small icon)
  and called `EXTRACT_MARKDOWN` — routed `hybrid`, detected exactly 2 regions
  (figure + image; icon correctly filtered), labels read from figcaption/alt, rects
  matched real layout (figure 680×421 incl. caption, image 420×300), and both
  placeholder tokens landed inline between the surrounding paragraphs. The post-
  splice output reads e.g. `> **Figure:** Revenue by quarter (FY26)` exactly where
  the chart was. (The full screenshot→crop path can't run headless without the
  `activeTab` toolbar gesture; crop math is unit-tested and the `OffscreenCanvas`
  crop reuses the same pattern `stitch()` already proves in production.)
- `npm run build` + `typecheck` clean; `e2e/extension.spec.ts` still 3/3.
- `/security-review` — **clean, no findings.** Region labels / spliced descriptions
  are untrusted page text but only ever land in the **download-only** Markdown Blob
  (no HTML sink); the badge shows a numeric count; `cropRegions` only fetches the
  extension's own `data:` screenshot (no SSRF). ⚠️ Same caveat as M1 carries forward:
  if a future milestone renders Markdown as HTML in-popup, sanitize it (DOMPurify).

**Wiring a vision provider next (M3b):** implement a `RegionDescriber` that sends
`crop.dataUrl` to a model and returns its text, then pass it instead of
`metadataDescriber` in `service-worker.ts`'s `describeRegionsInline`. Provider
location is still an open decision (no LLM backend/key exists yet): Next.js
`/api/describe` route (key server-side), direct Anthropic from the extension
(user key in storage), or local Ollama (llava). The crop pipeline already feeds
`crop.dataUrl` to the describer, so only the provider body changes.

### Milestone M4 — Clean Stage + Token Report ✅ DONE (2026-06-27)

Strips residual boilerplate from the assembled Markdown and reports the token
savings — the token-economics thesis feature (PLAN.md §4.3 #3).

**Decision (this session):** built the deterministic clean core (high-precision
heuristics, no model) + a token estimate. An aggressive LLM "AI prune" can layer
on top later; the seam is the same `cleanMarkdown` call site in the service worker.

**What was built:**
- `lib/clean.ts` — `cleanMarkdown(md)`:
  - Drops whole-line boilerplate via a curated regex list (cookie/consent banners,
    social-share rows, newsletter CTAs, auth nav, copyright/legal footers,
    `Advertisement`, skip-links) tested against the line with Markdown syntax
    stripped. **Conservative by design** — it never touches headings (`#…`) or
    blockquotes (`>…`, which hold M3 region descriptions), and a "nav bar" line must
    contain ≥4 links to be removed (single reference links survive). Precision over
    recall: leaving a little cruft beats deleting real content.
  - Removes consecutive duplicate lines (repeated headers/footers/items) and
    collapses the blank lines left behind. Returns `{ markdown, removedLines }`.
- `lib/tokens.ts` — `estimateTokens(text)` (whitespace-collapsed `length/4`
  heuristic; labelled `≈` everywhere since the true count is model-specific and
  bundling a BPE tokenizer isn't worth the MBs) + `tokenSavings(before, after)`.
- `service-worker.ts` — after M3 splice: `before = estimateTokens(described)`,
  `cleanMarkdown(described)`, `tokens = tokenSavings(before, estimateTokens(cleaned))`;
  the **cleaned** Markdown is what's downloaded, and `tokens` rides along in `CAPTURE_DONE`.
- `popup.{ts,html,css}` — a token-stats line next to the route badge:
  `≈ 770 tokens · −38% after cleaning` (or just `≈ N tokens` when nothing was
  trimmed). Rendered via `textContent` with numeric values only.
- `types.ts` — `CleanResult`, `TokenStats`; `CAPTURE_DONE.tokens`.

**Verification:**
- `npx vitest run extension/src/lib` — **58/58 pass** (M4 adds 13: clean 6 —
  boilerplate strip, nav-bar vs single-link, heading/blockquote protection,
  consecutive dedupe, no-false-positive on prose like "about cookies", blank-line
  collapse; tokens 7 — estimate ~4 chars/token + whitespace-insensitivity +
  monotonicity, savings math incl. growth-clamped and divide-by-zero).
- **Popup UI live-verified in real Chrome** (the new browser surface): forced the
  result panel into a hybrid `CAPTURE_DONE` state and asserted the route badge and
  token-stats render on one row, correct text, no overflow at 300px width
  (screenshot confirmed). The clean/token *logic* is pure and fully unit-tested;
  the full screenshot→clean path still needs the `activeTab` toolbar gesture
  Playwright can't supply, same constraint as M3.
- `npm run build` + `typecheck` clean; `e2e/extension.spec.ts` still 3/3.
- `/security-review` — **clean, no findings.** `cleanMarkdown`/`tokens` are pure
  string/arithmetic (no DOM, no dynamic `RegExp` from page content); the cleaned
  Markdown stays download-only; the popup stat is `textContent` of numbers.

**Next milestones:** see M5 below, then the bundle upload.

### Milestone M5 — CDP Single-Pass Screenshot ✅ DONE (2026-06-27)

Adds a Chrome DevTools Protocol capture path (`chrome.debugger`) as the **primary**
way to screenshot a page — one compositor pass for the whole page, no scrolling.
This is Strategy A from the capture-quality plan above.

**What was built:**
- `lib/captureCDP.ts` — `captureFullPageCDP(session)`: `attach` → `Page.enable` →
  `Page.getLayoutMetrics` (read `cssContentSize`) → `Page.captureScreenshot({
  format:"png", captureBeyondViewport:true, clip })` → `detach` (in `finally`,
  always). The CDP transport is injected as a `CdpSession`, so the orchestration is
  unit-testable without a browser. Every CDP method name + param is a static
  literal (no page data selects a command — see security note).
- `manifest.json` — added the `"debugger"` permission.
- `service-worker.ts` — `captureScreenshot(tab, metrics)` tries CDP first
  (`cdpSession(tab.id)` wraps `chrome.debugger`); on **any** failure (restricted
  page like `chrome://`/Web Store, DevTools already attached, user declines) it
  falls back to the existing scroll-stitch (which still hides fixed elements).
  Logs which path ran.
- `lib/crop.ts` — **important fix surfaced by M5:** the CDP capture renders at a
  device scale factor that is **not** necessarily `window.devicePixelRatio` (live
  test: capture was 1.5× while `devicePixelRatio` reported 1.0). M3's crop math
  multiplied region rects by `devicePixelRatio`, which would mis-crop CDP shots.
  `cropRegions` now **measures** the scale from `img.width / cssPageWidth`
  (`metrics.scrollWidth`), correct for both CDP and stitch images. `regionPixelRect`
  param renamed `devicePixelRatio` → `scale`.

**Verification:**
- `npx vitest run extension/src/lib` — **63/63 pass** (M5 adds 5: captureCDP —
  command sequence + `captureBeyondViewport`/`clip` from `cssContentSize`,
  detach-always-on-error, `cssContentSize`→`contentSize` fallback, throw on empty
  size, attach-failure short-circuit).
- **Live-verified in real Chrome** (the CDP path needs no `activeTab` gesture, so
  unlike `captureVisibleTab` it *is* drivable headless): captured a tall page
  (60 rows, fixed header) — single-pass image **5208px tall** vs a 720px viewport,
  **uniform** 1.5× scale on both axes, non-empty PNG. This both proves the capture
  and is what flagged the DPR/scale finding above.
- `npm run build` + `typecheck` clean; `e2e/extension.spec.ts` still 3/3 (extension
  loads fine with the `debugger` permission).
- `/security-review` — **clean, no findings.** The `debugger` permission is used in
  a tightly constrained way: static CDP commands only (no `Runtime.evaluate`/eval),
  the debuggee is always the user's own active tab (never page-chosen), detach is
  guaranteed, and the screenshot stays preview/download/crop-only (no network sink).

**Trade-offs / notes:**
- CDP shows the yellow "DevTools is debugging this browser" banner during capture,
  needs the `debugger` permission (scarier install prompt), and can't capture
  `chrome://`/Web Store pages — all handled by the scroll-stitch fallback.
- **Strategy B (harden the scroll-stitch fallback)** is still open — worth doing so
  the no-banner / restricted-page path reaches GoFullPage parity (defects #1–#7).

**Then — bundle upload.** Wire `page.md` + `screenshot.png` (+ a11y tree) into the
authenticated platform upload (PLAN.md §4.4). And the optional **M3b/M4b** LLM
providers (vision describe / AI prune), both gated on the same provider decision.
