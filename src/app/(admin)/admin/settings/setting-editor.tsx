"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Inline setting editor (Phase 6 #6). Boolean settings render as a toggle;
 * others render as a text input. Optimistic concurrency via updatedAt.
 */
export function SettingEditor({
  settingId,
  value,
  type,
  updatedAt,
}: {
  settingId: string;
  value: string;
  type: string;
  updatedAt: string;
}) {
  const [current, setCurrent] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(newValue?: string) {
    const val = newValue ?? current;
    if (val === value) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settingId,
          expectedUpdatedAt: updatedAt,
          value: val,
        }),
      });
      const json = (await res.json()) as
        | { success: true }
        | { success: false; error: { message: string } };
      if (!json.success) {
        setError(json.error.message);
        return;
      }
    } catch {
      setError("Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  if (type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const next = current === "true" ? "false" : "true";
            setCurrent(next);
            save(next);
          }}
          disabled={busy}
          className={
            current === "true"
              ? "relative h-5 w-9 rounded-full bg-success"
              : "relative h-5 w-9 rounded-full bg-muted"
          }
        >
          <span
            className={
              current === "true"
                ? "absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white"
                : "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white"
            }
          />
        </button>
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {error ? <span className="text-xs text-error">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        onBlur={() => save()}
        disabled={busy}
        className="h-8 w-40 rounded border border-input bg-surface px-2 text-sm"
      />
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </div>
  );
}
