import { describe, it, expect } from "vitest";
import {
  collectSignals,
  decideRoute,
  DOM_MIN_TEXT,
  HYBRID_VISUAL_RATIO,
  VISION_VISUAL_RATIO,
} from "./route";
import type { ExtractResult, PageSignals } from "../types";

/** A neutral baseline signal set; override individual fields per test. */
function signals(overrides: Partial<PageSignals> = {}): PageSignals {
  return {
    textLength: 2000,
    readerable: true,
    extractSource: "readability",
    linkDensity: 0.1,
    canvasCount: 0,
    svgCount: 0,
    imgCount: 0,
    canvasAreaRatio: 0,
    svgAreaRatio: 0,
    imgAreaRatio: 0,
    visualAreaRatio: 0,
    ...overrides,
  };
}

describe("decideRoute", () => {
  it("routes a clean, readable article to the DOM path with high confidence", () => {
    const d = decideRoute(signals());
    expect(d.path).toBe("dom");
    expect(d.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("routes a text-barren visual page to the vision path", () => {
    const d = decideRoute(
      signals({
        textLength: 20,
        readerable: false,
        extractSource: "fallback",
        canvasCount: 1,
        canvasAreaRatio: 0.8,
        visualAreaRatio: 0.8,
      })
    );
    expect(d.path).toBe("vision");
    expect(d.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("routes a barren page with no structure to vision with low confidence", () => {
    const d = decideRoute(
      signals({ textLength: 10, readerable: false, extractSource: "fallback" })
    );
    expect(d.path).toBe("vision");
    expect(d.confidence).toBeLessThan(0.9);
  });

  it("routes a visually dominant page (with some text) to vision", () => {
    const d = decideRoute(
      signals({ textLength: 1000, visualAreaRatio: VISION_VISUAL_RATIO + 0.05 })
    );
    expect(d.path).toBe("vision");
  });

  it("routes text + significant visual regions to the hybrid path", () => {
    const d = decideRoute(
      signals({ textLength: 1500, visualAreaRatio: HYBRID_VISUAL_RATIO + 0.05 })
    );
    expect(d.path).toBe("hybrid");
  });

  it("routes text + a dominant chart canvas to hybrid even at low total visual area", () => {
    const d = decideRoute(
      signals({
        textLength: 1500,
        canvasCount: 1,
        canvasAreaRatio: 0.15,
        visualAreaRatio: 0.15,
      })
    );
    expect(d.path).toBe("hybrid");
  });

  it("routes a fallback body (text present, no clean article) to DOM with low confidence", () => {
    const d = decideRoute(
      signals({ textLength: 800, readerable: false, extractSource: "fallback" })
    );
    expect(d.path).toBe("dom");
    expect(d.confidence).toBeLessThan(0.9);
  });

  it("treats DOM_MIN_TEXT as the boundary between vision and DOM", () => {
    expect(decideRoute(signals({ textLength: DOM_MIN_TEXT - 1 })).path).toBe(
      "vision"
    );
    expect(decideRoute(signals({ textLength: DOM_MIN_TEXT })).path).toBe("dom");
  });

  it("always includes a human-readable reason", () => {
    for (const s of [
      signals(),
      signals({ textLength: 5 }),
      signals({ visualAreaRatio: 0.7 }),
      signals({ visualAreaRatio: 0.4 }),
    ]) {
      expect(decideRoute(s).reason.length).toBeGreaterThan(0);
    }
  });
});

describe("collectSignals", () => {
  function docFromHtml(html: string): Document {
    return new DOMParser().parseFromString(html, "text/html");
  }

  function extract(overrides: Partial<ExtractResult> = {}): ExtractResult {
    return {
      markdown: "",
      title: "",
      byline: null,
      excerpt: null,
      textLength: 1234,
      url: "https://example.com",
      source: "readability",
      readerable: true,
      ...overrides,
    };
  }

  it("counts canvas, svg and img elements and carries extract signals through", () => {
    const doc = docFromHtml(`
      <body>
        <canvas></canvas><canvas></canvas>
        <svg></svg>
        <img src="a.png" /><img src="b.png" /><img src="c.png" />
        <p>Some body text.</p>
      </body>`);
    const s = collectSignals(doc, extract({ textLength: 1234 }));

    expect(s.canvasCount).toBe(2);
    expect(s.svgCount).toBe(1);
    expect(s.imgCount).toBe(3);
    expect(s.textLength).toBe(1234);
    expect(s.readerable).toBe(true);
    expect(s.extractSource).toBe("readability");
  });

  it("computes link density as anchor text over total body text", () => {
    // Body text "AAAABB" (6 chars); anchor text "AAAA" (4) → 4/6.
    const doc = docFromHtml(`<body><a href="/x">AAAA</a>BB</body>`);
    const s = collectSignals(doc, extract());
    expect(s.linkDensity).toBeCloseTo(4 / 6, 5);
  });

  it("never produces ratios outside [0,1] and defaults area to 0 without layout", () => {
    // jsdom has no layout engine, so getBoundingClientRect returns zeros.
    const doc = docFromHtml(`<body><canvas></canvas><p>text</p></body>`);
    const s = collectSignals(doc, extract());
    for (const r of [
      s.canvasAreaRatio,
      s.svgAreaRatio,
      s.imgAreaRatio,
      s.visualAreaRatio,
      s.linkDensity,
    ]) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});
