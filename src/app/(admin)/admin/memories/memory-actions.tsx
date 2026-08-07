"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Memory moderation actions (Phase 6 #3). Every action requires confirmation.
 */
export function MemoryActions({
  memoryId,
  updatedAt,
  status,
  isFeatured,
}: {
  memoryId: string;
  updatedAt: string;
  status: string;
  isFeatured: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function moderate(action: "hide" | "restore" | "delete" | "feature" | "unfeature") {
    const confirmMsg = {
      hide: "Hide this memory from public view?",
      restore: "Restore this memory to public view?",
      delete: "Permanently delete this memory? This cannot be undone.",
      feature: "Feature this memory?",
      unfeature: "Remove the featured status?",
    }[action];
    if (!window.confirm(confirmMsg)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/memories/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId, expectedUpdatedAt: updatedAt, action }),
      });
      const json = (await res.json()) as
        | { success: true }
        | { success: false; error: { message: string } };
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      window.location.reload();
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === "active" ? (
        <Button size="sm" variant="outline" onClick={() => moderate("hide")} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Hide
        </Button>
      ) : status === "hidden" ? (
        <Button size="sm" variant="outline" onClick={() => moderate("restore")} disabled={busy}>
          Restore
        </Button>
      ) : null}
      {isFeatured ? (
        <Button size="sm" variant="ghost" onClick={() => moderate("unfeature")} disabled={busy}>
          Unfeature
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => moderate("feature")} disabled={busy}>
          Feature
        </Button>
      )}
      <Button size="sm" variant="destructive" onClick={() => moderate("delete")} disabled={busy}>
        Delete
      </Button>
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </div>
  );
}
