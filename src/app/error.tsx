"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * Global error boundary (doc 05 — Error Handling, doc 10 — Error States).
 *
 * This must be a Client Component (Next.js requirement). We log the
 * error to the structured logger (which forwards to Sentry in prod per
 * doc 27) and offer a recovery action. Technical details are never
 * shown to the user (doc 10).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Unhandled route error", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold sm:text-3xl">
        Something went wrong.
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md">
        We hit an unexpected snag loading this page. You can try again, and
        we&apos;ve been notified of the issue.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-primary text-primary-foreground mt-8 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
