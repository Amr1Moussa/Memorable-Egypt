/**
 * Reserved usernames (doc 12). Users cannot claim these during profile
 * completion or via an update. Compared case-insensitively (against the
 * normalized form).
 *
 * Source: doc 12 (Authentication — Username Rules).
 */

/**
 * Normalize a username before validation, availability checks, and storage.
 * Phase 2.3 requirement #2: trim whitespace + lowercase, then the format
 * check is applied separately. Mirrors the DB trigger (migration 0011).
 *
 * Source: Phase 2.3 requirement #2, doc 12.
 */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "support",
  "help",
  "memorable",
  "egypt",
  "api",
  "root",
  "system",
  "official",
  "staff",
  "moderator",
  "mod",
  "founder",
  "genesis",
  "settings",
  "login",
  "register",
  "signin",
  "signup",
  "search",
  "explore",
  "map",
  "u",
  "user",
  "users",
  "profile",
  "memory",
  "memories",
  "location",
  "locations",
  "create",
  "new",
  "about",
  "contact",
  "terms",
  "privacy",
  "cookies",
  "legal",
  "dashboard",
  "auth",
]);
