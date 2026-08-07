import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/authorization";
import type { DashboardMetrics, ActivityEntry } from "../types";

/**
 * Admin dashboard service (Phase 6 #1, #13).
 *
 * Metrics use the admin (service-role) client because RLS restricts the anon
 * client from reading other users' data. `requireAdmin` guards every entry.
 *
 * The activity feed reuses the existing `audit_log` (Phase 6 #13) — no
 * separate activity system.
 *
 * Source: doc 18 (Admin Dashboard), doc 19 (Analytics), Phase 6 #1, #13.
 */

/** Dashboard overview metrics (Phase 6 #1). */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await requireAdmin();
  const admin = createAdminClient();

  // Run independent counts in parallel.
  const [
    totalUsers,
    totalMemories,
    publishedMemories,
    pendingPayments,
    pendingReports,
    genesisSettings,
    revenueAgg,
    revenueTodayAgg,
    revenueMonthAgg,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("memories").select("id", { count: "exact", head: true }).is("deleted_at", null),
    admin
      .from("memories")
      .select("id", { count: "exact", head: true })
      .not("published_at", "is", null),
    admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .in("status", ["receipt_uploaded", "pending_verification"]),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("settings").select("key, value").eq("category", "genesis"),
    // Total approved+published revenue (doc 19 — approved payments only).
    admin
      .from("payments")
      .select("amount")
      .in("status", ["approved", "published"]),
    admin
      .from("payments")
      .select("amount")
      .in("status", ["approved", "published"])
      .gte("created_at", startOfToday()),
    admin
      .from("payments")
      .select("amount")
      .in("status", ["approved", "published"])
      .gte("created_at", startOfMonth()),
  ]);

  const genesisMap = new Map<string, string>();
  for (const row of (genesisSettings.data ?? []) as Array<{
    key: string;
    value: string;
  }>) {
    genesisMap.set(row.key, row.value);
  }

  const totalRevenue = sumAmounts(revenueAgg.data);
  const revenueToday = sumAmounts(revenueTodayAgg.data);
  const revenueThisMonth = sumAmounts(revenueMonthAgg.data);

  return {
    totalUsers: totalUsers.count ?? 0,
    totalMemories: totalMemories.count ?? 0,
    publishedMemories: publishedMemories.count ?? 0,
    pendingPayments: pendingPayments.count ?? 0,
    pendingReports: pendingReports.count ?? 0,
    genesisUsed: Number(genesisMap.get("used_free_pins") ?? 0),
    genesisMax: Number(genesisMap.get("max_free_pins") ?? 100),
    genesisRemaining:
      Number(genesisMap.get("max_free_pins") ?? 100) -
      Number(genesisMap.get("used_free_pins") ?? 0),
    genesisEnabled: genesisMap.get("enabled") === "true",
    totalRevenue,
    revenueToday,
    revenueThisMonth,
  };
}

/**
 * Recent activity feed from `audit_log` (Phase 6 #13).
 * Filters to the admin-relevant actions and resolves actor names.
 */
const ADMIN_ACTIONS = [
  "payment.approved",
  "payment.rejected",
  "memory.hidden",
  "memory.restored",
  "memory.deleted",
  "memory.featured",
  "location.updated",
  "settings.changed",
  "report.resolved",
  "user.registered",
  "auth.login_success",
  "auth.admin_login",
];

export async function getActivityFeed(limit = 20): Promise<ActivityEntry[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("audit_log")
    .select("id, actor_id, action, entity_type, entity_id, request_id, created_at")
    .in("action", ADMIN_ACTIONS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const entries = data as Array<Record<string, unknown>>;
  const actorIds = Array.from(
    new Set(
      entries
        .map((e) => (e.actor_id as string | null) ?? null)
        .filter((id): id is string => id !== null),
    ),
  );

  // Resolve actor names in one query.
  const actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await admin
      .from("profiles")
      .select("id, display_name, username")
      .in("id", actorIds);
    for (const a of (actors ?? []) as Array<{
      id: string;
      display_name: string | null;
      username: string | null;
    }>) {
      actorMap.set(a.id, a.display_name ?? a.username ?? "Unknown");
    }
  }

  return entries.map((e) => ({
    id: String(e.id),
    actorId: (e.actor_id as string | null) ?? null,
    action: String(e.action),
    entityType: String(e.entity_type),
    entityId: (e.entity_id as string | null) ?? null,
    requestId: (e.request_id as string | null) ?? null,
    createdAt: String(e.created_at),
    actorName: e.actor_id ? actorMap.get(String(e.actor_id)) ?? null : null,
  }));
}

// --- helpers ---

function sumAmounts(
  data: Array<Record<string, unknown>> | null,
): number {
  if (!data) return 0;
  return data.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
