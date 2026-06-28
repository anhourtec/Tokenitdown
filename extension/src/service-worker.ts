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
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content-script.js"],
    });

    // Get page dimensions
    const metrics = await requestPageMetrics(tab.id);

    // Extract Markdown + route the page (M2) from the live DOM before we start
    // scrolling/hiding elements, so the analysis sees the page in its natural state.
    const analysis = await requestMarkdown(tab.id);

    // Hide fixed elements so they don't repeat in every frame
    await sendToContent(tab.id, { type: "HIDE_FIXED_ELEMENTS" });

    // Capture all frames by scrolling top to bottom
    const frames = await captureFrames({
      tabId: tab.id,
      metrics,
      settleMs: SCROLL_SETTLE_MS,
      onProgress: (frame, total) =>
        sendToPopup({ type: "CAPTURE_PROGRESS", frame, total }),
      scrollTo: (y) => sendToContent(tab.id!, { type: "SCROLL_TO", y }),
      waitForScrollDone: () => waitForScrollDone(tab.id!),
      captureTab: () =>
        chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }),
    });

    // Restore fixed elements and scroll position
    await sendToContent(tab.id, { type: "RESTORE_FIXED_ELEMENTS" });
    await sendToContent(tab.id, { type: "SCROLL_TO", y: 0 });

    // Stitch frames into a single PNG
    const dataUrl = await stitch(frames, metrics);

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
    const crops = await cropRegions(screenshotDataUrl, regions, metrics);
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
