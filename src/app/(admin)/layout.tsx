import { requireAdmin } from "@/lib/authorization";
import { AdminSidebar } from "@/components/navigation/admin-sidebar";

/**
 * Admin layout (Phase 6). Requires the admin role — the (admin) route group
 * is also middleware-guarded, but this is the defense-in-depth check (doc 21).
 * Not indexed (doc 20).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
