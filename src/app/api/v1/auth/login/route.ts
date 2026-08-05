import { flattenError } from "zod";
import { loginSchema } from "@/features/auth/schemas";
import { signInWithEmail } from "@/features/auth/services";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v1/auth/login
 * Email/Password login. Sets the session cookie via Supabase.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimit("ip:login", "public");
    if (!limited.allowed) {
      throw new ValidationError("Too many attempts. Please wait a moment.");
    }

    const json = (await request.json()) as unknown;
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      const flat = flattenError(parsed.error);
      throw new ValidationError("Please check your details.", {
        email: flat.fieldErrors.email ?? [],
        password: flat.fieldErrors.password ?? [],
      });
    }

    const result = await signInWithEmail(parsed.data);
    if (!result.success) {
      throw new ValidationError(result.error ?? "We couldn't sign you in.");
    }

    return ok({ status: "authenticated" }, "Signed in.");
  } catch (error) {
    return handle(error);
  }
}
