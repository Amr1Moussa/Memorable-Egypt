import type { Metadata } from "next";
import { getPaymentQueue } from "@/features/admin/services/payments";
import { formatEGP, formatRelative } from "@/lib/utils/format";
import { PaymentActions } from "./payment-actions";

export const metadata: Metadata = {
  title: "Admin — Payments",
  robots: { index: false, follow: false },
};

/**
 * Admin payment queue (Phase 6 #2). Server Component that loads the queue;
 * the approve/reject actions are handled by a client component.
 */
export default async function AdminPaymentsPage() {
  const { data: payments } = await getPaymentQueue(1, 50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Payment verification queue
      </h1>

      {payments.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No payments awaiting verification.
        </p>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {p.reference}
                    </span>
                    <span
                      className={
                        p.status === "pending_verification"
                          ? "rounded-full bg-info/15 px-2 py-0.5 text-xs text-info"
                          : "rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning"
                      }
                    >
                      {p.status === "pending_verification"
                        ? "Verifying"
                        : "Receipt uploaded"}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">{p.memoryTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.userName ?? "User"} · {p.locationName ?? "—"} ·{" "}
                    {formatRelative(p.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatEGP(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    Tier {p.tier} · {p.pinType}
                  </p>
                </div>
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <PaymentActions
                  paymentId={p.id}
                  updatedAt={p.updatedAt}
                  hasReceipt={p.hasReceipt}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
