import { updateLocationSchema } from "@/features/admin/schemas";
import { updateLocation } from "@/features/admin/services/manage";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

/**
 * POST /api/v1/admin/locations/update
 * Update a location's tier and/or status (Phase 6 #5).
 */
export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = updateLocationSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid request.",
      );
    }

    const patch: { tier?: number; status?: "active" | "disabled" } = {};
    if (parsed.data.tier !== undefined) patch.tier = parsed.data.tier;
    if (parsed.data.status !== undefined) patch.status = parsed.data.status;

    await updateLocation(
      parsed.data.locationId,
      parsed.data.expectedUpdatedAt,
      patch,
    );
    return ok({ done: true }, "Location updated.");
  } catch (error) {
    return handle(error);
  }
}
