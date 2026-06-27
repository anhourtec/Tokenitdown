# Extension Testing Handoff

**Last updated:** 2026-06-26
**Branch:** `extension`
**Scope:** Testing the Chrome extension (`extension/`) — what was done, what works, what's still unverified, and exactly where to continue.

---

## What Exists in the Extension

The Chrome MV3 extension lives entirely under `extension/`. It captures a full-page screenshot by scrolling the active tab, stitching viewport-sized frames into a single PNG.

### Entry points (all built by Vite)

| File | Purpose |
|------|---------|
| `src/popup/popup.ts` + `popup.html` + `popup.css` | Extension popup UI: capture button, progress bar, preview image, download link, error display |
| `src/service-worker.ts` | Background worker — receives `START_CAPTURE` from the popup, orchestrates scroll → capture → stitch |
| `src/content-script.ts` | Injected into every page — responds to scroll/metrics/hide-fixed messages from the service worker |
| `src/lib/screenshot.ts` | Pure logic: `captureFrames()` — scrolls top-to-bottom in viewport steps, calls injected callbacks |
| `src/lib/stitch.ts` | Pure logic: `stitch()` — composites frames onto an `OffscreenCanvas`, returns a PNG data URL |
| `src/types.ts` | Shared message type definitions (pure TypeScript interfaces, no Chrome API usage) |

### Build
```bash
cd extension && npm run build     # rebuilds dist/
cd extension && npm run typecheck # zero TS errors
```

---

## What Was Done This Session

### 1. Root project `npm install` — was missing
`node_modules/` didn't exist in the project root. Ran `npm install` (1712 packages). All downstream commands (Vitest, Playwright) now work from the root.

### 2. Fixed the service worker build format (the core bug)

**Problem:** `extension/manifest.json` declared `"type": "module"` for the background service worker, but `vite-plugin-web-extension` v4 always builds service worker scripts with `format: "iife"` (self-executing function). The declaration and the actual output were inconsistent.

**Root cause found:** In `vite-plugin-web-extension/dist/index.js`, `getIndividualConfig()` hardcodes `formats: ["iife"]` for all script entries and passes it as the second arg to `vite.mergeConfig(baseConfig, inputConfig)` — the second arg wins, so `scriptViteConfig` cannot override it. The plugin always produces IIFE output regardless of `"type": "module"` in the manifest.

**Fix applied:** Removed `"type": "module"` from `extension/manifest.json`:
```json
// before
"background": { "service_worker": "src/service-worker.ts", "type": "module" }

// after
"background": { "service_worker": "src/service-worker.ts" }
```

Chrome now loads the service worker as a classic script, which is fully compatible with the IIFE bundle Vite produces. No functional change — all imports are resolved at build time, so neither ES module syntax nor `importScripts()` is needed at runtime.

### 3. Unit tests for `captureFrames` — 7 tests, all pass

Written at `extension/src/lib/screenshot.test.ts`, run via root Vitest:
```bash
npm run test -- run extension/src/lib/screenshot.test.ts
```

Covers: frame count for multi-viewport pages, single-frame pages, exact two-viewport pages, `onProgress` counts, `scrollTo` Y offsets (including bottom-snap logic), `dataUrl` storage, `waitForScrollDone` call count.

`stitch.ts` is NOT unit-tested — it requires `OffscreenCanvas` which jsdom doesn't support. Needs a real browser context.

### 4. Playwright extension infrastructure added

New files:
- `e2e/extension.spec.ts` — 3 tests: popup renders capture button, progress/error state after click, brand name in header
- `playwright.extension.config.ts` — Playwright config without Next.js web server requirement
- Added `"e2e:extension": "playwright test --config=playwright.extension.config.ts"` to `package.json`

Run with:
```bash
npm run e2e:extension
```

### 5. Root cause of Playwright extension loading failure — FOUND AND FIXED

**Problem:** `chrome://extensions/` was showing an empty list even with `--load-extension` passed.

**Root cause:** Playwright adds `--disable-extensions` to its default Chrome launch args (in `playwright-core/lib/coreBundle.js` line ~34456). This flag suppresses ALL extensions, overriding `--load-extension`.

