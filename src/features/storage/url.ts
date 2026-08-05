import { clientEnv } from "@/lib/env";
import { BUCKETS, IMAGE_VARIANTS, type ImageVariant } from "./constants";

/** The string bucket ids that hold public-readable objects. */
export type PublicBucketId =
  | typeof BUCKETS.avatars
  | typeof BUCKETS.memoryImages;

/**
 * Public URL builder with future image-variant support (Phase 2.3 #3).
 *
 * Today the MVP stores only the ORIGINAL and every variant resolves to it.
 * When a server-side pipeline is introduced (Sharp / Supabase Image
 * Transformations), only this module changes — callers keep passing the same
 * `getPublicUrl(path, variant?)` signature.
 *
 * Two planned integration paths (both invisible to callers):
 *   1. Supabase Image Transformations — append `?width=&height=&resize=` to
 *      the public URL; Supabase renders on the CDN edge.
 *   2. A pre-process job that writes derived objects to
 *      `{memoryId}/{uuid}-{variant}.webp` and this function picks the path.
 *
 * Source: docs 16 (Storage), Phase 2.3 requirement #3.
 */

const SUPABASE_HOST = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(
  /^https?:\/\//,
  "",
);

/** Build the canonical public URL for a stored object. */
export function getPublicUrl(
  bucket: PublicBucketId,
  objectPath: string,
  variant: ImageVariant = IMAGE_VARIANTS.original,
): string {
  const base = `https://${SUPABASE_HOST}/storage/v1/object/public/${bucket}/${objectPath}`;

  // MVP: every variant returns the original. When transforms ship, branch on
  // `variant` here. Kept explicit so the future change is localized.
  void variant;
  return base;
}

/**
 * Build a signed (private) URL for a receipt. Receipts are NEVER public
 * (docs 15, 21, 24) — they're served only to admins via short-lived signed
 * URLs generated server-side.
 *
 * Note: signed URLs are created with the admin client at read time because
 * they need an expiry; this helper exists so call sites use a named function
 * instead of constructing the request inline.
 */
export function receiptsBucket(): typeof BUCKETS.paymentReceipts {
  return BUCKETS.paymentReceipts;
}
