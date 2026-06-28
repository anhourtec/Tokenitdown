import { describe, it, expect } from "vitest";
import {
  collectRegions,
  injectPlaceholders,
  meetsSizeThreshold,
  placeholderToken,
  spliceDescriptions,
} from "./regions";
import { extractMarkdown } from "./extract";

function docFromHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

/** jsdom has no layout engine, so stub getBoundingClientRect for size-based tests. */
function stubRect(el: Element, width: number, height: number, left = 0, top = 0) {
  el.getBoundingClientRect = () =>
    ({
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      x: left,
      y: top,
      toJSON() {},
    }) as DOMRect;
}

describe("meetsSizeThreshold", () => {
  it("always accepts figures regardless of size", () => {
    expect(meetsSizeThreshold("figure", 10, 10)).toBe(true);
  });

  it("accepts large canvas/img/svg and rejects small ones", () => {
    expect(meetsSizeThreshold("canvas", 600, 400)).toBe(true);
    expect(meetsSizeThreshold("image", 50, 50)).toBe(false);
    expect(meetsSizeThreshold("svg", 200, 149)).toBe(false); // just under height
    expect(meetsSizeThreshold("svg", 200, 150)).toBe(true); // on threshold
  });
});

describe("collectRegions", () => {
  it("detects a figure and reads its caption as the label", () => {
    const doc = docFromHtml(`
      <article><p>text</p>
        <figure><img src="x.png" alt="ignored" /><figcaption>Revenue by quarter</figcaption></figure>
      </article>`);
    const regions = collectRegions(doc);

    expect(regions).toHaveLength(1);
    expect(regions[0]!.kind).toBe("figure");
    expect(regions[0]!.label).toBe("Revenue by quarter");
  });

  it("does not double-count media nested inside a figure", () => {
    const doc = docFromHtml(`
      <figure><canvas></canvas><figcaption>A chart</figcaption></figure>`);
    // The inner <canvas> must be dropped in favour of the <figure>.
    expect(collectRegions(doc)).toHaveLength(1);
    expect(collectRegions(doc)[0]!.kind).toBe("figure");
  });

  it("applies the size threshold to canvas/img and reads aria-label", () => {
    const doc = docFromHtml(`
      <div>
        <canvas aria-label="Sales trend"></canvas>
        <img src="icon.png" alt="icon" />
      </div>`);
    const canvas = doc.querySelector("canvas")!;
    const img = doc.querySelector("img")!;
    stubRect(canvas, 600, 400);
    stubRect(img, 32, 32); // an icon — below threshold

    const regions = collectRegions(doc);
    expect(regions).toHaveLength(1);
    expect(regions[0]!.kind).toBe("canvas");
    expect(regions[0]!.label).toBe("Sales trend");
    expect(regions[0]!.rect).toMatchObject({ width: 600, height: 400 });
  });

  it("falls back to the raw client rect when there is no window (no scroll offset)", () => {
    // A DOMParser document has no defaultView, so the scrollX/Y fallback (?? 0)
    // is used. (Live scroll-offset accumulation is covered by the browser test.)
    const doc = docFromHtml(`<canvas></canvas>`);
    const canvas = doc.querySelector("canvas")!;
    stubRect(canvas, 600, 400, 10, 20);

    const region = collectRegions(doc)[0]!;
    expect(region.rect).toMatchObject({ x: 10, y: 20, width: 600, height: 400 });
  });
});

describe("injectPlaceholders + extraction", () => {
  it("embeds a placeholder token inline where the region was", () => {
    const doc = docFromHtml(`
      <!DOCTYPE html><html><head><title>Report</title></head><body>
      <article>
        <h1>Quarterly Report</h1>
        <p>Revenue grew across every region this quarter, driven by strong
        enterprise demand and improved retention among existing customers.</p>
        <figure><canvas></canvas><figcaption>Revenue by quarter</figcaption></figure>
        <p>The chart above shows the upward trend that we expect to continue
        into the next fiscal year as new products reach general availability.</p>
      </article></body></html>`);

    const regions = collectRegions(doc);
    expect(regions).toHaveLength(1);

    const clone = doc.cloneNode(true) as Document;
    expect(injectPlaceholders(clone, regions)).toBe(1);

    const { markdown } = extractMarkdown(clone, "https://example.com");
    expect(markdown).toContain(placeholderToken(0));
    // The token sits between the two paragraphs, not at the very start/end.
    expect(markdown).toMatch(/Revenue grew[\s\S]*TIDREGION0ENDREGION[\s\S]*chart above/);
  });
});

describe("spliceDescriptions", () => {
  it("replaces tokens with their descriptions", () => {
    const md = `Intro.\n\n${placeholderToken(0)}\n\nMiddle.\n\n${placeholderToken(1)}\n\nEnd.`;
    const out = spliceDescriptions(
      md,
      new Map([
        [0, "> **Chart:** A"],
        [1, "> **Image:** B"],
      ])
    );
    expect(out).toContain("> **Chart:** A");
    expect(out).toContain("> **Image:** B");
    expect(out).not.toContain("TIDREGION");
  });

  it("strips tokens with no description and collapses the blank lines", () => {
    const md = `Intro.\n\n${placeholderToken(0)}\n\nEnd.`;
    const out = spliceDescriptions(md, new Map());
    expect(out).not.toContain("TIDREGION");
    expect(out).not.toMatch(/\n{3,}/);
    expect(out).toBe("Intro.\n\nEnd.");
  });
});
