import imageSize from "image-size";

/**
 * Read image dimensions from a buffer (server-side). Used to persist
 * width/height metadata in `memory_media` (Phase 2.3 requirement #4).
 *
 * `image-size` is pure JS (no native deps) and reads only the header, so it's
 * safe for serverless. For non-image uploads (e.g. PDF receipts) dimensions
 * are not applicable and this helper isn't called.
 *
 * Source: doc 16 (Storage — Metadata Stored), Phase 2.3 requirement #4.
 */

export interface ImageDimensions {
  width: number | null;
  height: number | null;
}

/** Best-effort dimension read; returns nulls if the buffer isn't a decodable image. */
export function readImageDimensions(buffer: Buffer): ImageDimensions {
  try {
    const result = imageSize(buffer);
    return {
      width: result.width ?? null,
      height: result.height ?? null,
    };
  } catch {
    return { width: null, height: null };
  }
}
