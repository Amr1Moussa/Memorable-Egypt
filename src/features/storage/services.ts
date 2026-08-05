import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/authorization";
import { NotFoundError } from "@/lib/errors";
import { BUCKETS, MAX_MEMORY_IMAGES_FALLBACK } from "./constants";
import {
  validateUpload,
  validateMemoryImageCount,
  type UploadKind,
} from "./validation";
import { readImageDimensions } from "./dimensions";
import { getPublicUrl } from "./url";

/**
 * Storage upload service (server-only).
 *
 * MVP pipeline (Phase 2.3 requirement #1):
 *   1. Validate upload (MIME + size from configurable settings).
 *   2. Generate a UUID filename + organized path (doc 16 folder structure).
 *   3. Store the ORIGINAL image as-is (no client/server re-encoding, no EXIF
 *      strip in the MVP — those are future pipeline concerns).
 *   4. Return the public URL + metadata (width/height/mime/size) for the
 *      caller to persist in `memory_media` (Phase 2.3 requirement #4).
 *
 * Paths (Phase 2.3 requirement #5):
 *   avatars/{userId}/{uuid}.<ext>
 *   memory-images/{memoryId}/{uuid}.<ext>
 *   payment-receipts/{paymentId}/{uuid}.<ext>
 *
 * Ownership is verified before every upload — the RLS policies in migration
 * 0012 reinforce this, but the service is the authoritative gate.
 *
 * Source: docs 16 (Storage), 10 (Memory Creation), Phase 2.3 requirements.
 */

export interface StoredImage {
  /** Storage object path inside the bucket (e.g. "{memoryId}/{uuid}.webp"). */
  path: string;
  /** Full public URL (public buckets) — persisted on `memory_media.public_url`. */
  publicUrl: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  sizeBytes: number;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function extFor(mime: string, fallback = "bin"): string {
  return EXT_BY_MIME[mime] ?? fallback;
}

/**
 * Upload a memory image. Verifies the caller owns the target memory and that
 * adding this image won't exceed the per-memory cap.
 */
export async function uploadMemoryImage(
  memoryId: string,
  file: { name: string; type: string; size: number; buffer: Buffer },
): Promise<StoredImage> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  // Verify ownership + read current image count.
  const { data: memory, error } = await supabase
    .from("memories")
    .select("id, user_id")
    .eq("id", memoryId)
    .single();
  if (error || !memory) {
    throw new NotFoundError("We couldn't find that memory.");
  }
  if (memory.user_id !== userId) {
    // Owner check is authoritative; RLS reinforces.
    throw new NotFoundError("We couldn't find that memory.");
  }

  const { count } = await supabase
    .from("memory_media")
    .select("id", { count: "exact", head: true })
    .eq("memory_id", memoryId);
  validateMemoryImageCount(count ?? 0, 1, MAX_MEMORY_IMAGES_FALLBACK);

  return storeImage(BUCKETS.memoryImages, memoryId, file);
}

/**
 * Upload an avatar. Replaces the previous avatar (caller updates
 * profiles.avatar_url); the old object is left for a cleanup job (doc 16).
 */
export async function uploadAvatar(
  file: { name: string; type: string; size: number; buffer: Buffer },
): Promise<StoredImage> {
  const { id: userId } = await requireUser();
  return storeImage(BUCKETS.avatars, userId, file);
}

/**
 * Upload a payment receipt. Receipts go to the PRIVATE bucket — only admins
 * read them via signed URLs. Phase 5's payment flow calls this.
 */
export async function uploadReceipt(
  paymentId: string,
  file: { name: string; type: string; size: number; buffer: Buffer },
): Promise<{ path: string; mimeType: string; sizeBytes: number }> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  // Verify the caller owns the payment.
  const { data: payment } = await supabase
    .from("payments")
    .select("id, user_id")
    .eq("id", paymentId)
    .single();
  if (!payment || payment.user_id !== userId) {
    throw new NotFoundError("We couldn't find that payment.");
  }

  await validateUpload(file, "receipt");

  const path = `${paymentId}/${crypto.randomUUID()}.${extFor(file.type, "pdf")}`;
  const { error } = await supabase.storage
    .from(BUCKETS.paymentReceipts)
    .upload(path, file.buffer, { contentType: file.type, upsert: false });

  if (error) throw error;

  return { path, mimeType: file.type, sizeBytes: file.size };
}

/**
 * Shared image-storage routine: validate, generate UUID path, store original,
 * read dimensions. Used by memory images + avatars.
 */
async function storeImage(
  bucket: typeof BUCKETS.avatars | typeof BUCKETS.memoryImages,
  ownerId: string,
  file: { name: string; type: string; size: number; buffer: Buffer },
): Promise<StoredImage> {
  const kind: UploadKind = bucket === BUCKETS.avatars ? "avatar" : "memoryImage";
  await validateUpload(file, kind);

  const ext = extFor(file.type);
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file.buffer, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { width, height } = readImageDimensions(file.buffer);

  return {
    path,
    publicUrl: getPublicUrl(bucket, path),
    width,
    height,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}
