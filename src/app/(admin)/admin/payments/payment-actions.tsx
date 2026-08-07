"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Client component for payment approve/reject actions (Phase 6 #2).
 * Optimistic concurrency: sends `expectedUpdatedAt`; surfaces conflict errors.
 */
export function PaymentActions({
  paymentId,
  updatedAt,
  hasReceipt,
}: {
  paymentId: string;
  updatedAt: string;
  hasReceipt: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    if (action === "reject") {
      const reason = window.prompt("Why is this receipt being rejected?");
      if (!reason) return;
      await send("/api/v1/admin/payments/reject", { paymentId, expectedUpdatedAt: updatedAt, reason });
      return;
    }
    await send("/api/v1/admin/payments/approve", { paymentId, expectedUpdatedAt: updatedAt });
  }

  async function send(url: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | { success: true; message?: string }
        | { success: false; error: { message: string } };
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      setDone(json.message ?? "Done.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="text-sm font-medium text-success">{done}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        onClick={() => act("approve")}
        disabled={busy || !hasReceipt}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Approve
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => act("reject")}
        disabled={busy || !hasReceipt}
      >
        <X className="h-3.5 w-3.5" />
        Reject
      </Button>
      {error ? (
        <span className="text-xs text-error">{error}</span>
      ) : null}
      {!hasReceipt ? (
        <span className="text-xs text-muted-foreground">No receipt uploaded</span>
      ) : null}
    </div>
  );
}
