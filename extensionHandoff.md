# Extension Testing Handoff

**Last updated:** 2026-06-26 (updated after Step 1 attempt)
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

## Current Status — Chrome launch broken (needs diagnosis)

| Item | Status |
|------|--------|
| `extension/manifest.json` — service worker format fix | ✅ Fixed (`"type": "module"` removed) |
| `extension/src/icons/` — placeholder PNG icons | ✅ Created (1×1 minimal PNG for 16/32/48/128px) |
| `extension/src/lib/screenshot.test.ts` — 7 unit tests | ✅ All pass |
| `e2e/extension.spec.ts` — 3 Playwright e2e tests | ❌ Failing — Chrome exits before tests run (see below) |
| `playwright.extension.config.ts` + npm script | ✅ In place |

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

### Step 0 — Fix the Chrome launch crash (urgent)
Try Option 1 (downgrade Playwright) or Option 2 (use system Chrome). Confirm `npm run e2e:extension` shows 3/3 passing before anything else.

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
Replace the 1×1 placeholder PNGs with actual branded icons (16, 32, 48, 128px).

### Step 5 — CI support
The Playwright extension tests require `headless: false`. On Linux CI this needs `xvfb-run`. The extension tests are excluded from the main Playwright config (`playwright.config.ts`) — they need a separate CI job or `xvfb-run` wrapper.
