"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Location tier + status inline editor (Phase 6 #5). Client component that
 * sends updates with optimistic concurrency.
 */
export function LocationActions({
  locationId,
  updatedAt,
  tier,
  status,
}: {
  locationId: string;
  updatedAt: string;
  tier: number;
  status: string;
}) {
  const [busy, setBusy] = useState(false);

  async function update(patch: { tier?: number; status?: "active" | "disabled" }) {
    setBusy(true);
    try {
      await fetch("/api/v1/admin/locations/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, expectedUpdatedAt: updatedAt, ...patch }),
      });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      <select
        value={tier}
        disabled={busy}
        onChange={(e) => update({ tier: Number(e.target.value) })}
        className="h-7 rounded border border-input bg-surface px-1.5 text-xs"
      >
        {[1, 2, 3, 4].map((t) => (
          <option key={t} value={t}>
            Tier {t}
          </option>
        ))}
      </select>
      {status === "pending" ? (
        <button
          onClick={() => update({ status: "active" })}
          disabled={busy}
          className="rounded bg-success/15 px-2 py-0.5 text-xs text-success"
        >
          Approve
        </button>
      ) : status === "active" ? (
        <button
          onClick={() => update({ status: "disabled" })}
          disabled={busy}
          className="rounded bg-error/15 px-2 py-0.5 text-xs text-error"
        >
          Disable
        </button>
      ) : (
        <button
          onClick={() => update({ status: "active" })}
          disabled={busy}
          className="rounded bg-success/15 px-2 py-0.5 text-xs text-success"
        >
          Enable
        </button>
      )}
    </div>
  );
}
