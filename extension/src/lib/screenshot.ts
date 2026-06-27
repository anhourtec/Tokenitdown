import type { CapturedFrame, PageMetrics } from "../types";

interface CaptureOptions {
  tabId: number;
  metrics: PageMetrics;
  settleMs: number;
  onProgress: (frame: number, total: number) => void;
  scrollTo: (y: number) => Promise<unknown>;
  waitForScrollDone: () => Promise<void>;
  captureTab: () => Promise<string>;
}

/**
 * Scrolls the page top-to-bottom in viewport-sized steps, capturing one frame
 * per step, and returns the ordered array of frames with their scroll offsets.
 *
 * The last frame is always captured at the exact bottom of the page so the
 * stitcher can trim the overlap correctly.
 */
export async function captureFrames(opts: CaptureOptions): Promise<CapturedFrame[]> {
  const { metrics, settleMs, onProgress, scrollTo, waitForScrollDone, captureTab } = opts;
  const { scrollHeight, viewportHeight } = metrics;

  const frames: CapturedFrame[] = [];
  const totalFrames = Math.ceil(scrollHeight / viewportHeight);

  let y = 0;

  while (y < scrollHeight) {
    await scrollTo(y);
    await waitForScrollDone();
    await sleep(settleMs);

    const dataUrl = await captureTab();
    frames.push({ dataUrl, scrollY: y });
    onProgress(frames.length, totalFrames);

    const nextY = y + viewportHeight;

    // If the next step would overshoot, snap to the bottom for the final frame.
    // This avoids a short trailing frame while still covering the full page.
    if (nextY < scrollHeight && nextY + viewportHeight > scrollHeight) {
      y = scrollHeight - viewportHeight;
    } else {
      y = nextY;
    }

    if (y >= scrollHeight) break;
  }

  return frames;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
