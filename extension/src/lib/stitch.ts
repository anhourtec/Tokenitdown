import type { CapturedFrame, PageMetrics } from "../types";

const MAX_CANVAS_DIMENSION = 16384; // Chrome's canvas hard limit

/**
 * Composites an ordered array of captured viewport frames into a single
 * full-page PNG using OffscreenCanvas.
 *
 * Each frame is drawn at its scrollY offset. The final frame is cropped to
 * only the pixels that don't overlap the previous frame, preventing a
 * duplicate strip at the bottom.
 */
export async function stitch(
  frames: CapturedFrame[],
  metrics: PageMetrics
): Promise<string> {
  const { scrollHeight, scrollWidth, devicePixelRatio } = metrics;

  const canvasWidth = Math.min(scrollWidth * devicePixelRatio, MAX_CANVAS_DIMENSION);
  const canvasHeight = Math.min(scrollHeight * devicePixelRatio, MAX_CANVAS_DIMENSION);

  if (scrollHeight * devicePixelRatio > MAX_CANVAS_DIMENSION) {
    console.warn(
      `[TokenItDown] Page is taller than ${MAX_CANVAS_DIMENSION}px at ${devicePixelRatio}x — ` +
      `output will be cropped to ${MAX_CANVAS_DIMENSION}px. Consider reducing devicePixelRatio.`
    );
  }

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get OffscreenCanvas 2D context");

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]!;
    const nextFrame = frames[i + 1];

    const img = await loadImage(frame.dataUrl);

    // Height this frame contributes: everything up to where the next frame starts,
    // or the full image if this is the last frame.
    const srcHeight = nextFrame
      ? (nextFrame.scrollY - frame.scrollY) * devicePixelRatio
      : img.height;

    const destY = frame.scrollY * devicePixelRatio;

    ctx.drawImage(
      img,
      0, 0,                  // source x, y
      img.width, srcHeight,  // source w, h (clip overlap from bottom)
      0, destY,              // dest x, y
      canvasWidth, srcHeight // dest w, h
    );
  }

  const blob = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataUrl(blob);
}

function loadImage(dataUrl: string): Promise<ImageBitmap> {
  return fetch(dataUrl)
    .then((r) => r.blob())
    .then((blob) => createImageBitmap(blob));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
