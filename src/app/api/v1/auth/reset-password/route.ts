import { forgotPasswordSchema } from "@/features/auth/schemas";
import { requestPasswordReset } from "@/features/auth/services";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v1/auth/reset-password
 * Request a password-reset email. Always returns success to avoid leaking
 * which addresses have accounts (doc 21).
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimit("ip:reset", "public");
    if (!limited.allowed) {
      throw new ValidationError("Too many attempts. Please wait a moment.");
    }

    const json = (await request.json()) as unknown;
    const parsed = forgotPasswordSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError("Enter a valid email address.");
    }

    await requestPasswordReset(parsed.data.email);

    return ok(
      { status: "reset_link_sent" },
      "If that account exists, a reset link is on its way.",
    );
  } catch (error) {
    return handle(error);
  }
}
