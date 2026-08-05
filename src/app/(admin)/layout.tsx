/**
 * Admin dashboard layout.
 *
 * Requires the `admin` role (Phase 6). Unauthorized users receive 403
 * (docs 12, 21). NOT SEO-indexed (doc 20). Phase 6 will replace this
 * minimal shell with the admin sidebar + top bar.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="bg-background min-h-screen">{children}</main>;
}
