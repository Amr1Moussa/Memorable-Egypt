"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AUTOSAVE_DEBOUNCE_MS } from "../constants";

/**
 * Debounced auto-save for the memory editor (Phase 4 #1).
 *
 * Tracks the "dirty" state (changes since the last save), debounces writes,
 * and exposes a `status` so the editor can show "Saving… / Saved / Unsaved
 * changes" feedback. Beforeunload warns the user if there are unsaved changes.
 *
 * Source: doc 10 (Forms — auto-save drafts), Phase 4 requirement #1.
 */
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function useAutoSave<T>(
  data: T,
  save: (data: T) => Promise<void>,
  options?: { enabled?: boolean; debounceMs?: number },
) {
  const enabled = options?.enabled ?? true;
  const debounceMs = options?.debounceMs ?? AUTOSAVE_DEBOUNCE_MS;
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRunRef = useRef(true);
  const saveRef = useRef(save);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // Mark dirty whenever data changes (after the first hydration).
  useEffect(() => {
    const serialized = JSON.stringify(data);
    if (firstRunRef.current) {
      firstRunRef.current = false;
      lastSavedRef.current = serialized;
      return;
    }
    if (serialized === lastSavedRef.current) return;

    setStatus("dirty");
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await saveRef.current(data);
        lastSavedRef.current = JSON.stringify(data);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, enabled, debounceMs]);

  // Warn on unload if there are unsaved changes.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (status === "dirty" || status === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  /** Force-save now (e.g. before navigating away or publishing). */
  const flush = useCallback(async () => {
    if (status !== "dirty") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("saving");
    try {
      await saveRef.current(data);
      lastSavedRef.current = JSON.stringify(data);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [data, status]);

  return { status, flush };
}
