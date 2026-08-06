import { listPaymentHistory } from "@/features/payments/service";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

/**
 * GET /api/v1/payments/history
 * The current user's payment history (Phase 5 #5). Owner-only (RLS + service).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    if (!Number.isFinite(page) || page < 1) {
      throw new ValidationError("Invalid page.");
    }

    const { data, total } = await listPaymentHistory(page, limit);
    return ok({ payments: data, total });
  } catch (error) {
    return handle(error);
  }
}
