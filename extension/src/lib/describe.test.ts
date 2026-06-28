import { describe, it, expect } from "vitest";
import { describeRegions, metadataDescriber, type RegionDescriber } from "./describe";
import type { Region, RegionCrop } from "../types";

function region(overrides: Partial<Region> = {}): Region {
  return {
    id: 0,
    sourceIndex: 0,
    kind: "canvas",
    rect: { x: 0, y: 0, width: 600, height: 400 },
    label: null,
    ...overrides,
  };
}

describe("metadataDescriber", () => {
  it("uses a figure's caption", async () => {
    const out = await metadataDescriber(
      region({ kind: "figure", label: "Revenue by quarter" }),
      null
    );
    expect(out).toBe("> **Figure:** Revenue by quarter");
  });

  it("uses an image's alt text", async () => {
    const out = await metadataDescriber(
      region({ kind: "image", label: "Architecture diagram" }),
      null
    );
    expect(out).toBe("> **Image:** Architecture diagram");
  });

  it("falls back to kind + dimensions when there is no label", async () => {
    const out = await metadataDescriber(
      region({ kind: "canvas", label: null, rect: { x: 0, y: 0, width: 640, height: 480 } }),
      null
    );
    expect(out).toBe("> **Chart:** 640×480 canvas (no caption)");
  });

  it("labels svg as a chart", async () => {
    const out = await metadataDescriber(region({ kind: "svg", label: "Flow" }), null);
    expect(out).toBe("> **Chart:** Flow");
  });
});

describe("describeRegions", () => {
  it("describes every region and passes its matching crop through", async () => {
    const regions = [region({ id: 0 }), region({ id: 1 })];
    const crop: RegionCrop = { id: 0, dataUrl: "data:image/png;base64,AAA", width: 10, height: 10 };
    const cropById = new Map([[0, crop]]);

    // A fake vision-style describer that reports whether it received pixels.
    const fake: RegionDescriber = async (r, c) =>
      c ? `described crop ${r.id} (${c.width}px)` : `no crop ${r.id}`;

    const out = await describeRegions(regions, cropById, fake);
    expect(out.get(0)).toBe("described crop 0 (10px)");
    expect(out.get(1)).toBe("no crop 1");
  });
});
