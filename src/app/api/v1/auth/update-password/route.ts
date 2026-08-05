import { z } from "zod";
import { updatePassword } from "@/features/auth/services";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

const bodySchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[a-zA-Z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

/**
 * POST /api/v1/auth/update-password
 * Set a new password after a recovery flow. Requires the recovery session
 * established by /auth/callback.
 */
export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid password.";
      throw new ValidationError(msg);
    }

    const result = await updatePassword(parsed.data.password);
    if (!result.success) {
      throw new ValidationError(result.error ?? "We couldn't update your password.");
    }

    return ok({ status: "password_updated" }, "Your password has been updated.");
  } catch (error) {
    return handle(error);
  }
}
