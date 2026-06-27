import type { WorkerToContentMessage } from "./types";

// Tracks elements we hid so we can restore them
let hiddenElements: Array<{ el: HTMLElement; prevVisibility: string }> = [];

chrome.runtime.onMessage.addListener(
  (msg: WorkerToContentMessage, _sender, sendResponse) => {
    switch (msg.type) {
      case "GET_PAGE_METRICS":
        sendResponse(null); // ack — metrics come back via sendMessage
        chrome.runtime.sendMessage({
          type: "PAGE_METRICS",
          metrics: getPageMetrics(),
        });
        break;

      case "SCROLL_TO":
        window.scrollTo({ top: msg.y, behavior: "instant" });
        // Wait one rAF + settle time before confirming so lazy images have a
        // chance to start loading before the service worker captures the frame.
        requestAnimationFrame(() => {
          chrome.runtime.sendMessage({ type: "SCROLL_DONE", y: msg.y });
        });
        break;

      case "HIDE_FIXED_ELEMENTS":
        hideFixedElements();
        chrome.runtime.sendMessage({ type: "FIXED_HIDDEN" });
        break;

      case "RESTORE_FIXED_ELEMENTS":
        restoreFixedElements();
        chrome.runtime.sendMessage({ type: "FIXED_RESTORED" });
        break;
    }
    return true; // keep message channel open for async sendResponse
  }
);

function getPageMetrics() {
  return {
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio,
  };
}

function hideFixedElements() {
  const all = Array.from(document.querySelectorAll<HTMLElement>("*"));
  hiddenElements = [];

  for (const el of all) {
    const style = window.getComputedStyle(el);
    if (style.position === "fixed" || style.position === "sticky") {
      hiddenElements.push({ el, prevVisibility: el.style.visibility });
      el.style.visibility = "hidden";
    }
  }
}

function restoreFixedElements() {
  for (const { el, prevVisibility } of hiddenElements) {
    el.style.visibility = prevVisibility;
  }
  hiddenElements = [];
}
