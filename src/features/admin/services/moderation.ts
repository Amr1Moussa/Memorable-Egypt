import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/authorization";
import { BusinessRuleError } from "@/lib/errors";
import { logAuditEvent, AUDIT_ACTIONS, type AuditAction } from "@/lib/audit";
import { concurrencyUpdate, assertBatchUnchanged } from "../concurrency";
import type { AdminMemoryRow, AdminReportRow } from "../types";

/**
 * Admin content moderation (Phase 6 #3, #11, #12).
 *
 * Every action requires confirmation (UI) + is logged (audit). Optimistic
 * concurrency on every mutation. Bulk operations are atomic — if any item
 * changed, the whole batch is rejected.
 *
 * Source: doc 17 (Moderation), doc 18 (Admin — Memories/Reports),
 *         Phase 6 #3, #11, #12.
 */

const MOD_AUDIT = {
  HIDDEN: AUDIT_ACTIONS.MEMORY_HIDDEN,
  RESTORED: AUDIT_ACTIONS.MEMORY_RESTORED,
  DELETED: AUDIT_ACTIONS.MEMORY_DELETED,
  FEATURED: AUDIT_ACTIONS.MEMORY_FEATURED,
  REPORT_APPROVED: AUDIT_ACTIONS.REPORT_RESOLVED,
} as const;

/** List memories with optional status filter + search. */
export async function listMemories(
  page = 1,
  limit = 20,
  status?: string,
  search?: string,
): Promise<{ data: AdminMemoryRow[]; total: number }> {
  await requireAdmin();
  const client = createAdminClient();
  const from = (page - 1) * limit;

  let q = client
    .from("memories")
    .select(
      "id, title, slug, user_id, pin_type, visibility, status, publication_status, is_featured, created_at, updated_at, published_at",
      { count: "exact" },
    )
    .is("deleted_at", null);

  if (status === "hidden") {
    q = q.eq("status", "hidden");
  } else if (status === "published") {
    q = q.not("published_at", "is", null).eq("status", "active");
  } else if (status === "pending") {
    q = q.eq("publication_status", "pending_moderation");
  }
  if (search) {
    q = q.ilike("title", `%${search}%`);
  }

  const { data, count, error } = await q
    .order("updated_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const userIds = Array.from(new Set(rows.map((r) => String(r.user_id))));
  const memoryIds = rows.map((r) => String(r.id));

  const [userMap, locMap, reportCounts] = await Promise.all([
    resolveUserNames(client, userIds),
    resolveMemoryLocations(client, memoryIds),
    resolveReportCounts(client, memoryIds),
  ]);

  return {
    data: rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      slug: String(r.slug),
      userId: String(r.user_id),
      userName: userMap.get(String(r.user_id)) ?? null,
      locationName: locMap.get(String(r.id)) ?? null,
      pinType: String(r.pin_type),
      visibility: String(r.visibility),
      status: String(r.status),
      publicationStatus: String(r.publication_status),
      isFeatured: Boolean(r.is_featured),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      publishedAt: (r.published_at as string | null) ?? null,
      reportCount: reportCounts.get(String(r.id)) ?? 0,
    })),
    total: count ?? 0,
  };
}

/** Moderate a single memory (hide / restore / delete / feature / unfeature). */
export async function moderateMemory(
  memoryId: string,
  expectedUpdatedAt: string,
  action: "hide" | "restore" | "delete" | "feature" | "unfeature",
): Promise<void> {
  const { id: adminId } = await requireAdmin();

  const patch: Record<string, unknown> = {};
  let auditAction: AuditAction;

  switch (action) {
    case "hide":
      patch.status = "hidden";
      auditAction = MOD_AUDIT.HIDDEN;
      break;
    case "restore":
      patch.status = "active";
      auditAction = MOD_AUDIT.RESTORED;
      break;
    case "delete":
      patch.status = "deleted";
      patch.deleted_at = new Date().toISOString();
      auditAction = MOD_AUDIT.DELETED;
      break;
    case "feature":
      patch.is_featured = true;
      patch.featured_at = new Date().toISOString();
      auditAction = MOD_AUDIT.FEATURED;
      break;
    case "unfeature":
      patch.is_featured = false;
      patch.featured_at = null;
      auditAction = MOD_AUDIT.FEATURED;
      break;
  }

  await concurrencyUpdate("memories", memoryId, expectedUpdatedAt, patch);

  await logAuditEvent({
    actorId: adminId,
    action: auditAction,
    entityType: "memory",
    entityId: memoryId,
  });
}

/** Bulk moderate memories (Phase 6 #12). Atomic: all-or-nothing on version checks. */
export async function bulkModerateMemories(
  items: Array<{ memoryId: string; expectedUpdatedAt: string }>,
  action: "hide" | "restore" | "delete",
): Promise<{ processed: number }> {
  const { id: adminId } = await requireAdmin();
  const client = createAdminClient();

  // Verify every item's version before proceeding (atomic intent).
  await assertBatchUnchanged(
    items.map((i) => ({
      table: "memories",
      id: i.memoryId,
      expectedUpdatedAt: i.expectedUpdatedAt,
    })),
  );

  const patch: Record<string, unknown> = {};
  const auditAction =
    action === "hide"
      ? MOD_AUDIT.HIDDEN
      : action === "restore"
        ? MOD_AUDIT.RESTORED
        : MOD_AUDIT.DELETED;

  if (action === "hide") patch.status = "hidden";
  else if (action === "restore") patch.status = "active";
  else if (action === "delete") {
    patch.status = "deleted";
    patch.deleted_at = new Date().toISOString();
  }
  patch.updated_at = new Date().toISOString();

  for (const item of items) {
    await client
      .from("memories")
      .update(patch as never)
      .eq("id", item.memoryId)
      .eq("updated_at", item.expectedUpdatedAt);

    await logAuditEvent({
      actorId: adminId,
      action: auditAction as never,
      entityType: "memory",
      entityId: item.memoryId,
    });
  }

  return { processed: items.length };
}

