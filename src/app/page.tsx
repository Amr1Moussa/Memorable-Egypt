import Link from "next/link";
import {
  ROUTES,
  APP_NAME,
  APP_TAGLINE,
  GENESIS_DEFAULTS,
} from "@/lib/constants/app";

/**
 * Landing page placeholder.
 *
 * Phase 1 ships a minimal, on-brand landing that exercises the design
 * tokens. The full landing (hero + map + featured memories + Genesis
 * banner + how-it-works) is built across Phases 3–4 once data exists
 * (doc 10 — Landing Page).
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <span className="border-border bg-surface text-nile inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-widest uppercase">
        {APP_NAME}
      </span>

      <h1 className="mt-6 text-4xl leading-tight font-semibold text-balance sm:text-6xl">
        Every place has a story.
        <br />
        <span className="text-terracotta">
          Make yours part of Egypt&apos;s map.
        </span>
      </h1>

      <p className="text-muted-foreground mt-6 max-w-xl text-base text-pretty sm:text-lg">
        {APP_TAGLINE} {APP_NAME} is a location-first platform where you can
        permanently preserve a memory, story, or confession at any real place in
        Egypt.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={ROUTES.explore}
          className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium shadow-sm transition hover:opacity-90"
        >
          Start exploring
        </Link>
        <Link
          href={ROUTES.register}
          className="border-border bg-surface text-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-medium transition"
        >
          Create your first memory
        </Link>
      </div>

      <p className="text-faint-foreground mt-12 text-sm">
        The Genesis Campaign is coming — the first{" "}
        {GENESIS_DEFAULTS.maxFreePins} approved memories are free.
      </p>
    </main>
  );
}
