import type { ExtractResult, PageSignals, RouteDecision } from "../types";

/**
 * M2 — the router.
 *
 * Given a page's DOM-extraction result, decide which pipeline should produce the
 * Markdown:
 *
 *  - `dom`    — the page is text-heavy and Readability gave a clean article. The
 *              DOM Markdown is the source of truth; no vision needed.
 *  - `vision` — the page is visually dominant (canvas dashboard, image-only,
 *              obfuscated text) with little/no extractable text. Pixels are the
 *              only floor.
 *  - `hybrid` — meaningful text *and* significant visual regions (charts/canvas/
 *              figures). Use the DOM Markdown as the skeleton and splice in vision
 *              descriptions of the visual regions (M3).
 *
 * `collectSignals` reads the live DOM (the content script's job); `decideRoute`
 * is pure and operates only on the numeric signals, so the decision logic is
 * fully unit-testable without a browser.
 */

/** Below this many characters of main-content text, the DOM result is too thin
 *  to trust — the page goes to the vision path. */
export const DOM_MIN_TEXT = 200;

/** At or above this fraction of content area covered by visual elements, the page
 *  is visually dominant even if it has some text — vision path. */
export const VISION_VISUAL_RATIO = 0.6;

/** At or above this fraction of visual area (but with usable text present), the
 *  page is a mix of prose and visuals — hybrid path. */
export const HYBRID_VISUAL_RATIO = 0.3;

/** A single canvas covering at least this fraction of the page is a chart/diagram
 *  worth a vision crop even when the rest of the page is text — hybrid path. */
export const HYBRID_CANVAS_RATIO = 0.1;

/**
 * Pure routing decision. Operates only on numeric/boolean signals so it can be
 * exhaustively unit-tested. Order matters: barren pages are caught first, then
 * visual dominance, then the hybrid mix, then clean text.
 */
export function decideRoute(s: PageSignals): RouteDecision {
  const visualPct = Math.round(s.visualAreaRatio * 100);

  // 1. Not enough extractable text for the DOM path to mean anything.
  if (s.textLength < DOM_MIN_TEXT) {
    const hasVisual =
      s.visualAreaRatio > 0 || s.canvasCount > 0 || s.imgCount > 0;
    return {
      path: "vision",
      confidence: hasVisual ? 0.9 : 0.5,
      reason: hasVisual
        ? `Only ${s.textLength} chars of text; page is visual (${s.canvasCount} canvas, ${s.imgCount} img) — vision path.`
        : `Sparse text (${s.textLength} chars) with no clear structure — vision fallback.`,
    };
  }

  // 2. Visuals dominate the page even though some text exists.
  if (s.visualAreaRatio >= VISION_VISUAL_RATIO) {
    return {
      path: "vision",
      confidence: 0.7,
      reason: `Visual elements cover ~${visualPct}% of the page — vision path.`,
    };
  }

  // 3. Real text plus significant charts/canvas/figures → DOM skeleton + crops.
  if (
    s.visualAreaRatio >= HYBRID_VISUAL_RATIO ||
    s.canvasAreaRatio >= HYBRID_CANVAS_RATIO
  ) {
    return {
      path: "hybrid",
      confidence: 0.7,
      reason: `Readable text plus visual regions (~${visualPct}% area, ${s.canvasCount} canvas) — hybrid (DOM + vision crops).`,
    };
  }

  // 4. Clean, readable article — DOM is the source of truth.
  if (s.readerable && s.extractSource === "readability") {
    return {
      path: "dom",
      confidence: 0.9,
      reason: `Readable article (${s.textLength} chars, low visual density) — DOM path.`,
    };
  }

  // 5. Text is present but Readability found no clean article (fallback body
  //    conversion). Still better than vision, but lower confidence.
  return {
    path: "dom",
    confidence: 0.5,
    reason: `Body text present (${s.textLength} chars) but no clean article — DOM fallback.`,
  };
}

/**
 * Reads the live DOM and produces the numeric signals `decideRoute` consumes.
 * Visual-area ratios depend on layout (`getBoundingClientRect`), so they are only
 * meaningful in a real browser; in a headless DOM they degrade to 0 and the
 * router falls back to text/count signals.
 */
export function collectSignals(
  doc: Document,
  extract: ExtractResult
): PageSignals {
  const canvases = Array.from(doc.querySelectorAll("canvas"));
  const svgs = Array.from(doc.querySelectorAll("svg"));
  const imgs = Array.from(doc.querySelectorAll("img"));

  const contentArea = estimateContentArea(doc);
  const canvasAreaRatio = areaRatio(canvases, contentArea);
  const svgAreaRatio = areaRatio(svgs, contentArea);
  const imgAreaRatio = areaRatio(imgs, contentArea);

  return {
    textLength: extract.textLength,
    readerable: extract.readerable,
    extractSource: extract.source,
    linkDensity: computeLinkDensity(doc),
    canvasCount: canvases.length,
    svgCount: svgs.length,
    imgCount: imgs.length,
    canvasAreaRatio,
    svgAreaRatio,
    imgAreaRatio,
    visualAreaRatio: clamp01(canvasAreaRatio + svgAreaRatio + imgAreaRatio),
  };
}

/** Total layout area of the page in CSS px², used as the denominator for the
 *  visual-dominance ratios. Falls back to the viewport when scroll metrics are
 *  unavailable (e.g. headless DOM). */
function estimateContentArea(doc: Document): number {
  const root = doc.documentElement;
  const view = doc.defaultView;
  const width = root?.scrollWidth || view?.innerWidth || 0;
  const height = root?.scrollHeight || view?.innerHeight || 0;
  return width * height;
}

/** Fraction of `contentArea` covered by the given elements (clamped to [0,1]). */
function areaRatio(els: Element[], contentArea: number): number {
  if (contentArea <= 0) return 0;
  let sum = 0;
  for (const el of els) {
    const rect = el.getBoundingClientRect?.();
    if (!rect) continue;
    const w = Math.max(0, rect.width);
    const h = Math.max(0, rect.height);
    sum += w * h;
  }
  return clamp01(sum / contentArea);
}

/** Ratio of anchor text to total body text — a boilerplate/nav indicator the
 *  router can use later to discount link-farm pages. */
function computeLinkDensity(doc: Document): number {
  const bodyText = (doc.body?.textContent ?? "").trim();
  if (bodyText.length === 0) return 0;
  let linkChars = 0;
  for (const a of Array.from(doc.querySelectorAll("a"))) {
    linkChars += (a.textContent ?? "").trim().length;
  }
  return clamp01(linkChars / bodyText.length);
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
