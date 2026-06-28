/**
 * M5 — full-page screenshot via the Chrome DevTools Protocol (`chrome.debugger`).
 *
 * This is the *primary* capture path. Unlike scroll-and-stitch, CDP renders the
 * whole page in a single compositor pass (`Page.captureScreenshot` with
 * `captureBeyondViewport`), so there are no seams, no duplicated/dropped fixed
 * headers, no scroll-timing gaps, and no per-frame DPR resampling. It can't run
 * on restricted pages (`chrome://`, the Web Store) or when another debugger
 * (DevTools) is already attached — the caller falls back to scroll-stitch then.
 *
 * The CDP transport is injected as a `CdpSession` so the orchestration is
 * unit-testable without a browser; the service worker supplies a real session
 * backed by `chrome.debugger`.
 */

export interface CdpSession {
  attach: () => Promise<void>;
  detach: () => Promise<void>;
  send: <T = unknown>(method: string, params?: object) => Promise<T>;
}

/** Subset of `Page.getLayoutMetrics` we read. `cssContentSize` is the full page
 *  in CSS pixels (preferred); `contentSize` is the older device-pixel field. */
interface LayoutMetrics {
  cssContentSize?: { width: number; height: number };
  contentSize?: { width: number; height: number };
}

export interface CdpCaptureResult {
  dataUrl: string;
  /** Full-page size in CSS pixels (the clip we requested). */
  width: number;
  height: number;
}

export async function captureFullPageCDP(
  session: CdpSession
): Promise<CdpCaptureResult> {
  await session.attach();
  try {
    await session.send("Page.enable");

    const metrics = await session.send<LayoutMetrics>("Page.getLayoutMetrics");
    const size = metrics.cssContentSize ?? metrics.contentSize;
    if (!size || !size.width || !size.height) {
      throw new Error("CDP returned no page content size");
    }

    const { data } = await session.send<{ data: string }>(
      "Page.captureScreenshot",
      {
        format: "png",
        captureBeyondViewport: true,
        // Clip to the full CSS content box at scale 1; Chrome still renders at
        // the page's device pixel ratio, matching the scroll-stitch output.
        clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 },
      }
    );
    if (!data) throw new Error("CDP returned an empty screenshot");

    return {
      dataUrl: `data:image/png;base64,${data}`,
      width: size.width,
      height: size.height,
    };
  } finally {
    // Always detach — a left-over attachment keeps the "DevTools is debugging
    // this browser" banner up and blocks the next capture.
    await session.detach();
  }
}
