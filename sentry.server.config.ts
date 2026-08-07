import * as Sentry from "@sentry/nextjs";

/**
 * Sentry server-side config (Phase 7 #5, doc 27).
 *
 * Source: doc 27 (Monitoring — Error Tracking), Phase 7 requirement #5.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0),
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production" || Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});
