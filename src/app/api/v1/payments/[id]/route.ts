import { getPayment, getPaymentMethods } from "@/features/payments/service";
import { ok, handle } from "@/lib/response";

/**
 * GET /api/v1/payments/{id}
 * Load a single payment (owner or admin) + the payment-method details so the
 * status page can show instructions (Phase 5 #5, #6).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [payment, methods] = await Promise.all([
      getPayment(id),
      getPaymentMethods(),
    ]);
    return ok({ payment, methods });
  } catch (error) {
    return handle(error);
  }
}
