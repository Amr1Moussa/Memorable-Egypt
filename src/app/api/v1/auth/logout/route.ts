import { signOut } from "@/features/auth/services";
import { ok, handle } from "@/lib/response";

/**
 * POST /api/v1/auth/logout
 * Ends the Supabase session.
 */
export async function POST() {
  try {
    await signOut();
    return ok({ status: "signed_out" }, "Signed out.");
  } catch (error) {
    return handle(error);
  }
}
