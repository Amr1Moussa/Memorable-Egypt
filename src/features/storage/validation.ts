import {
  getStorageAcceptedTypes,
  getStorageLimits,
} from "@/features/settings/service";
import { ValidationError } from "@/lib/errors";

/**
 * Upload validation against configurable settings (docs 15, 16, 22).
 *
 * The settings table is the source of truth for limits + accepted MIME types;
 * the documented defaults are used as fallbacks (features/settings/constants).
 * Validation runs server-side; client-side checks are advisory only.
 *
 * Source: docs 16 (Storage System), 21 (Security — File Upload Security).
 */

export interface ValidatedFile {
  /** Original file name (never used for storage — UUIDs only). */
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Raw bytes, read by the caller and passed through. */
  buffer: Buffer;
}

export type UploadKind = "memoryImage" | "avatar" | "receipt";

export interface UploadRules {
  maxBytes: number;
  accepted: readonly string[];
}

/** Resolve the rules for a kind from settings. */
export async function getRules(kind: UploadKind): Promise<UploadRules> {
  const [limits, accepted] = await Promise.all([
    getStorageLimits(),
    getStorageAcceptedTypes(),
  ]);

  switch (kind) {
    case "memoryImage":
      return {
        maxBytes: limits.memoryImageMaxBytes,
        accepted: accepted.memoryImage.split(",").map((s) => s.trim()),
      };
    case "avatar":
      return {
        maxBytes: limits.avatarMaxBytes,
        accepted: accepted.avatar.split(",").map((s) => s.trim()),
      };
    case "receipt":
      return {
        maxBytes: limits.receiptMaxBytes,
        accepted: accepted.receipt.split(",").map((s) => s.trim()),
      };
  }
}

/**
 * Validate a single file against its kind's rules. Throws ValidationError
 * with a friendly message on failure.
 */
export async function validateUpload(
  file: { name: string; type: string; size: number },
  kind: UploadKind,
): Promise<void> {
  const rules = await getRules(kind);

  if (file.size <= 0) {
    throw new ValidationError("That file appears to be empty.");
  }
  if (file.size > rules.maxBytes) {
    const mb = Math.round(rules.maxBytes / (1024 * 1024));
    throw new ValidationError(`That file is too large. The limit is ${mb} MB.`);
  }
  if (!rules.accepted.includes(file.type)) {
    throw new ValidationError(
      `That file type isn't supported. Allowed: ${rules.accepted.join(", ")}.`,
    );
  }
}

/** Convenience: validate the count of memory images for one memory. */
export function validateMemoryImageCount(
  currentCount: number,
  adding: number,
  max: number,
): void {
  if (currentCount + adding > max) {
    throw new ValidationError(
      `A memory can have at most ${max} images (doc 16).`,
    );
  }
}
