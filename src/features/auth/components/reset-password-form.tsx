"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPasswordSchema, type ResetPasswordInput } from "../schemas";

/**
 * Reset-password form. Reached via the email link (which exchanges a code
 * via /auth/callback, establishing a recovery session). The user sets a new
 * password here.
 *
 * Source: doc 12 (Password Reset).
 */
export function ResetPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const res = await fetch("/api/v1/auth/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: values.password }),
    });
    const json = (await res.json()) as
      | { success: true }
      | { success: false; error: { message: string } };

    if (!json.success) {
      setServerError(json.error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-semibold">Password updated</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your password has been changed. You can sign in with your new
          password.
        </p>
        <a
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-nile underline-offset-4 hover:underline"
        >
          Continue to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium">
            New password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-xs text-error">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium">
            Confirm password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-error">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        {serverError ? (
          <p
            role="alert"
            className="rounded-md bg-error/10 px-3 py-2 text-sm text-error"
          >
            {serverError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </div>
  );
}
