"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/utils/format";

/**
 * AvatarUploader — circular avatar with a click-to-replace control.
 *
 * Client-side validation is advisory; the server re-validates. The MVP stores
 * the original as-is (Phase 2.3 requirement #1).
 *
 * Source: doc 10 (Profile), 16 (Storage — avatars bucket).
 */
export function AvatarUploader({
  currentUrl,
  displayName,
  onUploaded,
}: {
  currentUrl?: string | null;
  displayName: string;
  onUploaded?: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      setUploading(true);

      const form = new FormData();
      form.append("file", file);

      try {
        const res = await fetch("/api/v1/media/avatar", {
          method: "POST",
          body: form,
        });
        const json = (await res.json()) as
          | { success: true; data: { url: string } }
          | { success: false; error: { message: string } };

        if (!json.success) {
          setError(json.error.message);
          return;
        }
        setUrl(json.data.url);
        onUploaded?.(json.data.url);
      } catch {
        setError("Couldn't upload your photo. Please try again.");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onUploaded],
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative h-24 w-24 overflow-hidden rounded-full border border-border bg-muted"
        aria-label="Change avatar"
      >
        {url ? (
          <Image
            src={url}
            alt="Your avatar"
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted-foreground">
            {initials(displayName) || "?"}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 transition group-hover:opacity-100">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error ? (
        <p className={cn("text-xs text-error")} role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          JPG, PNG, or WebP — up to 5 MB
        </p>
      )}
    </div>
  );
}
