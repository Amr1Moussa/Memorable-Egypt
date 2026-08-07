import Link from "next/link";
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Flag,
  Users,
  MapPin,
  Settings,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Admin sidebar navigation (Phase 6). Fixed on desktop, collapsed on mobile.
 * Links map to the eight admin sections (doc 18 — Dashboard Navigation).
 *
 * Source: doc 18 (Admin Dashboard — Navigation), Phase 6 requirement #1.
 */
const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/memories", label: "Memories", icon: FileText },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-border bg-surface lg:block">
      <div className="px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-nile">
          Admin
        </p>
        <nav className="mt-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
