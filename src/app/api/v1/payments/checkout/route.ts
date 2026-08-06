import { checkoutSchema } from "@/features/payments/schemas";
import { createPayment } from "@/features/payments/service";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v1/payments/checkout
 * Create a payment record for a memory (Phase 5 #3, #5). Computes the price
 * server-side, generates a reference, prevents duplicates.
 */
export async function POST(request: Request) {
  try {
    const { id: userId } = await import("@/lib/authorization").then((m) =>
      m.requireUser(),
    );
    const limited = rateLimit(`checkout:${userId}`, "authenticated");
    if (!limited.allowed) {
      throw new ValidationError("Too many requests. Please slow down.");
    }

    const json = (await request.json()) as unknown;
    const parsed = checkoutSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid checkout request.",
      );
    }

    const payment = await createPayment(parsed.data.memoryId, parsed.data.pinType);
    return ok({ payment }, "Payment created.");
  } catch (error) {
    return handle(error);
  }
}
