import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your email address to activate your account.",
  robots: { index: false, follow: false },
};

/**
 * Verify-email landing. Shown right after signup to tell the user to check
 * their inbox. The actual verification happens when they click the email
 * link, which routes through /auth/callback.
 */
export default function VerifyEmailPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Verify your email
        </h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to your inbox. Click it to confirm your
          account, then sign in.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Didn&apos;t get the email? Check your spam folder, or{" "}
        <Link
          href="/login"
          className="font-medium text-nile underline-offset-4 hover:underline"
        >
          try signing in
        </Link>{" "}
        to resend.
      </p>
    </div>
  );
}
