/**
 * Storage constants.
 *
 * Bucket ids match migration 0012. Folder structure follows doc 16.
 *
 * Source: docs 16 (Storage System), 15 (Payments), Phase 2.3 requirements.
 */

export const BUCKETS = {
  avatars: "avatars",
  memoryImages: "memory-images",
  paymentReceipts: "payment-receipts",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Image variants (Phase 2.3 requirement #3).
 *
 * The MVP stores only the ORIGINAL. The variants abstraction lets a future
 * server-side pipeline (Sharp / Supabase Image Transformations) produce
 * derived sizes without changing the public API: callers pass a `variant`
 * and receive a URL; today every variant resolves to the original.
 */
export const IMAGE_VARIANTS = {
  original: "original",
  thumbnail: "thumbnail",
  medium: "medium",
  large: "large",
} as const;

export type ImageVariant = (typeof IMAGE_VARIANTS)[keyof typeof IMAGE_VARIANTS];

/** Max memory images per memory (doc 16). The settings row is authoritative. */
export const MAX_MEMORY_IMAGES_FALLBACK = 10;
