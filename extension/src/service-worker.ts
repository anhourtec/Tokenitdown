import type {
  CapturedFrame,
  ContentToWorkerMessage,
  PageAnalysis,
  PageMetrics,
  PopupMessage,
  WorkerMessage,
  WorkerToContentMessage,
} from "./types";
import { stitch } from "./lib/stitch";
import { captureFrames } from "./lib/screenshot";
import { captureFullPageCDP, type CdpSession } from "./lib/captureCDP";
import { cropRegions } from "./lib/crop";
import { describeRegions, metadataDescriber } from "./lib/describe";
import { spliceDescriptions } from "./lib/regions";
import { cleanMarkdown } from "./lib/clean";
import { estimateTokens, tokenSavings } from "./lib/tokens";

// Delay between scroll and capture to let lazy-loaded content settle
const SCROLL_SETTLE_MS = 150;

let activeTabId: number | null = null;
let popupPort: chrome.runtime.Port | null = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "popup") return;
  popupPort = port;
  port.onDisconnect.addListener(() => {
    popupPort = null;
  });
  port.onMessage.addListener((msg: PopupMessage) => {
    if (msg.type === "START_CAPTURE") handleStartCapture();
    if (msg.type === "CANCEL_CAPTURE") handleCancel();
  });
});

function sendToPopup(msg: WorkerMessage) {
  popupPort?.postMessage(msg);
}

function sendToContent(tabId: number, msg: WorkerToContentMessage) {
  return chrome.tabs.sendMessage(tabId, msg);
}

async function handleStartCapture() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    sendToPopup({ type: "CAPTURE_ERROR", error: "No active tab found." });
    return;
  }

  activeTabId = tab.id;

  try {
    // The build emits the content script at dist/src/content-script.js, so the
    // injected path must include the src/ prefix (matches manifest content_scripts).
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/content-script.js"],
    });

    // Get page dimensions
    const metrics = await requestPageMetrics(tab.id);

    // Extract Markdown + route the page (M2) from the live DOM before we start
    // scrolling/hiding elements, so the analysis sees the page in its natural state.
    const analysis = await requestMarkdown(tab.id);

    // M5 — capture the full page (CDP single-pass primary, scroll-stitch fallback).
    const dataUrl = await captureScreenshot(tab, metrics);

    // M3 — on hybrid pages, crop each visual region from the screenshot, describe
    // it, and splice the description into the Markdown where its placeholder sits.
    const described = await describeRegionsInline(
      analysis.extract.markdown,
      analysis.regions,
      dataUrl,
      metrics
    );

    // M4 — strip residual boilerplate and report the token savings.
    const before = estimateTokens(described);
    const { markdown } = cleanMarkdown(described);
    const tokens = tokenSavings(before, estimateTokens(markdown));

    sendToPopup({
      type: "CAPTURE_DONE",
      dataUrl,
      markdown,
      title: analysis.extract.title,
      route: analysis.route,
      regions: analysis.regions.length,
      tokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendToPopup({ type: "CAPTURE_ERROR", error: message });

    // Best-effort restore
    if (activeTabId) {
      sendToContent(activeTabId, { type: "RESTORE_FIXED_ELEMENTS" }).catch(
        () => {}
      );
    }
  } finally {
    activeTabId = null;
  }
}

function handleCancel() {
  // TODO: implement cancellation via AbortSignal in Phase 2
  activeTabId = null;
}

/**
 * Produces the full-page PNG. M5: tries the CDP single-pass capture first (no
 * seams, captures fixed headers, single DPR pass); on any failure — restricted
 * page, DevTools already attached, user-declined — falls back to the
 * scroll-and-stitch path (which hides fixed elements to avoid duplicating them).
 */
