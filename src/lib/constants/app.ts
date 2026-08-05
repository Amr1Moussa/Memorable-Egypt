/**
 * Application-wide constants.
 *
 * Centralizing routes, names, and defaults prevents string duplication
 * (doc 05 — "Avoid duplicated logic") and keeps links consistent.
 */

export const APP_NAME = "Memorable Egypt";
export const APP_TAGLINE = "Every place has a story.";

/** Central route map. Components reference `ROUTES.explore` not "/explore". */
export const ROUTES = {
  home: "/",
  explore: "/explore",
  search: "/search",
  create: "/create",
  profile: "/profile",
  settings: "/settings",
  login: "/login",
  register: "/register",
  terms: "/terms",
  privacy: "/privacy",
  cookies: "/cookies",
  admin: "/admin",
} as const;

/**
 * Genesis campaign defaults (doc 22). Admins can override the limit via
 * system settings; this is the documented default.
 */
export const GENESIS_DEFAULTS = {
  maxFreePins: 100,
  enabled: true,
} as const;

/** Payment reference prefix (doc 15 — `ME-2026-000001`). */
export const PAYMENT_REFERENCE_PREFIX = "ME";

// ---------------------------------------------------------------------------
// Storage limits are now configurable via the `settings` table (migration
// 0010, doc 22). The documented DEFAULTS live in
// `features/settings/constants.ts` and are read at runtime through the
// settings service. The exports below are kept ONLY as static fallbacks for
// client-side validation (the source of truth is settings + server checks).
// Prefer `features/settings` for any new code.
// ---------------------------------------------------------------------------

/** @deprecated use features/settings service + STORAGE_DEFAULTS */
export const RECEIPT_UPLOAD = {
  maxBytes: 10 * 1024 * 1024, // 10 MB (doc 15)
  acceptedMime: ["image/png", "image/jpeg", "application/pdf"],
  acceptedExtensions: [".png", ".jpg", ".jpeg", ".pdf"],
} as const;

/** @deprecated use features/settings service + STORAGE_DEFAULTS */
export const MEMORY_IMAGE = {
  maxFiles: 10,
  maxBytes: 10 * 1024 * 1024, // 10 MB (doc 16)
  acceptedMime: ["image/jpeg", "image/png", "image/webp"],
} as const;

/** @deprecated use features/settings service + STORAGE_DEFAULTS */
export const AVATAR = {
  maxBytes: 5 * 1024 * 1024, // 5 MB (doc 16)
  acceptedMime: ["image/jpeg", "image/png", "image/webp"],
} as const;
