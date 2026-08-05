"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleButton } from "./google-button";
import { cn } from "@/lib/utils/cn";
import {
  loginSchema,
  signUpSchema,
  type LoginInput,
  type SignUpInput,
} from "../schemas";

type Mode = "login" | "register";

/**
 * Shared Email/Password form for login and signup. Uses RHF + Zod (doc 09).
 *
 * Submits to the matching route handler (server-side) so we get audit logging,
 * the registration_enabled check, and friendly error mapping in one place.
 *
 * Source: doc 12 (Authentication), 10 (UI/UX — Forms), 09 (Forms).
 */
export function AuthForm({
  mode,
  redirectAfter = "/",
}: {
  mode: Mode;
  redirectAfter?: string;
}) {
  const isLogin = mode === "login";
  const schema = isLogin ? loginSchema : signUpSchema;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput & SignUpInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(values: LoginInput & SignUpInput) {
    setServerError(null);
    const endpoint = isLogin ? "/api/v1/auth/login" : "/api/v1/auth/signup";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = (await res.json()) as
      | { success: true }
      | { success: false; error: { message: string } };

    if (!json.success) {
      setServerError(json.error.message);
      return;
    }

    if (isLogin) {
      window.location.assign(redirectAfter);
      return;
    }
    // Signup: show the "check your email" confirmation state.
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a verification link. Click it to confirm your account, then
          sign in.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isLogin
            ? "Sign in to preserve and explore memories."
            : "Join Memorable Egypt and start preserving your stories."}
        </p>
      </div>

      <GoogleButton redirectAfter={redirectAfter} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-surface px-2 text-faint-foreground">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder="••••••••"
          helper={
            isLogin ? undefined : "At least 8 characters with a letter and a number."
          }
          error={errors.password?.message}
          {...register("password")}
        />

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
              {isLogin ? "Signing in…" : "Creating account…"}
            </>
          ) : isLogin ? (
            "Sign in"
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? "New to Memorable Egypt? " : "Already have an account? "}
        <a
          href={isLogin ? "/register" : "/login"}
          className="font-medium text-nile underline-offset-4 hover:underline"
        >
          {isLogin ? "Create an account" : "Sign in"}
        </a>
      </p>
    </div>
  );
}

/** Local field wrapper to keep the form readable. */
function Field({
  id,
  label,
  helper,
  error,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  helper?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(error && "border-error", className)}
        {...rest}
      />
      {helper && !error ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
