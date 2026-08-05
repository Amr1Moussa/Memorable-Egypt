import Link from "next/link";
import { ROUTES, APP_NAME } from "@/lib/constants/app";

/**
 * Global 404 (doc 20 — 404 Pages).
 * Friendly message + search + explore CTA. Component styling relies on
 * shadcn/ui primitives added next.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-nile text-sm font-medium tracking-widest uppercase">
        404
      </p>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
        This place isn&apos;t on the map yet.
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md">
        The page you&apos;re looking for may have moved, or never existed.
        Let&apos;s get you back to exploring Egypt.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={ROUTES.explore}
          className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
        >
          Explore the map
        </Link>
        <Link
          href={ROUTES.home}
          className="border-border text-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-medium transition"
        >
          Back to {APP_NAME}
        </Link>
      </div>
    </main>
  );
}
