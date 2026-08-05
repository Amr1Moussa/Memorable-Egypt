import { flattenError } from "zod";
import { signUpSchema } from "@/features/auth/schemas";
import { signUpWithEmail } from "@/features/auth/services";
import { getPublicBool } from "@/features/settings/service";
import { GENERAL_KEYS } from "@/features/settings/constants";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v1/auth/signup
 * Email/Password registration. Respects the registration_enabled setting.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimit("ip:signup", "public");
    if (!limited.allowed) {
      throw new ValidationError("Too many attempts. Please wait a moment.");
    }

    const json = (await request.json()) as unknown;
    const parsed = signUpSchema.safeParse(json);
    if (!parsed.success) {
      const flat = flattenError(parsed.error);
      throw new ValidationError("Please check your details.", {
        email: flat.fieldErrors.email ?? [],
        password: flat.fieldErrors.password ?? [],
      });
    }

    const registrationEnabled = await getPublicBool(
      "general",
      GENERAL_KEYS.registrationEnabled,
      true,
    );

    const result = await signUpWithEmail(parsed.data, registrationEnabled);
    if (!result.success) {
      throw new ValidationError(result.error ?? "We couldn't create your account.");
    }

    return ok(
      { status: "verification_email_sent" },
      "Check your email to verify your account.",
    );
  } catch (error) {
    return handle(error);
  }
}
