import { memoryPatchSchema } from "@/features/memories/schemas";
import {
  getMyMemory,
  patchDraft,
  deleteDraft,
  setMemoryTags,
} from "@/features/memories/services";
import { ok, noContent, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { flattenError } from "zod";

/**
 * GET /api/v1/memories/{id}
 * Load a memory owned by the current user (for editing/preview).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const memory = await getMyMemory(id);
    return ok({ memory });
  } catch (error) {
    return handle(error);
  }
}

/**
 * PATCH /api/v1/memories/{id}
 * Auto-save / update a draft. Body may also include `tags` (replaces the set).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const limited = rateLimit(`mem:${id}`, "authenticated");
    if (!limited.allowed) {
      throw new ValidationError("Saving too fast. Please wait a moment.");
    }

    const json = (await request.json()) as Record<string, unknown>;
    const { tags, ...rest } = json;

    // Patch the scalar fields (if any).
    if (Object.keys(rest).length > 0) {
      const parsed = memoryPatchSchema.safeParse(rest);
      if (!parsed.success) {
        throw new ValidationError(
          flattenError(parsed.error).formErrors[0] ?? "Please check your memory.",
        );
      }
      await patchDraft(id, parsed.data);
    }

    // Tags replaced if provided.
    if (Array.isArray(tags)) {
      await setMemoryTags(id, tags.filter((t): t is string => typeof t === "string"));
    }

    return ok({ saved: true }, "Saved.");
  } catch (error) {
    return handle(error);
  }
}

/**
 * DELETE /api/v1/memories/{id}
 * Soft-delete a draft.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteDraft(id);
    return noContent();
  } catch (error) {
    return handle(error);
  }
}
