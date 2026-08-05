import { nearbyQuerySchema } from "@/features/locations/schemas";
import { getNearbyLocations } from "@/features/locations/services";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/v1/locations/nearby
 * Returns active locations within a radius of a point (doc 13 — Nearby Search).
 *
 * Query: lat, lng, radius (meters, default 10000)
 * Powered by the PostGIS `locations_nearby` RPC (migration 0013).
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimit("ip:nearby", "public");
    if (!limited.allowed) {
      throw new ValidationError("Too many requests. Please slow down.");
    }

    const url = new URL(request.url);
    const parsed = nearbyQuerySchema.safeParse({
      lat: Number(url.searchParams.get("lat")),
      lng: Number(url.searchParams.get("lng")),
      radius: url.searchParams.get("radius") ?? 10000,
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid nearby query.",
      );
    }

    const data = await getNearbyLocations(parsed.data);
    return ok({ locations: data });
  } catch (error) {
    return handle(error);
  }
}
