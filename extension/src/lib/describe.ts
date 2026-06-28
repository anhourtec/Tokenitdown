import type { Region, RegionCrop } from "../types";

/**
 * M3 — region describer interface.
 *
 * A describer turns a visual region (and, when available, its cropped pixels)
 * into a short Markdown snippet that replaces the region's inline placeholder.
 * This is the seam where a vision/LLM provider plugs in later: it would send
 * `crop.dataUrl` to a model and return the model's description. The default
 * `metadataDescriber` needs no model — it uses the region's own metadata
 * (caption / alt text / dimensions), so the pipeline ships complete and testable.
 */
export type RegionDescriber = (
  region: Region,
  crop: RegionCrop | null
) => Promise<string>;

const KIND_LABEL: Record<Region["kind"], string> = {
  canvas: "Chart",
  svg: "Chart",
  figure: "Figure",
  image: "Image",
};

/**
 * Default, no-model describer: emits a blockquote using the region's text label
 * (figcaption / alt / aria-label) when present, otherwise its kind + dimensions.
 * Deterministic and token-cheap. A vision provider can replace this behind the
 * `RegionDescriber` interface to generate richer descriptions from `crop`.
 */
export const metadataDescriber: RegionDescriber = async (region) => {
  const kind = KIND_LABEL[region.kind];
  const text = region.label
    ? region.label
    : `${Math.round(region.rect.width)}×${Math.round(region.rect.height)} ${region.kind} (no caption)`;
  return `> **${kind}:** ${text}`;
};

/**
 * Describes every region, pairing each with its crop (if one was produced), and
 * returns a map from region id to Markdown snippet for `spliceDescriptions`.
 * Sequential by design — keeps a future rate-limited vision provider well-behaved.
 */
export async function describeRegions(
  regions: Region[],
  cropById: Map<number, RegionCrop>,
  describer: RegionDescriber
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  for (const region of regions) {
    out.set(region.id, await describer(region, cropById.get(region.id) ?? null));
  }
  return out;
}
