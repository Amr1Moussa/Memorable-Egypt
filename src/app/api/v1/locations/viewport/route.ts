import { viewportQuerySchema, locationFiltersSchema } from "@/features/locations/schemas";
import { getLocationsInViewport } from "@/features/locations/services";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/v1/locations/viewport
 * Returns active locations inside the current map viewport (Phase 3 #1).
 *
 * Query: west, south, east, north, zoom, [tier], [governorate], [city]
 * Powered by the PostGIS `locations_in_viewport` RPC (migration 0013).
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimit("ip:viewport", "public");
    if (!limited.allowed) {
      throw new ValidationError("Too many requests. Please slow down.");
    }

    const url = new URL(request.url);
    const parsed = viewportQuerySchema.safeParse({
      west: Number(url.searchParams.get("west")),
      south: Number(url.searchParams.get("south")),
      east: Number(url.searchParams.get("east")),
      north: Number(url.searchParams.get("north")),
      zoom: Number(url.searchParams.get("zoom") ?? 5),
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid viewport bounds.",
      );
    }

    const filters = locationFiltersSchema.safeParse({
      tier: url.searchParams.get("tier") ?? undefined,
      governorate: url.searchParams.get("governorate") ?? undefined,
      city: url.searchParams.get("city") ?? undefined,
    }).data ?? {};

    const data = await getLocationsInViewport(parsed.data, filters);
    return ok({ locations: data });
  } catch (error) {
    return handle(error);
  }
}
