import { SiteHeader } from "@/components/layout/site-header";

/**
 * Authenticated user area layout.
 *
 * Routes here require a session (middleware-enforced in Phase 2):
 *   /create, /memories (mine), /payments, /profile, /profile/edit, /settings
 *
 * These pages are NOT SEO-indexed (doc 20). The same top header as the
 * public area keeps navigation consistent (doc 10).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
