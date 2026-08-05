import { locationSearchSchema } from "@/features/locations/schemas";
import { searchLocations } from "@/features/locations/services";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/v1/locations/search?q=
 * Search locations by free text (doc 13 — Search).
 *
 * The server implementation is currently LIKE-based over name/city/
 * governorate. The function signature is shaped so a fuzzy / FTS / AI backend
 * can replace it WITHOUT changing this endpoint or any caller (Phase 3 #4).
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimit("ip:locsearch", "public");
    if (!limited.allowed) {
      throw new ValidationError("Too many requests. Please slow down.");
    }

    const url = new URL(request.url);
    const parsed = locationSearchSchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      page: url.searchParams.get("page") ?? 1,
      limit: url.searchParams.get("limit") ?? 10,
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid search query.",
      );
    }

    const { data, total } = await searchLocations(parsed.data);
    return ok({ locations: data, total });
  } catch (error) {
    return handle(error);
  }
}
