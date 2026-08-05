"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../schemas";

/**
 * Forgot-password form. We always show a success message regardless of
 * whether the email exists, to avoid leaking account existence (doc 21).
 *
 * Source: doc 12 (Forgot Password), 21 (Security).
 */
export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const [done, setDone] = useState(false);

  async function onSubmit(values: ForgotPasswordInput) {
    await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for that address, we&apos;ve sent a password reset
          link.
        </p>
        <a
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-nile underline-offset-4 hover:underline"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-error">{errors.email.message}</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Sending link…
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </div>
  );
}
