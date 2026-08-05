import Link from "next/link";
import { Container } from "./container";
import { APP_NAME, ROUTES } from "@/lib/constants/app";

/**
 * Footer (docs 10, 23 — Legal pages linked from footer).
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-border bg-surface border-t">
      <Container className="text-muted-foreground flex flex-col items-center justify-between gap-4 py-8 text-sm sm:flex-row">
        <p>
          © {year} {APP_NAME}. Every place has a story.
        </p>
        <nav className="flex items-center gap-5">
          <Link
            href={ROUTES.terms}
            className="hover:text-foreground transition"
          >
            Terms
          </Link>
          <Link
            href={ROUTES.privacy}
            className="hover:text-foreground transition"
          >
            Privacy
          </Link>
          <Link
            href={ROUTES.cookies}
            className="hover:text-foreground transition"
          >
            Cookies
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
