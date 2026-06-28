import type { Region, RegionKind, RegionRect } from "../types";

/**
 * M3 — visual region detection, placeholder injection, and splicing.
 *
 * On a `hybrid` page (router decided there's meaningful text *and* significant
 * visual regions), we:
 *   1. `collectRegions` — find the visual regions in the live DOM with their
 *      page-coordinate boxes and a text label, in document order.
 *   2. `injectPlaceholders` — on the (layout-less) extraction clone, replace each
 *      region element with a paragraph holding a unique token, so the token lands
 *      *inline* at the region's position in the extracted Markdown.
 *   3. (service worker) crop each region from the screenshot and describe it.
 *   4. `spliceDescriptions` — swap each token for its description.
 *
 * `collectRegions` needs layout (`getBoundingClientRect`), so it only finds
 * size-filtered regions in a real browser. The token/inject/splice logic is pure
 * string/DOM work and is fully unit-testable.
 */

const REGION_SELECTOR = "canvas, svg, figure, img";

/** A region must be at least this big (CSS px) to be worth a crop — filters out
 *  icons, avatars, and tracking pixels. `figure` is exempt (it's explicit). */
export const MIN_REGION_WIDTH = 200;
export const MIN_REGION_HEIGHT = 150;

/** Matches the inline placeholder tokens. Pure alphanumerics so Turndown never
 *  escapes them and Readability keeps the paragraph intact. */
export const PLACEHOLDER_RE = /TIDREGION(\d+)ENDREGION/g;

export function placeholderToken(id: number): string {
  return `TIDREGION${id}ENDREGION`;
}

/**
 * The region candidates in a document, in document order, deduplicated so a
 * `<figure>` represents (and its inner `<img>`/`<canvas>`/`<svg>` are dropped),
 * and nested `<svg>` inside another `<svg>` is dropped. Called on both the live
 * document (for layout) and the clone (for injection) — identical structure
 * yields the identical ordered list, so `sourceIndex` maps between them.
 */
function regionEls(doc: Document): Element[] {
  return Array.from(doc.querySelectorAll(REGION_SELECTOR)).filter((el) => {
    // A figure stands in for its inner media — keep the figure, drop descendants.
    if (el.tagName !== "FIGURE" && el.closest("figure")) return false;
    // Drop an <svg> nested inside another <svg>.
    if (isSvg(el) && el.parentElement?.closest("svg")) return false;
    return true;
  });
}

function isSvg(el: Element): boolean {
  return el.tagName.toLowerCase() === "svg";
}

function kindOf(el: Element): RegionKind {
  const tag = el.tagName.toLowerCase();
  if (tag === "canvas") return "canvas";
  if (tag === "svg") return "svg";
  if (tag === "figure") return "figure";
  return "image"; // img
}

function labelFor(el: Element): string | null {
  const tag = el.tagName.toLowerCase();
  if (tag === "figure") return clean(el.querySelector("figcaption")?.textContent);
  if (tag === "img") return clean(el.getAttribute("alt"));
  // canvas / svg — prefer ARIA, then title attribute, then an inner <title>.
  return (
    clean(el.getAttribute("aria-label")) ||
    clean(el.getAttribute("title")) ||
    clean(el.querySelector("title")?.textContent)
  );
}

function clean(s: string | null | undefined): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length ? t : null;
}

function pageRect(el: Element, doc: Document): RegionRect {
  const r = el.getBoundingClientRect();
  const view = doc.defaultView;
  return {
    x: r.left + (view?.scrollX ?? 0),
    y: r.top + (view?.scrollY ?? 0),
    width: r.width,
    height: r.height,
  };
}

/** Whether a region of this kind/size is worth cropping. `figure` always is. */
export function meetsSizeThreshold(
  kind: RegionKind,
  width: number,
  height: number
): boolean {
  if (kind === "figure") return true;
  return width >= MIN_REGION_WIDTH && height >= MIN_REGION_HEIGHT;
}

/** Finds the visual regions in the live document (needs layout for `rect`). */
export function collectRegions(doc: Document): Region[] {
  const regions: Region[] = [];
  let id = 0;
  regionEls(doc).forEach((el, sourceIndex) => {
    const kind = kindOf(el);
    const rect = pageRect(el, doc);
    if (!meetsSizeThreshold(kind, rect.width, rect.height)) return;
    regions.push({ id: id++, sourceIndex, kind, rect, label: labelFor(el) });
  });
  return regions;
}

/**
 * Replaces each region's element in `doc` (the extraction clone) with a paragraph
 * holding its placeholder token, so the token appears inline at the region's
 * position once the clone is converted to Markdown. Returns how many were injected.
 */
export function injectPlaceholders(doc: Document, regions: Region[]): number {
  const els = regionEls(doc);
  let injected = 0;
  for (const region of regions) {
    const el = els[region.sourceIndex];
    if (!el || !el.parentNode) continue;
    const p = doc.createElement("p");
    p.textContent = placeholderToken(region.id);
    el.replaceWith(p);
    injected++;
  }
  return injected;
}

/**
 * Replaces every placeholder token in `markdown` with its region description.
 * Tokens with no description (region wasn't cropped/described) are removed, and
 * the resulting blank lines collapsed, so the output is always clean.
 */
export function spliceDescriptions(
  markdown: string,
  descriptions: Map<number, string>
): string {
  return markdown
    .replace(PLACEHOLDER_RE, (_match, idStr: string) => {
      return descriptions.get(Number(idStr)) ?? "";
    })
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
