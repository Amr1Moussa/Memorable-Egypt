import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Join Memorable Egypt and start preserving your stories.",
  robots: { index: false, follow: false },
};

/**
 * Registration page. Not indexed (doc 20). The form posts to
 * /api/v1/auth/signup, which respects the `registration_enabled` setting.
 */
export default function RegisterPage() {
  return <AuthForm mode="register" redirectAfter="/explore" />;
}
