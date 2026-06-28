import { describe, it, expect } from "vitest";
import { regionPixelRect } from "./crop";

const rect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe("regionPixelRect", () => {
  it("scales a fully-visible region by the device pixel ratio", () => {
    expect(regionPixelRect(rect(10, 20, 100, 50), 2, 1000, 1000)).toEqual({
      sx: 20,
      sy: 40,
      sw: 200,
      sh: 100,
    });
  });

  it("passes CSS pixels through 1:1 at dpr 1", () => {
    expect(regionPixelRect(rect(0, 0, 300, 200), 1, 800, 600)).toEqual({
      sx: 0,
      sy: 0,
      sw: 300,
      sh: 200,
    });
  });

  it("clamps a region that starts before the image origin", () => {
    // x=-5 at dpr2 → sx -10; clamped to 0 with width reduced by 10.
    expect(regionPixelRect(rect(-5, 0, 100, 50), 2, 1000, 1000)).toEqual({
      sx: 0,
      sy: 0,
      sw: 190,
      sh: 100,
    });
  });

  it("clamps a region that overruns the right/bottom edge", () => {
    // sx=900, sw would be 200 → clamped to 100 (1000-900).
    expect(regionPixelRect(rect(900, 0, 100, 50), 1, 1000, 1000)).toEqual({
      sx: 900,
      sy: 0,
      sw: 100,
      sh: 50,
    });
  });

  it("returns null when the region is entirely outside the image", () => {
    // The stitched PNG is clipped at Chrome's 16384px limit; a region below it
    // (e.g. on a very tall page) falls outside and is skipped.
    expect(regionPixelRect(rect(0, 20000, 100, 50), 1, 1000, 16384)).toBeNull();
  });

  it("returns null for a zero-area region", () => {
    expect(regionPixelRect(rect(10, 10, 0, 50), 1, 1000, 1000)).toBeNull();
  });
});
