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

// Popup → Service Worker
export type PopupMessage =
  | { type: "START_CAPTURE" }
  | { type: "CANCEL_CAPTURE" };

// Service Worker → Popup
export type WorkerMessage =
  | { type: "CAPTURE_PROGRESS"; frame: number; total: number }
  | { type: "CAPTURE_DONE"; dataUrl: string }
  | { type: "CAPTURE_ERROR"; error: string };

// Service Worker → Content Script
export type WorkerToContentMessage =
  | { type: "GET_PAGE_METRICS" }
  | { type: "SCROLL_TO"; y: number }
  | { type: "HIDE_FIXED_ELEMENTS" }
  | { type: "RESTORE_FIXED_ELEMENTS" };

// Content Script → Service Worker
export type ContentToWorkerMessage =
  | { type: "PAGE_METRICS"; metrics: PageMetrics }
  | { type: "SCROLL_DONE"; y: number }
  | { type: "FIXED_HIDDEN" }
  | { type: "FIXED_RESTORED" };
