import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Public route group layout.
 *
 * Pages here are SEO-indexable (doc 20): landing, explore, location pages,
 * memory pages, categories, public profiles, search, and legal pages.
 * Authenticated routes live in `(app)` / `(admin)` instead.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
