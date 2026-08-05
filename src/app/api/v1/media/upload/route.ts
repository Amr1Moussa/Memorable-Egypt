import { uploadMemoryImage } from "@/features/storage/services";
import { persistMemoryImage } from "@/features/storage/metadata";
import { requireUser } from "@/lib/authorization";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v1/media/upload
 * Upload a single image to a memory the caller owns. Multipart form-data:
 *   - memoryId: uuid
 *   - file: image
 *   - altText?: string
 *   - sortOrder?: number
 *
 * Returns the persisted memory_media record. The create-memory wizard calls
 * this per-image after the memory draft exists.
 */
export async function POST(request: Request) {
  try {
    const { id: userId } = await requireUser();

    const limited = rateLimit(`user:${userId}:media`, "authenticated");
    if (!limited.allowed) {
      throw new ValidationError("Too many uploads. Please wait a moment.");
    }

    const form = await request.formData();
    const memoryId = form.get("memoryId");
    const file = form.get("file");
    const altText = form.get("altText");
    const sortOrder = form.get("sortOrder");

    if (typeof memoryId !== "string" || !memoryId) {
      throw new ValidationError("Memory id is required.");
    }
    if (!(file instanceof File)) {
      throw new ValidationError("Please select an image to upload.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await uploadMemoryImage(memoryId, {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer,
    });

    const record = await persistMemoryImage(memoryId, stored, {
      altText: typeof altText === "string" ? altText : undefined,
      sortOrder:
        typeof sortOrder === "string" ? Number(sortOrder) || 0 : undefined,
    });

    return ok(
      {
        id: record.id,
        url: stored.publicUrl,
        width: stored.width,
        height: stored.height,
      },
      "Image uploaded.",
    );
  } catch (error) {
    return handle(error);
  }
}
