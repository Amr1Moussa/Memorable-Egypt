import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/authorization";
import { invalidateSettingsCache } from "@/features/settings/service";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";
import { concurrencyUpdate } from "../concurrency";
import {
  SENSITIVE_SETTING_CATEGORIES,
  PUBLIC_SETTING_CATEGORIES,
} from "@/features/settings/constants";
import type {
  AdminUserRow,
  AdminLocationRow,
  AdminSettingRow,
} from "../types";

/**
 * Admin management services: users, locations, settings, analytics
 * (Phase 6 #4, #5, #6, #7).
 *
 * Source: doc 18 (Admin Dashboard), Phase 6 requirements #4–#7.
 */

// ---------------------------------------------------------------------------
// Users (Phase 6 #4)
// ---------------------------------------------------------------------------

export async function listUsers(
  page = 1,
  limit = 20,
  search?: string,
): Promise<{ data: AdminUserRow[]; total: number }> {
  await requireAdmin();
  const client = createAdminClient();
  const from = (page - 1) * limit;

  let q = client
    .from("profiles")
    .select("id, username, display_name, role, genesis_claimed, created_at", {
      count: "exact",
    });
  if (search) {
    q = q.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
  }

  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const ids = rows.map((r) => String(r.id));

  // Email comes from auth.users (admin client can read it).
  const emailMap = new Map<string, string | null>();
  if (ids.length > 0) {
    const { data: authUsers } = await client.auth.admin.listUsers({
      perPage: 1000,
    });
    for (const u of authUsers.users) {
      emailMap.set(u.id, u.email ?? null);
    }
  }

  // Memory + payment counts.
  const [memCounts, payCounts] = await Promise.all([
    countByUser(client, "memories", ids),
    countByUser(client, "payments", ids),
  ]);

  return {
    data: rows.map((r) => ({
      id: String(r.id),
      username: (r.username as string | null) ?? null,
      displayName: (r.display_name as string | null) ?? null,
      email: emailMap.get(String(r.id)) ?? null,
      role: String(r.role),
      genesisClaimed: Boolean(r.genesis_claimed),
      createdAt: String(r.created_at),
      memoryCount: memCounts.get(String(r.id)) ?? 0,
      paymentCount: payCounts.get(String(r.id)) ?? 0,
    })),
    total: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Locations (Phase 6 #5)
// ---------------------------------------------------------------------------

export async function listLocations(
  page = 1,
  limit = 20,
  search?: string,
): Promise<{ data: AdminLocationRow[]; total: number }> {
  await requireAdmin();
  const client = createAdminClient();
  const from = (page - 1) * limit;

  let q = client.from("locations").select(
    "id, name, slug, governorate, city, tier, status, memory_count, legacy_count, created_at, updated_at",
    { count: "exact" },
  );
  if (search) {
    q = q.or(`name.ilike.%${search}%,governorate.ilike.%${search}%`);
  }

  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw error;

  return {
    data: ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      slug: String(r.slug),
      governorate: (r.governorate as string | null) ?? null,
      city: (r.city as string | null) ?? null,
      tier: Number(r.tier),
      status: String(r.status),
      memoryCount: Number(r.memory_count ?? 0),
      legacyCount: Number(r.legacy_count ?? 0),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    })),
    total: count ?? 0,
  };
}

export async function updateLocation(
  locationId: string,
  expectedUpdatedAt: string,
  patch: { tier?: number; status?: "active" | "disabled" },
): Promise<void> {
  const { id: adminId } = await requireAdmin();
  await concurrencyUpdate("locations", locationId, expectedUpdatedAt, patch);
  await logAuditEvent({
    actorId: adminId,
    action: AUDIT_ACTIONS.LOCATION_UPDATED,
    entityType: "location",
    entityId: locationId,
    metadata: patch,
  });
}

/** Approve a pending location (status → active). */
export async function approveLocation(
  locationId: string,
  expectedUpdatedAt: string,
): Promise<void> {
  await updateLocation(locationId, expectedUpdatedAt, { status: "active" });
}

// ---------------------------------------------------------------------------
// Settings (Phase 6 #6)
// ---------------------------------------------------------------------------

/** List all settings, marking sensitive ones so the UI can mask them. */
export async function listSettings(): Promise<AdminSettingRow[]> {
  await requireAdmin();
  const client = createAdminClient();
  const { data, error } = await client
    .from("settings")
    .select("id, category, key, value, type, description, updated_at")
    .order("category, key");

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    category: String(r.category),
    key: String(r.key),
    value: String(r.value),
    type: String(r.type),
    description: (r.description as string | null) ?? null,
    updatedAt: String(r.updated_at),
    sensitive: SENSITIVE_SETTING_CATEGORIES.has(String(r.category)),
  }));
}

