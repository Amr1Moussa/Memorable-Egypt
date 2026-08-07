/**
 * Production environment validation script (Phase 7 #6).
 *
 * Run: `npx tsx scripts/check-env.ts`
 *
 * Validates that all required env vars are present and well-formed before a
 * production deploy. Exits with code 1 on any missing/invalid var.
 *
 * Source: doc 25 (Deployment — Environment Variables + Checklist), Phase 7 #6.
 */
const REQUIRED = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_MAPBOX_TOKEN",
  "MAPBOX_SECRET_TOKEN",
] as const;

const OPTIONAL = [
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE",
  "GEMINI_API_KEY",
] as const;

let hasErrors = false;

console.log("\n🔍 Environment variable check\n");

for (const key of REQUIRED) {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    console.error(`  ❌ ${key} — MISSING (required)`);
    hasErrors = true;
  } else if (value.includes("placeholder")) {
    console.error(`  ❌ ${key} — still a placeholder, set a real value`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${key}`);
  }
}

for (const key of OPTIONAL) {
  const value = process.env[key];
  if (value && !value.includes("placeholder")) {
    console.log(`  ✅ ${key} (optional, set)`);
  } else {
    console.log(`  ⚪ ${key} (optional, not set)`);
  }
}

// URL format checks.
const url = process.env.NEXT_PUBLIC_SITE_URL;
if (url && !url.startsWith("https://")) {
  console.warn(`  ⚠️  NEXT_PUBLIC_SITE_URL should be HTTPS in production`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && !supabaseUrl.startsWith("https://")) {
  console.warn(`  ⚠️  NEXT_PUBLIC_SUPABASE_URL should be HTTPS`);
}

if (hasErrors) {
  console.log("\n❌ Environment check FAILED. Fix the errors above before deploying.\n");
  process.exit(1);
} else {
  console.log("\n✅ All required environment variables are present.\n");
}
