import { cn } from "@/lib/utils/cn";

/**
 * Stat card for the admin dashboard (Phase 6 #1).
 * Simple number + label + optional hint.
 */
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "info";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-faint-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tabular-nums",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "info" && "text-info",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
