import { moderateMemorySchema } from "@/features/admin/schemas";
import { moderateMemory } from "@/features/admin/services/moderation";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

/**
 * POST /api/v1/admin/memories/moderate
 * Moderate a single memory (hide/restore/delete/feature/unfeature).
 * Phase 6 #3, #11.
 */
export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = moderateMemorySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid request.",
      );
    }

    await moderateMemory(
      parsed.data.memoryId,
      parsed.data.expectedUpdatedAt,
      parsed.data.action,
    );
    return ok({ done: true }, `Memory ${parsed.data.action}d.`);
  } catch (error) {
    return handle(error);
  }
}
