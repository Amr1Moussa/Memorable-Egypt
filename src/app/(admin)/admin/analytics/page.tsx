import type { Metadata } from "next";
import { getAnalytics } from "@/features/admin/services/manage";
import { StatCard } from "@/components/shared/stat-card";
import { formatEGP } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Admin — Analytics",
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPage() {
  const a = await getAnalytics();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>

      {/* Users */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint-foreground">
          Users
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total" value={a.users.total} />
          <StatCard label="Today" value={a.users.today} />
          <StatCard label="This week" value={a.users.thisWeek} />
          <StatCard label="This month" value={a.users.thisMonth} />
        </div>
      </section>

      {/* Memories */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint-foreground">
          Memories
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total" value={a.memories.total} />
          <StatCard label="Published" value={a.memories.published} tone="success" />
          <StatCard label="Drafts" value={a.memories.drafts} />
          <StatCard label="Legacy pins" value={a.memories.legacy} tone="info" />
        </div>
      </section>

      {/* Revenue */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint-foreground">
          Revenue
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total (approved)"
            value={formatEGP(a.revenue.total)}
            tone="success"
          />
          <StatCard
            label="Standard pins"
            value={formatEGP(a.revenue.byPinType.standard)}
          />
          <StatCard
            label="Legacy pins"
            value={formatEGP(a.revenue.byPinType.legacy)}
          />
          <StatCard
            label="By tier"
            value={
              Object.entries(a.revenue.byTier)
                .map(([t, v]) => `T${t}: ${formatEGP(v)}`)
                .join("  ") || "—"
            }
          />
        </div>
      </section>

      {/* Genesis */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint-foreground">
          Genesis campaign
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Claimed" value={a.genesis.used} />
          <StatCard label="Remaining" value={a.genesis.max - a.genesis.used} />
          <StatCard label="Progress" value={`${a.genesis.percent}%`} tone="info" />
        </div>
      </section>

      {/* Top locations */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint-foreground">
          Top locations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-faint-foreground">
                <th className="pb-2 pr-4 font-medium">Location</th>
                <th className="pb-2 font-medium">Memories</th>
              </tr>
            </thead>
            <tbody>
              {a.topLocations.map((l, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{l.name}</td>
                  <td className="py-2 tabular-nums">{l.memoryCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
