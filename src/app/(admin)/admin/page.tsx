import type { Metadata } from "next";
import Link from "next/link";
import { getDashboardMetrics, getActivityFeed } from "@/features/admin/services/dashboard";
import { StatCard } from "@/components/shared/stat-card";
import { ActivityFeed } from "@/features/admin/components/activity-feed";
import { formatEGP } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Admin dashboard overview (Phase 6 #1, #13). Metrics + recent activity feed
 * (from audit_log — no separate activity system).
 */
export default async function AdminDashboardPage() {
  const [metrics, activity] = await Promise.all([
    getDashboardMetrics(),
    getActivityFeed(15),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={metrics.totalUsers} />
        <StatCard label="Total memories" value={metrics.totalMemories} />
        <StatCard
          label="Published"
          value={metrics.publishedMemories}
          tone="success"
        />
        <StatCard
          label="Pending payments"
          value={metrics.pendingPayments}
          tone={metrics.pendingPayments > 0 ? "warning" : "default"}
          hint={
            metrics.pendingPayments > 0
              ? `${metrics.pendingPayments} awaiting review`
              : undefined
          }
        />
        <StatCard
          label="Pending reports"
          value={metrics.pendingReports}
          tone={metrics.pendingReports > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Revenue (total)"
          value={formatEGP(metrics.totalRevenue)}
          tone="success"
        />
        <StatCard
          label="Revenue (this month)"
          value={formatEGP(metrics.revenueThisMonth)}
        />
        <StatCard
          label="Genesis campaign"
          value={`${metrics.genesisUsed} / ${metrics.genesisMax}`}
          hint={
            metrics.genesisEnabled
              ? `${metrics.genesisRemaining} slots remaining`
              : "Campaign closed"
          }
          tone={metrics.genesisEnabled ? "info" : "default"}
        />
      </div>

      {/* Activity feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-faint-foreground">
              Recent activity
            </h2>
          </div>
          <div className="rounded-lg border border-border bg-card">
            <ActivityFeed entries={activity} />
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint-foreground">
            Quick actions
          </h2>
          <div className="space-y-2">
            <QuickLink href="/admin/payments" label="Review payments" />
            <QuickLink href="/admin/reports" label="Review reports" />
            <QuickLink href="/admin/memories" label="Moderate memories" />
            <QuickLink href="/admin/analytics" label="View analytics" />
            <QuickLink href="/admin/settings" label="Manage settings" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:border-nile hover:bg-muted"
    >
      {label}
    </Link>
  );
}
