/**
 * Root loading state (doc 10 — Loading States).
 * Skeleton-only, no blocking spinners.
 */
export default function Loading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
    </div>
  );
}
