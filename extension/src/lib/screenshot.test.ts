import { describe, it, expect, vi } from "vitest";
import { captureFrames } from "./screenshot";
import type { PageMetrics } from "../types";

const BASE_METRICS: PageMetrics = {
  scrollHeight: 2000,
  scrollWidth: 1280,
  viewportHeight: 800,
  viewportWidth: 1280,
  devicePixelRatio: 1,
};

const FAKE_DATA_URL = "data:image/png;base64,abc";

function makeDeps(overrides?: Partial<Parameters<typeof captureFrames>[0]>) {
  return {
    tabId: 1,
    metrics: BASE_METRICS,
    settleMs: 0,
    onProgress: vi.fn(),
    scrollTo: vi.fn().mockResolvedValue(undefined),
    waitForScrollDone: vi.fn().mockResolvedValue(undefined),
    captureTab: vi.fn().mockResolvedValue(FAKE_DATA_URL),
    ...overrides,
  };
}

describe("captureFrames", () => {
  it("captures three frames for a 2.5-viewport-tall page", async () => {
    const deps = makeDeps();
    const frames = await captureFrames(deps);

    expect(frames).toHaveLength(3);
    expect(frames[0]?.scrollY).toBe(0);
    expect(frames[1]?.scrollY).toBe(800);
    // last frame snapped to bottom so we cover the page without a short trailing strip
    expect(frames[2]?.scrollY).toBe(1200);
  });

  it("captures a single frame when page fits in one viewport", async () => {
    const deps = makeDeps({ metrics: { ...BASE_METRICS, scrollHeight: 700 } });
    const frames = await captureFrames(deps);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.scrollY).toBe(0);
  });

  it("captures exactly two frames when page is exactly two viewports tall", async () => {
    const deps = makeDeps({
      metrics: { ...BASE_METRICS, scrollHeight: 1600 },
    });
    const frames = await captureFrames(deps);

    expect(frames).toHaveLength(2);
    expect(frames[0]?.scrollY).toBe(0);
    expect(frames[1]?.scrollY).toBe(800);
  });

  it("reports progress with correct frame/total counts", async () => {
    const onProgress = vi.fn();
    const deps = makeDeps({ onProgress });
    await captureFrames(deps);

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3);
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3);
  });

  it("calls scrollTo before capturing each frame", async () => {
    const scrollTo = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({ scrollTo });
    await captureFrames(deps);

    expect(scrollTo).toHaveBeenCalledTimes(3);
    expect(scrollTo).toHaveBeenNthCalledWith(1, 0);
    expect(scrollTo).toHaveBeenNthCalledWith(2, 800);
    expect(scrollTo).toHaveBeenNthCalledWith(3, 1200);
  });

  it("stores the dataUrl returned by captureTab on each frame", async () => {
    const deps = makeDeps();
    const frames = await captureFrames(deps);

    for (const frame of frames) {
      expect(frame.dataUrl).toBe(FAKE_DATA_URL);
    }
  });

  it("waits for scroll to settle on each frame", async () => {
    const waitForScrollDone = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({ waitForScrollDone });
    const frames = await captureFrames(deps);

    expect(waitForScrollDone).toHaveBeenCalledTimes(frames.length);
  });
});
