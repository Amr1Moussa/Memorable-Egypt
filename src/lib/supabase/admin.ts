import { createClient as createServiceClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/lib/env";

/**
 * Admin (service-role) Supabase client.
 *
 * Uses the service role key, which **bypasses Row-Level Security**. It
 * is therefore restricted to:
 *   - route handlers in `app/api/v1/admin/*`
 *   - trusted background jobs (webhooks, scheduled tasks)
 *
 * Callers must ALWAYS authorize the user first (admin role check) and
 * audit-log the action. Never import this from a client component — the
 * import path itself (`@/lib/env` with `serverEnv`) keeps it out of the
 * browser bundle.
 *
 * Source: doc 21 (Security), doc 05 (System Architecture).
 */
export function createAdminClient() {
  return createServiceClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // The admin client should never create sessions or persist keys.
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