async function captureScreenshot(
  tab: chrome.tabs.Tab,
  metrics: PageMetrics
): Promise<string> {
  const tabId = tab.id!;

  try {
    const { dataUrl } = await captureFullPageCDP(cdpSession(tabId));
    console.log("[TokenItDown] capture path: CDP single-pass");
    return dataUrl;
  } catch (err) {
    console.warn(
      "[TokenItDown] CDP capture unavailable, falling back to scroll-stitch:",
      err
    );
  }

  await sendToContent(tabId, { type: "HIDE_FIXED_ELEMENTS" });
  const frames = await captureFrames({
    tabId,
    metrics,
    settleMs: SCROLL_SETTLE_MS,
    onProgress: (frame, total) =>
      sendToPopup({ type: "CAPTURE_PROGRESS", frame, total }),
    scrollTo: (y) => sendToContent(tabId, { type: "SCROLL_TO", y }),
    waitForScrollDone: () => waitForScrollDone(tabId),
    captureTab: () =>
      chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }),
  });
  await sendToContent(tabId, { type: "RESTORE_FIXED_ELEMENTS" });
  await sendToContent(tabId, { type: "SCROLL_TO", y: 0 });

  console.log("[TokenItDown] capture path: scroll-stitch");
  return stitch(frames, metrics);
}

/** A `CdpSession` backed by `chrome.debugger` for the given tab. */
function cdpSession(tabId: number): CdpSession {
  const target: chrome.debugger.Debuggee = { tabId };
  return {
    attach: () => chrome.debugger.attach(target, "1.3"),
    // Swallow detach errors — by the time we detach the capture already
    // succeeded or failed, and a missing attachment is not actionable.
    detach: () => chrome.debugger.detach(target).catch(() => {}),
    send: <T>(method: string, params?: object) =>
      chrome.debugger.sendCommand(target, method, params) as Promise<T>,
  };
}

function requestPageMetrics(tabId: number): Promise<PageMetrics> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out waiting for page metrics")),
      5000
    );

    function listener(msg: ContentToWorkerMessage, sender: chrome.runtime.MessageSender) {
      if (sender.tab?.id !== tabId) return;
      if (msg.type === "PAGE_METRICS") {
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(msg.metrics);
      }
    }

    chrome.runtime.onMessage.addListener(listener);
    sendToContent(tabId, { type: "GET_PAGE_METRICS" });
  });
}

/**
 * Crops each region from the full-page screenshot, describes it (default
 * metadata describer — a vision provider plugs into the same interface), and
 * splices the descriptions into the Markdown at their placeholders. Best-effort:
 * on any failure, placeholders are stripped so the Markdown is still clean.
 */
async function describeRegionsInline(
  markdown: string,
  regions: PageAnalysis["regions"],
  screenshotDataUrl: string,
  metrics: PageMetrics
): Promise<string> {
  if (regions.length === 0) return markdown;
  try {
    // Scale is derived inside cropRegions from the image width vs this CSS width,
    // so it's correct for both the CDP and stitch screenshots.
    const crops = await cropRegions(screenshotDataUrl, regions, metrics.scrollWidth);
    const cropById = new Map(crops.map((c) => [c.id, c]));
    const descriptions = await describeRegions(regions, cropById, metadataDescriber);
    return spliceDescriptions(markdown, descriptions);
  } catch (err) {
    console.warn("[TokenItDown] region description failed:", err);
    return spliceDescriptions(markdown, new Map());
  }
}

function requestMarkdown(tabId: number): Promise<PageAnalysis> {
  // The content script replies synchronously via sendResponse, so the
  // chrome.tabs.sendMessage promise resolves with the PageAnalysis directly.
  return sendToContent(tabId, { type: "EXTRACT_MARKDOWN" }) as Promise<PageAnalysis>;
}

function waitForScrollDone(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timed out waiting for scroll")),
      3000
    );

    function listener(msg: ContentToWorkerMessage, sender: chrome.runtime.MessageSender) {
      if (sender.tab?.id !== tabId) return;
      if (msg.type === "SCROLL_DONE") {
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve();
      }
    }

    chrome.runtime.onMessage.addListener(listener);
  });
}

export type { CapturedFrame };