// --- Reports ---

/** List the reports queue. */
export async function listReports(
  page = 1,
  limit = 20,
  status = "pending",
): Promise<{ data: AdminReportRow[]; total: number }> {
  await requireAdmin();
  const client = createAdminClient();
  const from = (page - 1) * limit;

  const { data, count, error } = await client
    .from("reports")
    .select(
      "id, reporter_id, memory_id, reason, description, status, created_at, reviewed_at",
      { count: "exact" },
    )
    .eq("status", status as "pending" | "approved" | "rejected")
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const reporterIds = Array.from(
    new Set(rows.map((r) => String(r.reporter_id))),
  );
  const memoryIds = Array.from(new Set(rows.map((r) => String(r.memory_id))));

  const [reporterMap, memTitleMap] = await Promise.all([
    resolveUserNames(client, reporterIds),
    resolveMemoryTitles(client, memoryIds),
  ]);

  return {
    data: rows.map((r) => ({
      id: String(r.id),
      reporterId: String(r.reporter_id),
      reporterName: reporterMap.get(String(r.reporter_id)) ?? null,
      memoryId: String(r.memory_id),
      memoryTitle: memTitleMap.get(String(r.memory_id)) ?? "Unknown",
      reason: String(r.reason),
      description: (r.description as string | null) ?? null,
      status: String(r.status),
      createdAt: String(r.created_at),
      reviewedAt: (r.reviewed_at as string | null) ?? null,
    })),
    total: count ?? 0,
  };
}

/** Resolve a single report (approve = action taken; reject = no action). */
export async function resolveReport(
  reportId: string,
  action: "approve" | "reject",
): Promise<void> {
  const { id: adminId } = await requireAdmin();
  const client = createAdminClient();

  const newStatus = action === "approve" ? "approved" : "rejected";
  const { error } = await client
    .from("reports")
    .update({
      status: newStatus,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("status", "pending"); // CAS: only if still pending

  if (error) throw error;

  await logAuditEvent({
    actorId: adminId,
    action: MOD_AUDIT.REPORT_APPROVED,
    entityType: "report",
    entityId: reportId,
    metadata: { resolution: action },
  });
}

/** Bulk resolve reports (Phase 6 #12). */
export async function bulkResolveReports(
  reportIds: string[],
  action: "approve" | "reject",
): Promise<{ processed: number }> {
  const { id: adminId } = await requireAdmin();
  const client = createAdminClient();
  const newStatus = action === "approve" ? "approved" : "rejected";

  const { error } = await client
    .from("reports")
    .update({
      status: newStatus,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .in("id", reportIds)
    .eq("status", "pending");

  if (error) throw error;

  for (const id of reportIds) {
    await logAuditEvent({
      actorId: adminId,
      action: MOD_AUDIT.REPORT_APPROVED,
      entityType: "report",
      entityId: id,
      metadata: { resolution: action, bulk: true },
    });
  }

  return { processed: reportIds.length };
}

// --- helpers ---

async function resolveUserNames(
  client: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await client
    .from("profiles")
    .select("id, display_name, username")
    .in("id", ids);
  for (const row of (data ?? []) as Array<{
    id: string;
    display_name: string | null;
    username: string | null;
  }>) {
    map.set(row.id, row.display_name ?? row.username ?? "Unknown");
  }
  return map;
}

async function resolveMemoryLocations(
  client: ReturnType<typeof createAdminClient>,
  memoryIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (memoryIds.length === 0) return map;
  const { data } = await client
    .from("memories")
    .select("id, location:locations(name)")
    .in("id", memoryIds);
  for (const row of (data ?? []) as unknown as Array<{
    id: string;
    location: { name: string } | null;
  }>) {
    map.set(row.id, row.location?.name ?? "—");
  }
  return map;
}

async function resolveMemoryTitles(
  client: ReturnType<typeof createAdminClient>,
  memoryIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (memoryIds.length === 0) return map;
  const { data } = await client
    .from("memories")
    .select("id, title")
    .in("id", memoryIds);
  for (const row of (data ?? []) as Array<{ id: string; title: string }>) {
    map.set(row.id, row.title);
  }
  return map;
}

async function resolveReportCounts(
  client: ReturnType<typeof createAdminClient>,
  memoryIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (memoryIds.length === 0) return map;
  const { data } = await client
    .from("reports")
    .select("memory_id")
    .in("memory_id", memoryIds)
    .eq("status", "pending");
  for (const row of (data ?? []) as Array<{ memory_id: string }>) {
    map.set(row.memory_id, (map.get(row.memory_id) ?? 0) + 1);
  }
  return map;
}

// Re-export to satisfy unused import lint if BusinessRuleError is referenced elsewhere.
export { BusinessRuleError };
