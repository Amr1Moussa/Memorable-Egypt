import { createClient } from "@/lib/supabase/server";
import type { StoredImage } from "./services";

/**
 * Persist image metadata to `memory_media` (Phase 2.3 requirement #4).
 *
 * Stored columns (migration 0003): storage_path, public_url, alt_text,
 * width, height, size_bytes, mime_type, sort_order.
 *
 * The StoredImage returned by the upload service carries everything except
 * alt_text (user-supplied, optional) and sort_order (caller-supplied).
 *
 * Source: doc 16 (Storage — Metadata Stored), Phase 2.3 requirement #4.
 */

export interface MemoryMediaRecord {
  id: string;
}

/** Insert a memory_media row for a stored image. */
export async function persistMemoryImage(
  memoryId: string,
  image: StoredImage,
  options: { altText?: string; sortOrder?: number } = {},
): Promise<MemoryMediaRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_media")
    .insert({
      memory_id: memoryId,
      storage_path: image.path,
      public_url: image.publicUrl,
      alt_text: options.altText ?? null,
      width: image.width,
      height: image.height,
      size_bytes: image.sizeBytes,
      mime_type: image.mimeType,
      sort_order: options.sortOrder ?? 0,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

/**
 * Soft-detach images when a memory is deleted. The memory_media rows are
 * cascaded on memory delete (migration 0003 ON DELETE CASCADE), so the
 * storage objects become orphaned. A future cleanup job removes them after
 * the retention period (doc 16 — Cleanup).
 */
export async function listMemoryImages(memoryId: string): Promise<
  {
    id: string;
    storage_path: string;
    public_url: string;
    alt_text: string | null;
    width: number | null;
    height: number | null;
    sort_order: number;
  }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_media")
    .select(
      "id, storage_path, public_url, alt_text, width, height, sort_order",
    )
    .eq("memory_id", memoryId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
