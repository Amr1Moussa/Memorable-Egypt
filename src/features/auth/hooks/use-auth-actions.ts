"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/app";

/**
 * Client-side auth actions. These wrap the browser Supabase client for
 * flows that happen entirely on the client (sign out, OAuth redirect).
 * Email/password flows go through route handlers (server-side) for audit
 * logging and settings checks (registration_enabled, maintenance_mode).
 *
 * Source: doc 12 (Authentication), 09 (Frontend Architecture).
 */
export function useAuthActions() {
  const supabase = createClient();
  const router = useRouter();

  const signInWithGoogle = useCallback(async (next = "/") => {
    const safeNext = next.startsWith("/") ? next : "/";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    });
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push(ROUTES.home);
    router.refresh();
  }, [supabase, router]);

  return { signInWithGoogle, signOut };
}
