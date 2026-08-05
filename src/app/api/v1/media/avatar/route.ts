import { uploadAvatar } from "@/features/storage/services";
import { requireUser } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v1/media/avatar
 * Upload (replace) the current user's avatar. Multipart form-data, field
 * `file`. Persists profiles.avatar_url after the upload.
 */
export async function POST(request: Request) {
  try {
    const { id: userId } = await requireUser();

    const limited = rateLimit(`user:${userId}:avatar`, "authenticated");
    if (!limited.allowed) {
      throw new ValidationError("Too many uploads. Please wait a moment.");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("Please select an image to upload.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await uploadAvatar({
      name: file.name,
      type: file.type,
      size: file.size,
      buffer,
    });

    // Persist the new avatar URL on the profile.
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({ avatar_url: stored.publicUrl })
      .eq("id", userId);

    return ok({ url: stored.publicUrl }, "Avatar updated.");
  } catch (error) {
    return handle(error);
  }
}
