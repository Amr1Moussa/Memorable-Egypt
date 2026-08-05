import Link from "next/link";
import { Map, Search } from "lucide-react";
import { Container } from "./container";
import { APP_NAME, ROUTES } from "@/lib/constants/app";

/**
 * Top navigation (doc 10 — Primary Navigation).
 *
 * Phase 1 ships the brand + two public links. Phase 2 adds the
 * auth-aware CTA (Sign in / Create memory / avatar menu) and the mobile
 * bottom nav (doc 10 — Mobile) as a separate component.
 */
export function SiteHeader() {
  return (
    <header className="border-border bg-surface/80 sticky top-0 z-40 border-b backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href={ROUTES.home}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Map className="text-nile h-5 w-5" aria-hidden />
          {APP_NAME}
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href={ROUTES.explore}
            className="text-foreground hover:bg-muted rounded-md px-3 py-2 font-medium transition"
          >
            Explore
          </Link>
          <Link
            href={ROUTES.search}
            className="text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-medium transition"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Search</span>
          </Link>
        </nav>
      </Container>
    </header>
  );
}
