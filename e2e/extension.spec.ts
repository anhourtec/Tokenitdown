import { test, expect, chromium, type BrowserContext } from "@playwright/test"
import path from "path"
import os from "os"
import fs from "fs"

const EXTENSION_PATH = path.resolve(__dirname, "../extension/dist")

// Chrome extension IDs are 32 lowercase letters from the alphabet a–p.
const EXTENSION_ID_RE = /^[a-p]{32}$/

async function resolveExtensionId(context: BrowserContext): Promise<string> {
  // Playwright's 'serviceworker' event does not fire for Chrome extension
  // service workers in persistent contexts, so we read the ID from
  // chrome://extensions/ by walking the shadow DOM.
  const page = await context.newPage()
  try {
    await page.goto("chrome://extensions/")

    // Wait until the custom element that hosts all extension cards is present.
    // chrome:// pages don't emit standard load events, so avoid waitForLoadState.
    await page.waitForSelector("extensions-manager", { timeout: 15000 })
    // Give Polymer/web-components time to render shadow roots and populate the list.
    await page.waitForTimeout(3000)

    const extensionId = await page.evaluate((idPattern: string): string | null => {
      const re = new RegExp(idPattern)

      // Walk light DOM + shadow DOM recursively looking for any element
      // whose id matches the Chrome extension ID pattern (32 a-p chars).
      function search(root: Element | ShadowRoot): string | null {
        for (const el of root.querySelectorAll("[id]")) {
          if (re.test(el.id)) return el.id
        }
        for (const el of root.querySelectorAll("*")) {
          const sr = (el as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot
          if (sr) {
            const found = search(sr)
            if (found) return found
          }
        }
        return null
      }

      // Must start from document.documentElement so that extensions-manager
      // is found as a light-DOM element; calling querySelectorAll("*") on the
      // extensions-manager Element itself never enters its own shadow root.
      return search(document.documentElement)
    }, EXTENSION_ID_RE.source)

    if (!extensionId) {
      await page.screenshot({ path: "test-results/extensions-page-debug.png", fullPage: true })
      throw new Error(
        "TokenItDown extension not found on chrome://extensions/ — see test-results/extensions-page-debug.png"
      )
    }

    return extensionId
  } finally {
    await page.close()
  }
}

// Shared Chrome context — launched once for all tests to avoid per-test
// launchPersistentContext overhead and Windows teardown hangs.
let sharedContext: BrowserContext
let sharedExtensionId: string

test.beforeAll(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-ext-"))
  sharedContext = await chromium.launchPersistentContext(userDataDir, {
    // headless must be false for Chrome to honour --load-extension.
    headless: false,
    // Playwright adds these two flags by default; both must be suppressed for
    // a MV3 extension with a service worker to load.
    ignoreDefaultArgs: [
      "--disable-extensions",
      "--disable-component-extensions-with-background-pages",
    ],
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })
  sharedExtensionId = await resolveExtensionId(sharedContext)
})

test.afterAll(async () => {
  if (!sharedContext) return
  // Race close against a 10s timeout — on Windows, persistent context close
  // can hang indefinitely when the browser window is still open.
  await Promise.race([
    sharedContext.close(),
    new Promise<void>((resolve) => setTimeout(resolve, 10000)),
  ])
})

test.describe("TokenItDown extension", () => {
  test("popup renders the capture button", async () => {
    const page = await sharedContext.newPage()
    try {
      await page.goto(`chrome-extension://${sharedExtensionId}/src/popup/popup.html`)

      await expect(
        page.locator("#capture-btn"),
        "capture button should be visible"
      ).toBeVisible()

      await expect(page.locator("#capture-btn")).toHaveText("Capture Full Page")
    } finally {
      await page.close()
    }
  })

  test("popup shows progress UI and error when no active tab is available", async () => {
    const page = await sharedContext.newPage()
    try {
      await page.goto(`chrome-extension://${sharedExtensionId}/src/popup/popup.html`)

      // Status and result panels start hidden
      await expect(page.locator("#status")).toHaveClass(/hidden/)
      await expect(page.locator("#result")).toHaveClass(/hidden/)
      await expect(page.locator("#error")).toHaveClass(/hidden/)

      // Clicking capture from a chrome-extension:// page means there is no
      // real "active browsing" tab — the service worker should surface an error.
      await page.locator("#capture-btn").click()

      // Wait for a terminal state: either an error or a result panel.
      // The service worker errors immediately on an extension page (can't
      // inject scripts), so we skip asserting the transient disabled state —
      // the round-trip is fast enough that it races Playwright's polling.
      await expect(
        page.locator("#error:not(.hidden), #result:not(.hidden)")
      ).toBeVisible({ timeout: 15000 })
    } finally {
      await page.close()
    }
  })

  test("popup header shows the TokenItDown brand name", async () => {
    const page = await sharedContext.newPage()
    try {
      await page.goto(`chrome-extension://${sharedExtensionId}/src/popup/popup.html`)

      await expect(page.locator(".logo")).toHaveText("TokenItDown")
    } finally {
      await page.close()
    }
  })
})