**Fix applied** in `e2e/extension.spec.ts`:
```ts
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  ignoreDefaultArgs: ["--disable-extensions"],  // ← the key fix
  args: [
    `--disable-extensions-except=${EXTENSION_PATH}`,
    `--load-extension=${EXTENSION_PATH}`,
  ],
})
```

**Additional fixes in the same file:**
- Paths use forward slashes (`.replace(/\\/g, "/")`) to avoid Windows arg-parsing edge cases
- `resolveExtensionId()` reads the extension ID from `chrome://extensions/` shadow DOM instead of waiting for a `serviceworker` event (which Playwright does not fire for Chrome extension workers)
- `waitForSelector("extensions-manager")` instead of `waitForLoadState("domcontentloaded")` (chrome:// pages don't emit standard load events)

---

## Current Status

| Item | Status |
|------|--------|
| `extension/manifest.json` — service worker format fix | ✅ Fixed and rebuilt |
| `extension/src/lib/screenshot.test.ts` — 7 unit tests | ✅ All pass |
| `e2e/extension.spec.ts` — 3 Playwright tests | ⚠️ Infrastructure complete, tests **not yet re-run** after `ignoreDefaultArgs` fix |
| Playwright config + npm script | ✅ In place |

---

## What to Do Next

### Step 1 — Run and confirm the Playwright tests pass

```bash
npm run e2e:extension
```

If they pass, all three extension tests cover:
1. Popup capture button visible and labelled correctly
2. Button disables and error/result appears when capture is clicked from extension page
3. Header shows "TokenItDown" brand

If they still fail, read the new debug screenshot at `test-results/extensions-page-debug.png` to see what `chrome://extensions/` shows. With `ignoreDefaultArgs: ["--disable-extensions"]` in place, the extension should now appear in the list.

### Step 2 — Missing icon files

`manifest.json` references icons that don't exist: `src/icons/icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`. Chrome loads the extension without them but shows a broken toolbar icon. Create real (or 1×1 placeholder) PNGs at those paths.

### Step 3 — Test the full capture flow

Once the popup loads in Playwright:
1. Navigate to a page with controlled height (`data:text/html,...` or a simple static page)
2. Click "Capture Full Page"
3. Verify a PNG preview appears and the download link works

### Step 4 — Unit test `stitch.ts`

`stitch()` uses `OffscreenCanvas` + `createImageBitmap` which jsdom doesn't support. Options:
- Test via `page.evaluate()` in a Playwright test (real browser context)
- Or a dedicated Playwright test that injects a minimal stitch call and checks canvas dimensions

### Step 5 — Security review
Run `/security-review` on the extension source before shipping.

---

## Key Technical Facts

- **Why IIFE and not ESM?** `vite-plugin-web-extension@4.x` always builds scripts as IIFE. It merges `formats: ["iife"]` as the override arg to `mergeConfig`, so `scriptViteConfig` cannot change it.
- **Why `ignoreDefaultArgs`?** Playwright hardcodes `--disable-extensions` in its Chrome default args. Without `ignoreDefaultArgs: ["--disable-extensions"]`, `--load-extension` is silently ignored.
- **Why not `waitForEvent('serviceworker')`?** Playwright's `serviceworker` event fires for web page service workers registered via `navigator.serviceWorker.register()`. Chrome extension service workers are registered by the browser itself and do not emit this event in Playwright contexts.
- **Why `chrome://extensions/` shadow DOM?** The extensions page uses Polymer/web-components with multiple nested shadow roots. The extension ID is the `id` attribute of the `extensions-item` element, found by recursively walking shadow roots.

---

## Files Changed / Created This Session

| File | Change |
|------|--------|
| `extension/manifest.json` | Removed `"type": "module"` from background service worker |
| `extension/src/lib/screenshot.test.ts` | **New** — 7 unit tests for `captureFrames`, all pass |
| `e2e/extension.spec.ts` | **New** — 3 Playwright extension tests |
| `playwright.extension.config.ts` | **New** — Playwright config for extension tests (no web server) |
| `package.json` | Added `"e2e:extension"` script |
| `extensionHandoff.md` | **This file** |
