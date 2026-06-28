import type { Region, RegionCrop } from "../types";

/**
 * M3/M5 — crop visual regions out of the full-page screenshot.
 *
 * Region rects are in CSS page pixels; the screenshot is in device pixels. The
 * scale between them is NOT always `window.devicePixelRatio` — the CDP capture
 * path (M5) can render at a different device scale factor than the page reports
 * (e.g. 1.5× while `devicePixelRatio` is 1). So we derive the scale empirically
 * from the produced image width vs the CSS page width, which is correct for both
 * the CDP and scroll-stitch images. Source rects are clamped to the image bounds
 * (the stitched PNG can be clipped at Chrome's 16384px canvas limit).
 */

/** Source-pixel rectangle to copy out of the screenshot, or `null` if the region
 *  lies entirely outside the captured image. `scale` is device px per CSS px.
 *  Pure — unit-testable without canvas. */
export function regionPixelRect(
  rect: Region["rect"],
  scale: number,
  imgWidth: number,
  imgHeight: number
): { sx: number; sy: number; sw: number; sh: number } | null {
  let sx = Math.round(rect.x * scale);
  let sy = Math.round(rect.y * scale);
  let sw = Math.round(rect.width * scale);
  let sh = Math.round(rect.height * scale);

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
 * Crops each region from the full-page PNG. The device-px-per-CSS-px scale is
 * measured from the image width against `cssPageWidth` (the page's CSS content
 * width), so it's correct whether the screenshot came from CDP or scroll-stitch.
 * Regions that fall outside the image are skipped. Uses `OffscreenCanvas`, so
 * this runs in the service worker, not jsdom.
 */
export async function cropRegions(
  fullPagePngDataUrl: string,
  regions: Region[],
  cssPageWidth: number
): Promise<RegionCrop[]> {
  const img = await loadImage(fullPagePngDataUrl);
  const scale = cssPageWidth > 0 ? img.width / cssPageWidth : 1;
  const crops: RegionCrop[] = [];

  for (const region of regions) {
    const r = regionPixelRect(region.rect, scale, img.width, img.height);
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
