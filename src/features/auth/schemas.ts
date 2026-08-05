import { z } from "zod";
import { usernameSchema } from "@/lib/validations/common";
import { normalizeUsername } from "@/features/profile/constants";

/**
 * Auth validation schemas (Zod). Shared by client forms and server route
 * handlers — one source of truth per doc 05/09.
 *
 * Source: docs 12 (Authentication), 01 (PRD §10.1).
 */

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);

// Password rules: 8+ chars, mix of letters and numbers. Supabase Auth also
// enforces these server-side; we keep them aligned here for instant feedback.
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

/** Sign-up form. Username is set during profile completion, not signup. */
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

/** Login form. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Forgot-password request. */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** Reset-password form (after clicking the email link). */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Profile completion form (first login). Username + display name.
 * Username is normalized (trim + lowercase) BEFORE validation per Phase 2.3
 * requirement #2, then checked against the lowercase-only format. Reserved
 * names are checked in the service.
 */
export const completeProfileSchema = z.object({
  username: z
    .string()
    .transform((v) => normalizeUsername(v))
    .pipe(usernameSchema),
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or fewer"),
});
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
