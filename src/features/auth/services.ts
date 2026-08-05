import { createClient } from "@/lib/supabase/server";
import { clientEnv } from "@/lib/env";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";
import { logger } from "@/lib/logger";
import type { SignUpInput, LoginInput } from "../auth/schemas";

/**
 * Auth services (server-only).
 *
 * Supabase Auth is the SINGLE SOURCE OF TRUTH for identity (Phase 2.2
 * requirement #1): email, password, OAuth, session, email-verification, and
 * password-reset all flow through `supabase.auth`. The `profiles` table holds
 * application metadata only (display name, username, role, genesis flags).
 *
 * Every auth outcome is recorded via `logAuditEvent` (Phase 2.2 requirement).
 *
 * Source: docs 12 (Authentication), 05 (System Architecture).
 */

export interface AuthResult {
  success: boolean;
  /** Supabase error short code, surfaced to the UI as a friendly message. */
  error?: string;
}

const FRIENDLY_ERRORS: Record<string, string> = {
  invalid_credentials: "That email and password don't match.",
  email_address_invalid_credentials: "That email and password don't match.",
  user_already_exists: "An account with that email already exists.",
  email_address_not_authorized: "Sign-ups are not enabled for this email.",
  email_not_confirmed: "Please verify your email before signing in.",
  over_request_rate_limit: "Too many attempts. Please wait a moment.",
  rate_limit_exceeded: "Too many attempts. Please wait a moment.",
  weak_password: "Please choose a stronger password.",
  reauthentication_needed: "Please sign in again to continue.",
  user_not_found: "We couldn't find an account with that email.",
};

function friendlyError(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  return FRIENDLY_ERRORS[code] ?? fallback;
}

// ---------------------------------------------------------------------------
// Sign up (Email/Password)
// ---------------------------------------------------------------------------

export async function signUpWithEmail(
  input: SignUpInput,
  registrationEnabled: boolean,
): Promise<AuthResult> {
  if (!registrationEnabled) {
    return { success: false, error: "New registrations are currently disabled." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    logger.warn("signup failed", { code: error.code });
    return {
      success: false,
      error: friendlyError(error.code, "We couldn't create your account."),
    };
  }

  // The on_auth_user_created trigger inserts the profiles row.
  if (data.user) {
    await logAuditEvent({
      actorId: data.user.id,
      action: AUDIT_ACTIONS.USER_REGISTERED,
    });
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Sign in (Email/Password)
// ---------------------------------------------------------------------------

export async function signInWithEmail(input: LoginInput): Promise<AuthResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    await logAuditEvent({
      actorId: null,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      metadata: { email: input.email, code: error?.code },
    });
    return {
      success: false,
      error: friendlyError(error?.code, "We couldn't sign you in."),
    };
  }

  // Successful login — record + detect admin login.
  await logAuditEvent({
    actorId: data.user.id,
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
  });

  // Check role for the separate ADMIN_LOGIN event.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (profile?.role === "admin") {
    await logAuditEvent({
      actorId: data.user.id,
      action: AUDIT_ACTIONS.ADMIN_LOGIN,
    });
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

/**
 * Mark the email-verified audit event after the OAuth/email callback
 * exchanges a valid code. Called from the callback route handler.
 */
export async function recordEmailVerified(userId: string): Promise<void> {
  await logAuditEvent({
    actorId: userId,
    action: AUDIT_ACTIONS.EMAIL_VERIFIED,
  });
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  // Always log the request. Note: we return success even on unknown emails to
  // avoid leaking which addresses have accounts (doc 21 — privacy).
  await logAuditEvent({
    actorId: null,
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    metadata: { email },
  });

  if (error) {
    // Soft-fail: don't reveal whether the email exists.
    logger.warn("password reset request failed", { code: error.code });
  }
  return { success: true };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return {
      success: false,
      error: friendlyError(error.code, "We couldn't update your password."),
    };
  }

  if (user) {
    await logAuditEvent({
      actorId: user.id,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    });
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

/**
 * Build the Google OAuth redirect URL. The browser navigates here; Supabase
 * handles the OAuth dance and returns to `/auth/callback`.
 */
export async function getGoogleOAuthUrl(redirectAfter: string): Promise<string> {
  const supabase = await createClient();
  const next = redirectAfter.startsWith("/") ? redirectAfter : "/";
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (!data.url) {
    throw new Error("Google OAuth is not configured.");
  }
  return data.url;
}
