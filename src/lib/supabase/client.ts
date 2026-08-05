"use client";

import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Browser (anon) Supabase client.
 *
 * Uses the public anon key and is therefore constrained entirely by
 * Row-Level Security (doc 07, 21). RLS is the *primary* access-control
 * mechanism for this client; route-handler checks are defense-in-depth.
 *
 * Source: doc 12 (Authentication), doc 21 (Security).
 */
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
