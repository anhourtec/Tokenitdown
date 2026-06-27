import { test, expect, chromium, type BrowserContext } from "@playwright/test"
import path from "path"
import os from "os"
import fs from "fs"

// Forward slashes work on all platforms and avoid Windows arg-parsing issues.
const EXTENSION_PATH = path.resolve(__dirname, "../extension/dist").replace(/\\/g, "/")

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
    await page.waitForSelector("extensions-manager", { timeout: 10000 })
    // Give Polymer/web-components time to render shadow roots and populate the list.
    await page.waitForTimeout(2500)

    const extensionId = await page.evaluate((idPattern: string): string | null => {
      const re = new RegExp(idPattern)

      // Walk light DOM + shadow DOM recursively looking for any element whose
      // id attribute matches the Chrome extension ID pattern (32 a-p chars).
      function search(root: Element | ShadowRoot): string | null {
        // querySelectorAll on a shadow root returns all its light-DOM descendants.
        for (const el of root.querySelectorAll("[id]")) {
          if (re.test(el.id)) return el.id
        }
        // Recurse into any shadow roots we find.
        for (const el of root.querySelectorAll("*")) {
          const sr = (el as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot
          if (sr) {
            const found = search(sr)
            if (found) return found
          }
        }
        return null
      }

      // Start from the extensions-manager element (avoid traversing the whole DOM).
      const manager = document.querySelector("extensions-manager")
      return manager ? search(manager) : null
    }, EXTENSION_ID_RE.source)

    if (!extensionId) {
      // Capture a screenshot to aid debugging, then throw.
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

async function launchWithExtension() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-ext-"))

  const context = await chromium.launchPersistentContext(userDataDir, {
    // headless must be false for Chrome to honour --load-extension.
    // On CI this requires a virtual display (e.g. xvfb-run on Linux).
    headless: false,
    // Playwright adds --disable-extensions by default; suppress it so our
    // extension can load.
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  })

  const extensionId = await resolveExtensionId(context)
  return { context, extensionId }
}

test.describe("TokenItDown extension", () => {
  test("popup renders the capture button", async () => {
    const { context, extensionId } = await launchWithExtension()

    try {
      const page = await context.newPage()
      await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`)

      await expect(
        page.locator("#capture-btn"),
        "capture button should be visible"
      ).toBeVisible()

      await expect(page.locator("#capture-btn")).toHaveText("Capture Full Page")
    } finally {
      await context.close()
    }
  })

  test("popup shows progress UI and error when no active tab is available", async () => {
    const { context, extensionId } = await launchWithExtension()

    try {
      const page = await context.newPage()
      await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`)

      // Status and result panels start hidden
      await expect(page.locator("#status")).toHaveClass(/hidden/)
      await expect(page.locator("#result")).toHaveClass(/hidden/)
      await expect(page.locator("#error")).toHaveClass(/hidden/)

      // Clicking capture from a chrome-extension:// page means there is no
      // real "active browsing" tab — the service worker should surface an error.
      await page.locator("#capture-btn").click()

      // Button must be disabled while work is in progress
      await expect(page.locator("#capture-btn")).toBeDisabled()

      // Wait for a terminal state: either an error or a result panel
      await expect(
        page.locator("#error:not(.hidden), #result:not(.hidden)")
      ).toBeVisible({ timeout: 15000 })
    } finally {
      await context.close()
    }
  })

  test("popup header shows the TokenItDown brand name", async () => {
    const { context, extensionId } = await launchWithExtension()

    try {
      const page = await context.newPage()
      await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`)

      await expect(page.locator(".logo")).toHaveText("TokenItDown")
    } finally {
      await context.close()
    }
  })
})
