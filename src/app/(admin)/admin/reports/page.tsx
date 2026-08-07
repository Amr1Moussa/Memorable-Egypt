import type { Metadata } from "next";
import { listReports, resolveReport } from "@/features/admin/services/moderation";
import { formatRelative } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Admin — Reports",
  robots: { index: false, follow: false },
};

export default async function AdminReportsPage() {
  const { data: reports } = await listReports(1, 50, "pending");

  async function resolve(formData: FormData) {
    "use server";
    const reportId = String(formData.get("reportId"));
    const action = String(formData.get("action")) as "approve" | "reject";
    await resolveReport(reportId, action);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reports queue</h1>

      {reports.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No pending reports.
        </p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-error/15 px-2 py-0.5 text-xs font-medium text-error">
                      {r.reason.replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(r.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">{r.memoryTitle}</p>
                  {r.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      &ldquo;{r.description}&rdquo;
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reported by {r.reporterName ?? "a user"}
                  </p>
                </div>
              </div>
              <form action={resolve} className="mt-3 flex gap-2 border-t border-border pt-3">
                <input type="hidden" name="reportId" value={r.id} />
                <input type="hidden" name="action" value="approve" />
                <Button size="sm" variant="outline" type="submit">
                  Take action (approve)
                </Button>
              </form>
              <form action={resolve} className="mt-2">
                <input type="hidden" name="reportId" value={r.id} />
                <input type="hidden" name="action" value="reject" />
                <Button size="sm" variant="ghost" type="submit">
                  Dismiss (reject)
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
