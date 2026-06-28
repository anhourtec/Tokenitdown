import type { PageMetrics, Region, RegionCrop } from "../types";

/**
 * M3 — crop visual regions out of the stitched full-page screenshot.
 *
 * Region rects are in CSS page pixels; the screenshot is in device pixels, so we
 * scale by `devicePixelRatio` and clamp to the image bounds (the stitched PNG can
 * be clipped at Chrome's 16384px canvas limit, and a rect may extend past it).
 */

/** Source-pixel rectangle to copy out of the screenshot, or `null` if the region
 *  lies entirely outside the captured image. Pure — unit-testable without canvas. */
export function regionPixelRect(
  rect: Region["rect"],
  devicePixelRatio: number,
  imgWidth: number,
  imgHeight: number
): { sx: number; sy: number; sw: number; sh: number } | null {
  let sx = Math.round(rect.x * devicePixelRatio);
  let sy = Math.round(rect.y * devicePixelRatio);
  let sw = Math.round(rect.width * devicePixelRatio);
  let sh = Math.round(rect.height * devicePixelRatio);

  // Clamp a box that starts before the image origin, shrinking its size to match.
  if (sx < 0) {
    sw += sx;
    sx = 0;
  }
  if (sy < 0) {
    sh += sy;
    sy = 0;
  }
  if (sx >= imgWidth || sy >= imgHeight) return null;

  sw = Math.min(sw, imgWidth - sx);
  sh = Math.min(sh, imgHeight - sy);
  if (sw <= 0 || sh <= 0) return null;

  return { sx, sy, sw, sh };
}

/**
 * Crops each region from the full-page PNG. Regions that fall outside the image
 * are skipped. Uses `OffscreenCanvas`, so this runs in the service worker, not jsdom.
 */
export async function cropRegions(
  fullPagePngDataUrl: string,
  regions: Region[],
  metrics: PageMetrics
): Promise<RegionCrop[]> {
  const img = await loadImage(fullPagePngDataUrl);
  const crops: RegionCrop[] = [];

  for (const region of regions) {
    const r = regionPixelRect(
      region.rect,
      metrics.devicePixelRatio,
      img.width,
      img.height
    );
    if (!r) continue;

    const canvas = new OffscreenCanvas(r.sw, r.sh);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, r.sw, r.sh);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    crops.push({
      id: region.id,
      dataUrl: await blobToDataUrl(blob),
      width: r.sw,
      height: r.sh,
    });
  }

  return crops;
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
