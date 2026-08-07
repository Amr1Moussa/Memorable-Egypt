import type { Metadata } from "next";
import { listUsers } from "@/features/admin/services/manage";
import { formatRelative, initials } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Admin — Users",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const { data: users } = await listUsers(1, 50, sp.q);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search by username or name…"
          className="h-9 flex-1 rounded-md border border-input bg-surface px-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Search
        </button>
      </form>

      {users.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No users found.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-faint-foreground">
                <th className="pb-2 pr-4 font-medium">User</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Memories</th>
                <th className="pb-2 pr-4 font-medium">Payments</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {initials(u.displayName ?? u.username ?? "U")}
                      </div>
                      <span className="font-medium">
                        {u.displayName ?? u.username ?? "Unknown"}
                      </span>
                      {u.genesisClaimed ? (
                        <span className="text-xs text-terracotta">Genesis</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="py-2 pr-4">
                    {u.role === "admin" ? (
                      <span className="rounded-full bg-error/15 px-2 py-0.5 text-xs text-error">
                        Admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">User</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{u.memoryCount}</td>
                  <td className="py-2 pr-4 tabular-nums">{u.paymentCount}</td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {formatRelative(u.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
