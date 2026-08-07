import { formatRelative } from "@/lib/utils/format";
import type { ActivityEntry } from "../types";

/**
 * Recent activity feed (Phase 6 #13). Reuses the audit_log via the dashboard
 * service — no separate activity system.
 */
const ACTION_LABELS: Record<string, string> = {
  "payment.approved": "Approved a payment",
  "payment.rejected": "Rejected a payment",
  "memory.hidden": "Hid a memory",
  "memory.restored": "Restored a memory",
  "memory.deleted": "Deleted a memory",
  "memory.featured": "Featured a memory",
  "location.updated": "Updated a location",
  "settings.changed": "Changed a setting",
  "report.resolved": "Resolved a report",
  "user.registered": "New user registered",
  "auth.login_success": "User signed in",
  "auth.admin_login": "Admin signed in",
};

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No recent activity.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((e) => (
        <div
          key={e.id}
          className="flex items-start gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
        >
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nile" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground">
              <span className="font-medium">
                {e.actorName ?? "System"}
              </span>{" "}
              {ACTION_LABELS[e.action] ?? e.action}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelative(e.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