/** Update a single setting with optimistic concurrency. */
export async function updateSetting(
  settingId: string,
  expectedUpdatedAt: string,
  value: string,
): Promise<void> {
  const { id: adminId } = await requireAdmin();

  // Verify the setting is editable (not in a sensitive category that's
  // server-only, e.g. secrets — those are never editable via this interface).
  const client = createAdminClient();
  const { data: setting } = await client
    .from("settings")
    .select("category, key")
    .eq("id", settingId)
    .single();
  const cat = (setting as { category: string } | null)?.category;
  if (cat && !PUBLIC_SETTING_CATEGORIES.has(cat) && cat !== "payments") {
    throw new Error("This setting cannot be edited through the admin UI.");
  }

  await concurrencyUpdate("settings", settingId, expectedUpdatedAt, { value });
  invalidateSettingsCache();

  await logAuditEvent({
    actorId: adminId,
    action: AUDIT_ACTIONS.SETTINGS_CHANGED,
    entityType: "setting",
    entityId: settingId,
    metadata: { category: cat, newValue: value },
  });
}

// ---------------------------------------------------------------------------
// Analytics (Phase 6 #7)
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  users: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  memories: {
    total: number;
    published: number;
    drafts: number;
    standard: number;
    legacy: number;
  };
  revenue: {
    total: number;
    byTier: Record<number, number>;
    byPinType: { standard: number; legacy: number };
  };
  genesis: {
    used: number;
    max: number;
    percent: number;
  };
  topLocations: Array<{ name: string; memoryCount: number }>;
}

export async function getAnalytics(): Promise<AnalyticsSummary> {
  await requireAdmin();
  const client = createAdminClient();

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(now);
  startWeek.setDate(now.getDate() - 7);
  const startMonth = new Date(now);
  startMonth.setDate(1);
  startMonth.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    usersToday,
    usersWeek,
    usersMonth,
    totalMemories,
    publishedMemories,
    draftMemories,
    standardPins,
    legacyPins,
    genesisSettings,
    revenueRows,
    topLocations,
  ] = await Promise.all([
    countHead(client, "profiles"),
    countHead(client, "profiles", "created_at", startToday.toISOString()),
    countHead(client, "profiles", "created_at", startWeek.toISOString()),
    countHead(client, "profiles", "created_at", startMonth.toISOString()),
    countHead(client, "memories", "deleted_at", null, true),
    countHead(client, "memories", "published_at", null, false),
    countHead(client, "memories", "publication_status", "draft"),
    countHead(client, "memories", "pin_type", "standard"),
    countHead(client, "memories", "pin_type", "legacy"),
    client.from("settings").select("key, value").eq("category", "genesis"),
    client
      .from("payments")
      .select("amount, tier, pin_type")
      .in("status", ["approved", "published"]),
    client
      .from("locations")
      .select("name, memory_count")
      .order("memory_count", { ascending: false })
      .limit(10),
  ]);

  const genesisMap = new Map<string, string>();
  for (const r of (genesisSettings.data ?? []) as Array<{
    key: string;
    value: string;
  }>) {
    genesisMap.set(r.key, r.value);
  }
  const used = Number(genesisMap.get("used_free_pins") ?? 0);
  const max = Number(genesisMap.get("max_free_pins") ?? 100);

  const revRows = (revenueRows.data ?? []) as Array<{
    amount: number;
    tier: number;
    pin_type: string;
  }>;
  const byTier: Record<number, number> = {};
  let standardRev = 0;
  let legacyRev = 0;
  let totalRev = 0;
  for (const r of revRows) {
    totalRev += r.amount;
    byTier[r.tier] = (byTier[r.tier] ?? 0) + r.amount;
    if (r.pin_type === "legacy") legacyRev += r.amount;
    else standardRev += r.amount;
  }

  return {
    users: {
      total: totalUsers,
      today: usersToday,
      thisWeek: usersWeek,
      thisMonth: usersMonth,
    },
    memories: {
      total: totalMemories,
      published: publishedMemories,
      drafts: draftMemories,
      standard: standardPins,
      legacy: legacyPins,
    },
    revenue: {
      total: totalRev,
      byTier,
      byPinType: { standard: standardRev, legacy: legacyRev },
    },
    genesis: {
      used,
      max,
      percent: max > 0 ? Math.round((used / max) * 100) : 0,
    },
    topLocations: ((topLocations.data ?? []) as Array<{
      name: string;
      memory_count: number;
    }>).map((l) => ({ name: l.name, memoryCount: l.memory_count })),
  };
}

// --- helpers ---

async function countHead(
  client: ReturnType<typeof createAdminClient>,
  table: string,
  column?: string,
  value?: string | null,
  isNull?: boolean,
): Promise<number> {
  let q = client.from(table).select("id", { count: "exact", head: true });
  if (column && value !== undefined && value !== null && !isNull) {
    q = q.eq(column, value);
  } else if (column && isNull) {
    q = q.is(column, null);
  } else if (column && value === null && !isNull) {
    q = q.not(column, "is", null);
  }
  const { count } = await q;
  return count ?? 0;
}

async function countByUser(
  client: ReturnType<typeof createAdminClient>,
  table: string,
  userIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (userIds.length === 0) return map;
  const { data } = await client.from(table).select("user_id").in("user_id", userIds);
  for (const row of (data ?? []) as Array<{ user_id: string }>) {
    map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
  }
  return map;
}
