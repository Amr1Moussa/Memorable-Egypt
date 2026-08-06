import { memoryDraftSchema, myMemoriesQuerySchema } from "@/features/memories/schemas";
import {
  createDraft,
  listMyMemories,
} from "@/features/memories/services";
import { ok, created, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { flattenError } from "zod";

/**
 * POST /api/v1/memories
 * Create a new draft memory.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimit("ip:create", "authenticated");
    if (!limited.allowed) {
      throw new ValidationError("Too many requests. Please slow down.");
    }

    const json = (await request.json()) as unknown;
    const parsed = memoryDraftSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        flattenError(parsed.error).formErrors[0] ?? "Please check your memory.",
      );
    }

    const result = await createDraft(parsed.data);
    return created({ id: result.id }, "Draft created.");
  } catch (error) {
    return handle(error);
  }
}

/**
 * GET /api/v1/memories
 * List the current user's memories (drafts + published).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = myMemoriesQuerySchema.safeParse({
      page: url.searchParams.get("page") ?? 1,
      limit: url.searchParams.get("limit") ?? 20,
      status: url.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters.");
    }

    const { data, total } = await listMyMemories(
      parsed.data.status,
      parsed.data.page,
      parsed.data.limit,
    );
    return ok({ memories: data, total });
  } catch (error) {
    return handle(error);
  }
}
