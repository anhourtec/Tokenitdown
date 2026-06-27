import type {
  CapturedFrame,
  ContentToWorkerMessage,
  PageMetrics,
  PopupMessage,
  WorkerMessage,
  WorkerToContentMessage,
} from "./types";
import { stitch } from "./lib/stitch";
import { captureFrames } from "./lib/screenshot";

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

    sendToPopup({ type: "CAPTURE_DONE", dataUrl });
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
