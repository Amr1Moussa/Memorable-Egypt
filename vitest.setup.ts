/**
 * Vitest setup — sets placeholder env vars so modules that import
 * `lib/env.ts` (which validates at module load) don't crash during tests.
 *
 * Real integration tests that need a live Supabase project set their own
 * env in CI.
 */
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-key";
process.env.NEXT_PUBLIC_MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "test-mapbox-token";
process.env.MAPBOX_SECRET_TOKEN =
  process.env.MAPBOX_SECRET_TOKEN ?? "test-mapbox-secret";
