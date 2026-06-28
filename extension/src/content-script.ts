import type { PageAnalysis, Region, WorkerToContentMessage } from "./types";
import { extractMarkdown } from "./lib/extract";
import { collectSignals, decideRoute } from "./lib/route";
import { collectRegions, injectPlaceholders } from "./lib/regions";

// This script auto-injects via the manifest (`<all_urls>`) AND the service worker
// re-injects it on capture (to cover tabs opened before the extension loaded).
// Both land in the same isolated world sharing `window`, so register the message
// listener only once — otherwise every request would be handled (and answered)
// twice. Redefining the helper functions below on a second injection is harmless.
declare global {
  interface Window {
    __tokenitdownContentLoaded?: boolean;
  }
}

// Tracks elements we hid so we can restore them
let hiddenElements: Array<{ el: HTMLElement; prevVisibility: string }> = [];

if (!window.__tokenitdownContentLoaded) {
  window.__tokenitdownContentLoaded = true;
  chrome.runtime.onMessage.addListener(handleMessage);
}

function handleMessage(
  msg: WorkerToContentMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) {
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

      case "EXTRACT_MARKDOWN":
        // Readability runs synchronously against the live DOM, so we can reply
        // on this message channel directly via sendResponse.
        sendResponse(analyzePage());
        break;

      case "GET_PAGE_HTML":
        // The live, hydrated outer HTML — what the platform's markitdown
        // converter receives (so SPA/auth-gated/dynamic content is included).
        sendResponse({
          html: document.documentElement.outerHTML,
          title: document.title,
          url: location.href,
        });
        break;
  }
  return true; // keep message channel open for async sendResponse
}

/**
 * Extracts the page's Markdown, scores it against DOM signals, and routes it to
 * the DOM / vision / hybrid pipeline (M2). On a `hybrid` page it also finds the
 * visual regions and re-extracts with inline placeholder tokens at each region's
 * position (M3), so the service worker can splice in descriptions after cropping.
 * Returned to the service worker as the `EXTRACT_MARKDOWN` response.
 */
function analyzePage(): PageAnalysis {
  const extract = extractMarkdown(document, location.href);
  const signals = collectSignals(document, extract);
  const route = decideRoute(signals);

  // Routing is decided on the clean extraction above; only hybrid pages need the
  // region pass, so the placeholder text never contaminates the routing signals.
  let regions: Region[] = [];
  let markdown = extract.markdown;
  if (route.path === "hybrid") {
    regions = collectRegions(document);
    if (regions.length > 0) {
      const clone = document.cloneNode(true) as Document;
      injectPlaceholders(clone, regions);
      markdown = extractMarkdown(clone, location.href).markdown;
    }
  }

  return { extract: { ...extract, markdown }, signals, route, regions };
}

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
