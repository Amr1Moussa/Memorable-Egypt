import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordEmailVerified } from "@/features/auth/services";
import { logger } from "@/lib/logger";
import { clientEnv } from "@/lib/env";

/**
 * OAuth + email-verification callback.
 *
 * Supabase redirects here with a `code` after:
 *   - Google OAuth sign-in/sign-up
 *   - Email verification link click
 *   - Password-reset link click (recovery)
 *
 * We exchange the code for a session (cookie-bound), record the
 * email-verified audit event if applicable, then redirect to the `next`
 * target (defaulting to /explore, or /reset-password for recovery flows).
 *
 * NOT under a route group — sits at the app root so the URL is `/auth/callback`
 * exactly as configured in `auth/emailRedirectTo`.
 *
 * Source: doc 12 (Authentication), Supabase SSR docs.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  // Supabase sets `type=recovery` for password-reset links.
  const type = url.searchParams.get("type");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  // Supabase OAuth/error passthrough — show the error on the login page.
  if (errorParam) {
    const loginUrl = new URL("/login", siteUrl);
    loginUrl.searchParams.set("error", errorDescription || errorParam);
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", siteUrl));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    logger.warn("auth callback code exchange failed", {
      code: error?.code,
    });
    const loginUrl = new URL("/login", siteUrl);
    loginUrl.searchParams.set(
      "error",
      error?.message ?? "We couldn't verify your sign-in link.",
    );
    return NextResponse.redirect(loginUrl);
  }

  // Record email-verified for verification-type flows (not recovery).
  if (type !== "recovery") {
    await recordEmailVerified(data.user.id);
  }

  // Recovery flow → send to the password-reset form.
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", siteUrl));
  }

  // Default: send to the `next` target (sanitized to a relative path).
  const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : "/explore";
  return NextResponse.redirect(new URL(safeNext, siteUrl));
}
