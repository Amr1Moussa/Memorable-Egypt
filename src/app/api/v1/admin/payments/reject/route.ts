import { rejectPaymentSchema } from "@/features/admin/schemas";
import { rejectPayment } from "@/features/admin/services/payments";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

/**
 * POST /api/v1/admin/payments/reject
 * Reject a payment with a required reason (Phase 6 #2).
 */
export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = rejectPaymentSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid request.",
      );
    }

    await rejectPayment(
      parsed.data.paymentId,
      parsed.data.expectedUpdatedAt,
      parsed.data.reason,
    );
    return ok({ rejected: true }, "Payment rejected.");
  } catch (error) {
    return handle(error);
  }
}
