import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { requireUser } from "@/lib/authorization";
import { listPaymentHistory } from "@/features/payments/service";
import { PaymentStatusBadge } from "@/features/payments/components/status-badge";
import { formatEGP, formatRelative } from "@/lib/utils/format";
import { EmptyState } from "@/components/shared/empty-state";
import { ROUTES } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: "Payment history",
  robots: { index: false, follow: false },
};

/**
 * Payment history (Phase 5 #5). Not indexed (doc 20).
 */
export default async function PaymentHistoryPage() {
  await requireUser();
  const { data: payments } = await listPaymentHistory();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment history
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your payments and verification status.
        </p>
      </header>

      {payments.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="When you publish a paid memory, your payments will appear here."
          action={
            <Link
              href={ROUTES.create}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Create a memory
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Link
              key={p.id}
              href={`${ROUTES.payments}/${p.id}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.reference}
                  </span>
                  <PaymentStatusBadge status={p.status} />
                </div>
                <p className="mt-1 truncate font-medium">{p.memoryTitle}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {p.locationName ?? "—"} · {formatRelative(p.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {p.isGenesis ? "Free" : formatEGP(p.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.pinType === "legacy" ? "Legacy" : "Standard"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
