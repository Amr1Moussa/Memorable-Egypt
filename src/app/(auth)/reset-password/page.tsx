import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Set new password",
  description: "Choose a new password for your account.",
  robots: { index: false, follow: false },
};

/**
 * Reset-password page. Reached after the user clicks the email link, which
 * routes through /auth/callback to exchange the recovery code and establish
 * a session, then redirects here.
 */
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
