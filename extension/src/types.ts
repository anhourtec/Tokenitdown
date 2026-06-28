// Shared message types between popup, service worker, and content script

export interface PageMetrics {
  scrollHeight: number;
  scrollWidth: number;
  viewportHeight: number;
  viewportWidth: number;
  devicePixelRatio: number;
}

export interface CapturedFrame {
  dataUrl: string;
  scrollY: number;
}

/**
 * Result of converting a page's DOM to Markdown. `source` records which path
 * produced it — `readability` (main-article extraction) or `fallback` (whole
 * body). The router will later use `source`/`textLength` to decide whether the
 * DOM result is sufficient or the page should go to the vision path.
 */
export interface ExtractResult {
  markdown: string;
  title: string;
  byline: string | null;
  excerpt: string | null;
  textLength: number;
  url: string;
  source: "readability" | "fallback";
  readerable: boolean;
}

// Popup → Service Worker
export type PopupMessage =
  | { type: "START_CAPTURE" }
  | { type: "CANCEL_CAPTURE" };

// Service Worker → Popup
export type WorkerMessage =
  | { type: "CAPTURE_PROGRESS"; frame: number; total: number }
  | { type: "CAPTURE_DONE"; dataUrl: string; markdown: string; title: string }
  | { type: "CAPTURE_ERROR"; error: string };

// Service Worker → Content Script
export type WorkerToContentMessage =
  | { type: "GET_PAGE_METRICS" }
  | { type: "SCROLL_TO"; y: number }
  | { type: "HIDE_FIXED_ELEMENTS" }
  | { type: "RESTORE_FIXED_ELEMENTS" }
  | { type: "EXTRACT_MARKDOWN" };

// Content Script → Service Worker
export type ContentToWorkerMessage =
  | { type: "PAGE_METRICS"; metrics: PageMetrics }
  | { type: "SCROLL_DONE"; y: number }
  | { type: "FIXED_HIDDEN" }
  | { type: "FIXED_RESTORED" };
