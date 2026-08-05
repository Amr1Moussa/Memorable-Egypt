import { z } from "zod";

/**
 * Environment variable validation.
 *
 * `process.env` is validated once at module load with Zod. Missing or
 * malformed required keys fail fast instead of crashing later. The
 * schema is split into:
 *   - `serverEnv`  : secret/server-only keys (never prefixed).
 *   - `clientEnv`  : public keys exposed to the browser (`NEXT_PUBLIC_*`).
 *
 * Crucially, `clientEnv` is the ONLY object safe to import from client
 * components. `serverEnv` imports must stay inside `app/api`, Server
 * Components, middleware, and `lib/supabase/*`.
 *
 * Source: doc 05 (Environment Variables), doc 21 (Security),
 *         doc 25 (Deployment).
 */

const url = z.string().url();

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // ---- Supabase (server) ----
  // The service role key bypasses RLS and is therefore SERVER-ONLY.
  // It must never be referenced by client code or shipped to the browser.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // ---- Mapbox (server geocoding) ----
  // Public token is fine in the browser; the secret token is server-only.
  MAPBOX_SECRET_TOKEN: z.string().min(1),

  // ---- AI provider key (future use; not active in MVP per ADR 0001) ----
  // Present so we never have to refactor env loading when AI is enabled.
  GEMINI_API_KEY: z.string().optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: url.default("http://localhost:3000"),
});

/**
 * Parse and freeze both envs. Throws with a readable message if any
 * required variable is missing or invalid — the caller (boot) shows the
 * actionable error rather than an opaque runtime crash.
 */
function parseEnv() {
  const serverParsed = serverEnvSchema.safeParse(process.env);
  const clientParsed = clientEnvSchema.safeParse(process.env);

  if (!serverParsed.success || !clientParsed.success) {
    const issues = [
      ...(serverParsed.success ? [] : serverParsed.error.issues),
      ...(clientParsed.success ? [] : clientParsed.error.issues),
    ];
    const formatted = issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${formatted}\n\nCheck .env.local against .env.example.`,
    );
  }

  return {
    server: serverParsed.data,
    client: clientParsed.data,
  };
}

const parsed = parseEnv();

/**
 * Server-only env access. Importing this from a client component is a
 * build error by convention — keep all server-only code out of the
 * `"use client"` boundary.
 */
export const serverEnv = parsed.server;

/**
 * Client-safe env access. Safe to import anywhere.
 */
export const clientEnv = parsed.client;
