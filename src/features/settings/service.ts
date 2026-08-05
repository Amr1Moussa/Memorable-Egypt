import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  STORAGE_DEFAULTS,
  PUBLIC_SETTING_CATEGORIES,
  type StorageLimits,
  type StorageAcceptedTypes,
} from "./constants";

/**
 * Settings service.
 *
 * Reads admin-configurable business config from the `settings` table (doc 22).
 *
 * Caching rule (Phase 2.2 requirement #2):
 *   - Only PUBLIC categories are cached app-side.
 *   - Sensitive categories (payments bank details, secrets, server-only
 *     configuration) are NEVER cached in any public/client surface and are
 *     read fresh from the DB only in protected server contexts.
 *
 * Public categories are: general, pricing, genesis, storage, features, ai.
 * Sensitive categories are: payments (bank details).
 *
 * Source: doc 22 (System Settings), Phase 2.2 requirements.
 */

type SettingRow = {
  category: string;
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "json";
};

/** Module-level cache for public settings; invalidated on writes. */
let publicCache: Map<string, string> | null = null;
let publicCacheAt = 0;
const PUBLIC_CACHE_TTL_MS = 30_000; // 30s

async function loadAll(): Promise<SettingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("category,key,value,type");
  if (error) {
    logger.error("settings load failed", error);
    return [];
  }
  return (data ?? []) as SettingRow[];
}

function isStale(): boolean {
  return publicCache === null || Date.now() - publicCacheAt > PUBLIC_CACHE_TTL_MS;
}

/** Build/refresh the in-memory public settings map. */
async function ensurePublicCache(): Promise<Map<string, string>> {
  if (publicCache && !isStale()) return publicCache;
  const all = await loadAll();
  const map = new Map<string, string>();
  for (const row of all) {
    if (PUBLIC_SETTING_CATEGORIES.has(row.category)) {
      map.set(`${row.category}.${row.key}`, row.value);
    }
  }
  publicCache = map;
  publicCacheAt = Date.now();
  return map;
}

/**
 * Invalidate the public cache. Call after any settings mutation so the next
 * read reflects the change immediately.
 */
export function invalidateSettingsCache(): void {
  publicCache = null;
}

/**
 * Read a single public setting. Returns the provided default if the row is
 * missing or the cache/DB is unreachable.
 */
export async function getPublicSetting(
  category: string,
  key: string,
  defaultValue: string,
): Promise<string> {
  if (!PUBLIC_SETTING_CATEGORIES.has(category)) {
    // Non-public category requested via the public accessor — deny by default.
    return defaultValue;
  }
  const cache = await ensurePublicCache();
  return cache.get(`${category}.${key}`) ?? defaultValue;
}

/** Boolean convenience. */
export async function getPublicBool(
  category: string,
  key: string,
  defaultValue: boolean,
): Promise<boolean> {
  const raw = await getPublicSetting(category, key, String(defaultValue));
  return raw === "true";
}

/** Numeric convenience. */
export async function getPublicNumber(
  category: string,
  key: string,
  defaultValue: number,
): Promise<number> {
  const raw = await getPublicSetting(category, key, String(defaultValue));
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

/**
 * Return all public settings as a flat object, safe to expose to the browser
 * (e.g. for pricing tables, Genesis status). Sensitive categories are
 * excluded by construction.
 */
export async function getPublicSettings(): Promise<Record<string, string>> {
  const cache = await ensurePublicCache();
  const out: Record<string, string> = {};
  for (const [k, v] of cache.entries()) {
    out[k] = v;
  }
  return out;
}

/**
 * Storage limits (doc 16), read from settings with documented defaults.
 * Public because they're shown in upload UIs ("Max 10MB").
 */
export async function getStorageLimits(): Promise<StorageLimits> {
  return {
    memoryImageMaxFiles: await getPublicNumber(
      "storage",
      "memory_image_max_files",
      STORAGE_DEFAULTS.memoryImageMaxFiles,
    ),
    memoryImageMaxBytes: await getPublicNumber(
      "storage",
      "memory_image_max_bytes",
      STORAGE_DEFAULTS.memoryImageMaxBytes,
    ),
    avatarMaxBytes: await getPublicNumber(
      "storage",
      "avatar_max_bytes",
      STORAGE_DEFAULTS.avatarMaxBytes,
    ),
    receiptMaxBytes: await getPublicNumber(
      "storage",
      "receipt_max_bytes",
      STORAGE_DEFAULTS.receiptMaxBytes,
    ),
  };
}

export async function getStorageAcceptedTypes(): Promise<StorageAcceptedTypes> {
  return {
    memoryImage: await getPublicSetting(
      "storage",
      "memory_image_accept",
      STORAGE_DEFAULTS.memoryImageAccept,
    ),
    avatar: await getPublicSetting(
      "storage",
      "avatar_accept",
      STORAGE_DEFAULTS.avatarAccept,
    ),
    receipt: await getPublicSetting(
      "storage",
      "receipt_accept",
      STORAGE_DEFAULTS.receiptAccept,
    ),
  };
}

// ---------------------------------------------------------------------------
// Sensitive (server-only) accessors — NOT cached, NOT exposed publicly.
// Read fresh from the DB in protected server contexts only (admin routes).
// ---------------------------------------------------------------------------

/**
 * Read a payment-detail setting fresh from the DB. Server-only. Never expose
 * the returned value to the browser (docs 15, 21).
 */
export async function getPaymentSetting(key: string): Promise<string | null> {
  const all = await loadAll();
  const row = all.find((r) => r.category === "payments" && r.key === key);
  return row?.value ?? null;
}
