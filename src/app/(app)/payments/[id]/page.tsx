import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { getPayment, getPaymentMethods } from "@/features/payments/service";
import { PaymentStatusBadge } from "@/features/payments/components/status-badge";
import { ReceiptUploader } from "@/features/payments/components/receipt-uploader";
import { formatEGP } from "@/lib/utils/format";
import { ROUTES } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
};

/**
 * Payment detail page (Phase 5 #5, #6). Shows the user exactly:
 *   - What they owe + why
 *   - How to pay (InstaPay + QNB)
 *   - Current status + next action
 *   - Receipt upload (when awaiting_payment)
 *
 * Source: doc 15 (Payments), Phase 5 requirements #5, #6.
 */
export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let payment, methods;
  try {
    [payment, methods] = await Promise.all([
      getPayment(id),
      getPaymentMethods(),
    ]);
  } catch {
    notFound();
  }

  const needsReceipt = payment.status === "awaiting_payment";
  const isProcessing =
    payment.status === "receipt_uploaded" ||
    payment.status === "pending_verification";
  const isDone = payment.status === "approved" || payment.status === "published";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={`${ROUTES.payments}`}
        className="mb-4 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Payment history
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Payment {payment.reference}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {payment.memoryTitle}
            {payment.locationName ? ` · ${payment.locationName}` : ""}
          </p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>

      {/* Rejection reason */}
      {payment.status === "rejected" && payment.rejectionReason ? (
        <div className="mb-6 rounded-md border border-error/30 bg-error/5 px-4 py-3">
          <p className="text-sm font-medium text-error">
            Receipt rejected
          </p>
          <p className="mt-1 text-sm text-foreground">
            {payment.rejectionReason}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Please upload a new receipt below.
          </p>
        </div>
      ) : null}

      {/* Amount summary */}
      <section className="mb-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-faint-foreground">
          Amount due
        </h2>
        <p className="mt-2 text-3xl font-bold">
          {payment.isGenesis ? "Free" : formatEGP(payment.amount)}
        </p>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Pin type</dt>
            <dd className="font-medium">
              {payment.pinType === "legacy" ? "Legacy Pin" : "Standard Pin"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Location tier</dt>
            <dd className="font-medium">Tier {payment.tier}</dd>
          </div>
        </dl>
      </section>

      {/* Payment instructions (only when payment is needed) */}
      {needsReceipt ? (
        <section className="mb-6 space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-faint-foreground">
              Pay via InstaPay
            </h2>
            <p className="mt-2 font-mono text-sm">{methods.instapayUsername}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Include the reference <strong>{payment.reference}</strong> in the
              transfer note.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-faint-foreground">
              Or bank transfer
            </h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Bank</dt>
                <dd className="font-medium">{methods.bankName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Account holder</dt>
                <dd className="font-medium">{methods.bankAccountHolder}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Account number</dt>
                <dd className="font-mono font-medium">
                  {methods.bankAccountNumber}
                </dd>
              </div>
            </dl>
          </div>

          {/* Receipt upload */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-faint-foreground">
              Upload your receipt
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              After paying, upload a screenshot or PDF of the confirmation.
              We verify within {methods.verificationSlaHours} hours.
            </p>
            <div className="mt-4">
              <ReceiptUploader
                paymentId={payment.id}
                onUploaded={() => window.location.reload()}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* Processing state */}
      {isProcessing ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-info/30 bg-info/5 p-4">
          <Clock className="h-5 w-5 shrink-0 text-info" />
          <div>
            <p className="text-sm font-medium">We&apos;re verifying your payment</p>
            <p className="text-xs text-muted-foreground">
              Target review time: within {methods.verificationSlaHours} hours.
            </p>
          </div>
        </div>
      ) : null}

      {/* Done state */}
      {isDone ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-medium">Payment confirmed</p>
            <p className="text-xs text-muted-foreground">
              Your memory is now live.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
