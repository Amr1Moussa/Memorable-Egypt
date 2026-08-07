import { updateSettingSchema } from "@/features/admin/schemas";
import { updateSetting } from "@/features/admin/services/manage";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

/**
 * POST /api/v1/admin/settings/update
 * Update a single setting with optimistic concurrency (Phase 6 #6, #11).
 * Sensitive/server-only settings are rejected (never editable via UI).
 */
export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = updateSettingSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid request.",
      );
    }

    await updateSetting(
      parsed.data.settingId,
      parsed.data.expectedUpdatedAt,
      parsed.data.value,
    );
    return ok({ done: true }, "Setting updated.");
  } catch (error) {
    return handle(error);
  }
}
