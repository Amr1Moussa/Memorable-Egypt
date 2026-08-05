import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Server (per-request) Supabase client.
 *
 * Bound to the incoming request's cookies so it carries the user's
 * session. Still uses the anon key + RLS — this is the documented
 * pattern for Next.js App Router Server Components and Route Handlers
 * (doc 05, 12). For privileged admin operations use `./admin.ts`.
 *
 * Source: doc 12 (Authentication), doc 21 (Security).
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // Safe to ignore if middleware refreshes sessions (doc 12).
          }
        },
      },
    },
  );
}
