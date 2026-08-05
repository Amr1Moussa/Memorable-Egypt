import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Memorable Egypt.",
  robots: { index: false, follow: false },
};

/**
 * Login page. Not indexed (doc 20). The form posts to /api/v1/auth/login,
 * which redirects to /explore on success.
 */
export default function LoginPage() {
  return <AuthForm mode="login" redirectAfter="/explore" />;
}
