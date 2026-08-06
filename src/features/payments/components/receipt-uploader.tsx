"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Receipt uploader (Phase 5 #4). Single file (PNG/JPG/PDF), private bucket.
 * Advisory client validation; the server re-validates authoritatively.
 *
 * Source: doc 15 (Receipt Upload), Phase 5 requirements #4, #6.
 */
export function ReceiptUploader({
  paymentId,
  onUploaded,
}: {
  paymentId: string;
  onUploaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSelected(file.name);

    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Please upload a PNG, JPG, or PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("That file is too large. The limit is 10 MB.");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("method", "instapay");

    try {
      const res = await fetch(`/api/v1/payments/${paymentId}/receipt`, {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as
        | { success: true }
        | { success: false; error: { message: string } };
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      onUploaded?.();
    } catch {
      setError("We couldn't upload your receipt. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center transition hover:border-nile",
          uploading && "pointer-events-none opacity-50",
        )}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-nile" />
        ) : selected ? (
          <FileText className="h-6 w-6 text-nile" />
        ) : (
          <Upload className="h-6 w-6 text-faint-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {selected ?? "Upload your payment receipt"}
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, or PDF — up to 10 MB
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error ? (
        <div className="flex items-center gap-2 rounded-md bg-error/10 px-3 py-2 text-sm text-error">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
    </div>
  );
}
