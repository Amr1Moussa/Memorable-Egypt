import { publishSchema } from "@/features/memories/schemas";
import { publishMemory } from "@/features/memories/services";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { flattenError } from "zod";

/**
 * POST /api/v1/memories/{id}/publish
 * Publish a memory along the free (Genesis) or paid path (Phase 4 #5).
 *
 * Free:  draft → published (auto-moderated for MVP; admin moderation in Phase 6)
 * Paid:  draft → awaiting_payment (Phase 5 wires payment/receipt steps)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const limited = rateLimit(`pub:${id}`, "authenticated");
    if (!limited.allowed) {
      throw new ValidationError("Too many requests. Please slow down.");
    }

    const json = (await request.json()) as unknown;
    const parsed = publishSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        flattenError(parsed.error).formErrors[0] ?? "Invalid publish request.",
      );
    }

    const result = await publishMemory(id, parsed.data.path, parsed.data.pinType);
    return ok(result, "Memory published.");
  } catch (error) {
    return handle(error);
  }
}
