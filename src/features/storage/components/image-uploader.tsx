"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Image uploader for memory creation.
 *
 * Client-side validation is ADVISORY only (doc 21) — the server re-validates.
 * The MVP stores the original as-is; no client-side canvas re-encoding or
 * EXIF stripping (Phase 2.3 requirement #1).
 *
 * Source: docs 16 (Storage), 10 (Memory Creation), 09 (Image Handling).
 */

export interface UploadedImage {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  altText?: string;
}

export function ImageUploader({
  memoryId,
  maxFiles = 10,
  maxBytes = 10 * 1024 * 1024,
  accept = "image/jpeg,image/png,image/webp",
  onChange,
}: {
  memoryId: string;
  maxFiles?: number;
  maxBytes?: number;
  accept?: string;
  /** Called whenever the uploaded set changes. */
  onChange?: (images: UploadedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);

      if (images.length + files.length > maxFiles) {
        setError(`A memory can have at most ${maxFiles} images.`);
        return;
      }

      setUploading(true);
      const added: UploadedImage[] = [];

      for (const file of Array.from(files)) {
        if (!accept.split(",").includes(file.type)) {
          setError("One of those files isn't a supported image type.");
          continue;
        }
        if (file.size > maxBytes) {
          setError(`"${file.name}" is too large. The limit is 10 MB.`);
          continue;
        }

        const form = new FormData();
        form.append("memoryId", memoryId);
        form.append("file", file);

        try {
          const res = await fetch("/api/v1/media/upload", {
            method: "POST",
            body: form,
          });
          const json = (await res.json()) as
            | {
                success: true;
                data: {
                  id: string;
                  url: string;
                  width: number | null;
                  height: number | null;
                };
              }
            | { success: false; error: { message: string } };

          if (!json.success) {
            setError(json.error.message);
            continue;
          }
          added.push({
            id: json.data.id,
            url: json.data.url,
            width: json.data.width,
            height: json.data.height,
          });
        } catch {
          setError(`Couldn't upload "${file.name}". Please try again.`);
        }
      }

      const next = [...images, ...added];
      setImages(next);
      onChange?.(next);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    },
    [images, maxFiles, accept, maxBytes, memoryId, onChange],
  );

  function remove(id: string) {
    const next = images.filter((i) => i.id !== id);
    setImages(next);
    onChange?.(next);
    // NOTE: server-side deletion of the storage object is handled when the
    // memory is saved/deleted; here we just drop it from the working set.
  }

  const full = images.length >= maxFiles;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
          >
            <Image
              src={img.url}
              alt={img.altText ?? "Memory image"}
              fill
              sizes="(max-width: 640px) 33vw, 25vw"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => remove(img.id)}
              className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground opacity-0 transition group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {!full ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-faint-foreground transition hover:border-nile hover:text-nile",
              uploading && "opacity-50",
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            <span className="text-xs">Add image</span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {images.length} / {maxFiles} images
        </span>
        <span>JPG, PNG, or WebP — up to 10 MB each</span>
      </div>

      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
