import { approvePaymentSchema } from "@/features/admin/schemas";
import { approvePayment } from "@/features/admin/services/payments";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

/**
 * POST /api/v1/admin/payments/approve
 * Approve a payment → publishes the memory + logs audit (Phase 6 #2).
 * Optimistic concurrency via expectedUpdatedAt (Phase 6 #11).
 */
export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = approvePaymentSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid request.",
      );
    }

    await approvePayment(
      parsed.data.paymentId,
      parsed.data.expectedUpdatedAt,
    );
    return ok({ approved: true }, "Payment approved. Memory published.");
  } catch (error) {
    return handle(error);
  }
}
