/**
 * Auth route group layout.
 *
 * Login/register/forgot-password live here. These pages are NOT
 * SEO-indexed (doc 20). Phase 2 adds the centered card chrome and
 * any branding panel. No header/footer — auth screens are focused.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
