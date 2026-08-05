/**
 * Settings constants.
 *
 * `STORAGE_DEFAULTS` are the documented fallback values (docs 15, 16) used
 * only when a settings row is absent. `PUBLIC_SETTING_CATEGORIES` enforces
 * the Phase 2.2 requirement that sensitive categories never reach public
 * APIs or the cache.
 *
 * Source: docs 15 (Payments), 16 (Storage), 22 (System Settings).
 */

/** Documented storage defaults (fallbacks if a settings row is missing). */
export const STORAGE_DEFAULTS = {
  memoryImageMaxFiles: 10,
  memoryImageMaxBytes: 10 * 1024 * 1024, // 10MB (doc 16)
  avatarMaxBytes: 5 * 1024 * 1024, // 5MB (doc 16)
  receiptMaxBytes: 10 * 1024 * 1024, // 10MB (doc 15)
  memoryImageAccept: "image/jpeg,image/png,image/webp",
  avatarAccept: "image/jpeg,image/png,image/webp",
  receiptAccept: "image/png,image/jpeg,application/pdf",
} as const;

export interface StorageLimits {
  memoryImageMaxFiles: number;
  memoryImageMaxBytes: number;
  avatarMaxBytes: number;
  receiptMaxBytes: number;
}

export interface StorageAcceptedTypes {
  memoryImage: string;
  avatar: string;
  receipt: string;
}

/**
 * Categories safe to expose in public APIs + the in-memory cache.
 * `payments` is intentionally excluded — it holds bank details (doc 15).
 */
export const PUBLIC_SETTING_CATEGORIES: ReadonlySet<string> = new Set([
  "general",
  "pricing",
  "genesis",
  "storage",
  "features",
  "ai",
]);

/** Categories considered sensitive — server-only, never cached publicly. */
export const SENSITIVE_SETTING_CATEGORIES: ReadonlySet<string> = new Set([
  "payments",
]);

/** Keys for the general operational switches (migration 0010). */
export const GENERAL_KEYS = {
  maintenanceMode: "maintenance_mode",
  registrationEnabled: "registration_enabled",
  platformName: "platform_name",
  supportEmail: "support_email",
} as const;
