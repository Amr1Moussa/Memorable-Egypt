import { cn } from "@/lib/utils/cn";

/**
 * Payment status badge (Phase 5 #6 — users always know the current status).
 *
 * Source: doc 15 (Payment Status), Phase 5 requirement #6.
 */
const STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  awaiting_payment: "bg-warning/15 text-warning",
  receipt_uploaded: "bg-info/15 text-info",
  pending_verification: "bg-info/15 text-info",
  approved: "bg-success/15 text-success",
  published: "bg-success/15 text-success",
  rejected: "bg-error/15 text-error",
  failed: "bg-error/15 text-error",
};

const LABELS: Record<string, string> = {
  draft: "Draft",
  awaiting_payment: "Awaiting payment",
  receipt_uploaded: "Receipt uploaded",
  pending_verification: "Verifying",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  failed: "Failed",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
