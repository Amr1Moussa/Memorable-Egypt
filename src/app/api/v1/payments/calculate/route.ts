import { calculateSchema } from "@/features/payments/schemas";
import { computePrice } from "@/features/payments/pricing";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

/**
 * POST /api/v1/payments/calculate
 * Compute the price for a tier × pin type from the live settings (Phase 5 #1).
 * Public — used by the pricing display. The client never sends a price.
 */
export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = calculateSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid pricing request.",
      );
    }

    const breakdown = await computePrice(
      parsed.data.tier,
      parsed.data.pinType,
      false,
    );
    return ok({ ...breakdown });
  } catch (error) {
    return handle(error);
  }
}
