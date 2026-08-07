import type { Metadata } from "next";
import { listLocations } from "@/features/admin/services/manage";
import { formatRelative } from "@/lib/utils/format";
import { LocationActions } from "./location-actions";

export const metadata: Metadata = {
  title: "Admin — Locations",
  robots: { index: false, follow: false },
};

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const { data: locations } = await listLocations(1, 50, sp.q);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search locations…"
          className="h-9 flex-1 rounded-md border border-input bg-surface px-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-faint-foreground">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Governorate</th>
              <th className="pb-2 pr-4 font-medium">Tier</th>
              <th className="pb-2 pr-4 font-medium">Memories</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id} className="border-b border-border/50">
                <td className="py-2 pr-4 font-medium">{l.name}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {l.governorate ?? "—"}
                </td>
                <td className="py-2 pr-4">
                  <LocationActions
                    locationId={l.id}
                    updatedAt={l.updatedAt}
                    tier={l.tier}
                    status={l.status}
                  />
                </td>
                <td className="py-2 pr-4 tabular-nums">{l.memoryCount}</td>
                <td className="py-2 pr-4">
                  {l.status === "active" ? (
                    <span className="text-xs text-success">Active</span>
                  ) : l.status === "pending" ? (
                    <span className="text-xs text-warning">Pending</span>
                  ) : (
                    <span className="text-xs text-error">Disabled</span>
                  )}
                </td>
                <td className="py-2 text-xs text-muted-foreground">
                  {formatRelative(l.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
