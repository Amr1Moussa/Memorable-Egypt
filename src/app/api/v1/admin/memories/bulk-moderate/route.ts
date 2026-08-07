import { bulkModerateSchema } from "@/features/admin/schemas";
import { bulkModerateMemories } from "@/features/admin/services/moderation";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

/**
 * POST /api/v1/admin/memories/bulk-moderate
 * Bulk moderate memories (Phase 6 #12). Atomic version check; all-or-nothing.
 */
export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = bulkModerateSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid request.",
      );
    }

    const result = await bulkModerateMemories(parsed.data.items, parsed.data.action);
    return ok(result, `${result.processed} memories ${parsed.data.action}d.`);
  } catch (error) {
    return handle(error);
  }
}
