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

/** Which pipeline should produce the final Markdown for a page (M2 router). */
export type RoutePath = "dom" | "vision" | "hybrid";

/**
 * Numeric/boolean signals describing a page, computed from the live DOM. Fed to
 * the pure router (`decideRoute`). Visual-area ratios are fractions of the total
 * page layout area covered by each element type (0–1).
 */
export interface PageSignals {
  textLength: number;
  readerable: boolean;
  extractSource: "readability" | "fallback";
  /** Anchor text / total body text — a nav/boilerplate indicator (0–1). */
  linkDensity: number;
  canvasCount: number;
  svgCount: number;
  imgCount: number;
  canvasAreaRatio: number;
  svgAreaRatio: number;
  imgAreaRatio: number;
  /** Combined visual coverage, clamped to [0,1]. */
  visualAreaRatio: number;
}

/** The router's decision for a page. */
export interface RouteDecision {
  path: RoutePath;
  /** Rough confidence in the decision (0–1). */
  confidence: number;
  /** Human-readable explanation, surfaced in the popup. */
  reason: string;
}

/** A visual region (chart/canvas/figure/image) identified on a `hybrid` page,
 *  to be cropped from the screenshot and described inline (M3). */
export type RegionKind = "canvas" | "svg" | "figure" | "image";

/** A region's box in CSS pixels, in page coordinates (includes scroll offset). */
export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Region {
  /** Stable id used in the Markdown placeholder token and to match its crop. */
  id: number;
  /** Index of this region's element among all region candidates in document
   *  order — used to find the same element in the (layout-less) extraction
   *  clone when injecting placeholders. */
  sourceIndex: number;
  kind: RegionKind;
  rect: RegionRect;
  /** Best available text label (figcaption / alt / aria-label / svg <title>). */
  label: string | null;
}

/** A region cropped out of the full-page screenshot, in device pixels. */
export interface RegionCrop {
  id: number;
  /** `data:image/png;base64,...` of just this region. */
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Full analysis of a page returned by the content script's `EXTRACT_MARKDOWN`
 * handler: the DOM extraction plus the signals it was scored on, the routing
 * decision, and — on `hybrid` pages — the visual regions whose placeholders are
 * embedded inline in `extract.markdown` (M3). Downstream M4 (clean) consumes these.
 */
export interface PageAnalysis {
  extract: ExtractResult;
  signals: PageSignals;
  route: RouteDecision;
  regions: Region[];
}

// Popup → Service Worker
export type PopupMessage =
  | { type: "START_CAPTURE" }
  | { type: "CANCEL_CAPTURE" };

// Service Worker → Popup
export type WorkerMessage =
  | { type: "CAPTURE_PROGRESS"; frame: number; total: number }
  | {
      type: "CAPTURE_DONE";
      dataUrl: string;
      markdown: string;
      title: string;
      route: RouteDecision;
      /** Number of visual regions described inline (hybrid pages; 0 otherwise). */
      regions: number;
    }
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
