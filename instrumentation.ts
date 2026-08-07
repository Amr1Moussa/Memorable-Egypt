import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook (Phase 7 #5).
 *
 * Loads Sentry config on server/edge runtimes when a DSN is configured.
 * Gracefully no-ops without one (dev/test).
 *
 * Source: doc 27 (Monitoring), Phase 7 requirement #5.
 */
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.server.config");
  }
}

/** Capture unhandled route errors (Next.js 15+). */
export const onRequestError = Sentry.captureRequestError;
