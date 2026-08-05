import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: "Access denied",
  robots: { index: false, follow: false },
};

/**
 * Friendly 403 destination for non-admins hitting /admin/* (doc 12, 21).
 */
export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-terracotta">
        403
      </p>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
        You don&apos;t have access to this.
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        This area is restricted to administrators. If you think this is a
        mistake, let us know.
      </p>
      <Link
        href={ROUTES.explore}
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        Back to exploring
      </Link>
    </main>
  );
}
