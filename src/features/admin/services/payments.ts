import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/authorization";
import { BusinessRuleError } from "@/lib/errors";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";
import { concurrencyUpdate } from "../concurrency";
import type { AdminPaymentRow } from "../types";

/**
 * Admin payment management (Phase 6 #2).
 *
 * Approve: completes the payment state transition AND publishes the related
 * memory AND logs an audit event — all server-side, with optimistic
 * concurrency to prevent double-processing (Phase 6 #11).
 *
 * Reject: returns to awaiting_payment with a required reason + audit.
 *
 * Source: doc 15 (Payments), doc 18 (Admin — Payments), Phase 6 #2, #11.
 */

/** Re-export canonical audit action names for admin payment ops. */
const PAYMENT_AUDIT = {
  APPROVED: AUDIT_ACTIONS.PAYMENT_APPROVED,
  REJECTED: AUDIT_ACTIONS.PAYMENT_REJECTED,
} as const;

/** The payment verification queue (receipt_uploaded + pending_verification + awaiting_payment). */
export async function getPaymentQueue(
  page = 1,
  limit = 20,
): Promise<{ data: AdminPaymentRow[]; total: number }> {
  await requireAdmin();
  const client = createAdminClient();
  const from = (page - 1) * limit;

  const { data, count, error } = await client
    .from("payments")
    .select(
      "id, reference, user_id, memory_id, pin_type, tier, amount, method, status, is_genesis, rejection_reason, created_at, updated_at, reviewed_at",
      { count: "exact" },
    )
    .in("status", ["receipt_uploaded", "pending_verification", "awaiting_payment"])
    .order("created_at", { ascending: true })
    .range(from, from + limit - 1);

  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  // Hydrate user names, memory titles, location names, and receipt presence.
  const userIds = Array.from(new Set(rows.map((r) => String(r.user_id))));
  const memoryIds = Array.from(new Set(rows.map((r) => String(r.memory_id))));

  const [userMap, memMap, receiptMap] = await Promise.all([
    resolveNames(client, "profiles", userIds, "display_name"),
    resolveMemoryInfo(client, memoryIds),
    resolveReceiptPresence(client, rows.map((r) => String(r.id))),
  ]);

  return {
    data: rows.map((r) => ({
      id: String(r.id),
      reference: String(r.reference),
      userId: String(r.user_id),
      userName: userMap.get(String(r.user_id)) ?? null,
      memoryId: String(r.memory_id),
      memoryTitle: memMap.get(String(r.memory_id))?.title ?? "Untitled",
      locationName: memMap.get(String(r.memory_id))?.locationName ?? null,
      pinType: String(r.pin_type),
      tier: Number(r.tier),
      amount: Number(r.amount),
      method: (r.method as string | null) ?? null,
      status: String(r.status),
      isGenesis: Boolean(r.is_genesis),
      rejectionReason: (r.rejection_reason as string | null) ?? null,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
      reviewedAt: (r.reviewed_at as string | null) ?? null,
      hasReceipt: receiptMap.has(String(r.id)),
    })),
    total: count ?? 0,
  };
}

// --- hydration helpers ---

async function resolveNames(
  client: ReturnType<typeof createAdminClient>,
  table: string,
  ids: string[],
  column: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await client
    .from(table)
    .select(`id, ${column}`)
    .in("id", ids);
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    map.set(String(row.id), String(row[column] ?? "Unknown"));
  }
  return map;
}

async function resolveMemoryInfo(
  client: ReturnType<typeof createAdminClient>,
  memoryIds: string[],
): Promise<Map<string, { title: string; locationName: string | null }>> {
  const map = new Map<string, { title: string; locationName: string | null }>();
  if (memoryIds.length === 0) return map;
  const { data } = await client
    .from("memories")
    .select("id, title, location:locations(name)")
    .in("id", memoryIds);
  for (const row of (data ?? []) as unknown as Array<{
    id: string;
    title: string;
    location: { name: string } | null;
  }>) {
    map.set(row.id, {
      title: row.title,
      locationName: row.location?.name ?? null,
    });
  }
  return map;
}

async function resolveReceiptPresence(
  client: ReturnType<typeof createAdminClient>,
  paymentIds: string[],
): Promise<Set<string>> {
  const set = new Set<string>();
  if (paymentIds.length === 0) return set;
  const { data } = await client
    .from("payment_receipts")
    .select("payment_id")
    .in("payment_id", paymentIds);
  for (const row of (data ?? []) as Array<{ payment_id: string }>) {
    set.add(row.payment_id);
  }
  return set;
}

/**
 * Approve a payment (Phase 6 #2):
 *   1. Concurrency check on the payment's updated_at.
 *   2. Transition payment: pending_verification/receipt_uploaded → approved.
 *   3. Publish the related memory (publication_status → published, published_at).
 *   4. Log audit event.
 */
export async function approvePayment(
  paymentId: string,
  expectedUpdatedAt: string,
): Promise<void> {
  const { id: adminId } = await requireAdmin();
  const client = createAdminClient();

  // Load + verify the payment is in an approvable state.
  const { data: payment, error } = await client
    .from("payments")
    .select("id, status, memory_id, updated_at, amount, reference")
    .eq("id", paymentId)
    .single();
  if (error || !payment) {
    throw new BusinessRuleError("Payment not found.");
  }
  const p = payment as Record<string, unknown>;

  const status = p.status as string;
  if (status !== "pending_verification" && status !== "receipt_uploaded") {
    throw new BusinessRuleError(
      "This payment isn't in a state that can be approved.",
    );
  }

  // Concurrency-safe update of the payment.
  await concurrencyUpdate("payments", paymentId, expectedUpdatedAt, {
    status: "approved",
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  });

  // Publish the memory.
  const memoryId = String(p.memory_id);
  await client
    .from("memories")
    .update({
      publication_status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", memoryId);

  // Transition payment → published (terminal).
  await client.from("payments").update({ status: "published" }).eq("id", paymentId);

  // Audit log.
  await logAuditEvent({
    actorId: adminId,
    action: PAYMENT_AUDIT.APPROVED,
    entityType: "payment",
    entityId: paymentId,
    metadata: { reference: p.reference, amount: p.amount, memoryId },
  });
}

/**
 * Reject a payment (Phase 6 #2): returns to awaiting_payment with a reason.
 */
export async function rejectPayment(
  paymentId: string,
  expectedUpdatedAt: string,
  reason: string,
): Promise<void> {
  const { id: adminId } = await requireAdmin();
  const client = createAdminClient();

  const { data: payment, error } = await client
    .from("payments")
    .select("id, status, memory_id, reference, updated_at")
    .eq("id", paymentId)
    .single();
  if (error || !payment) {
    throw new BusinessRuleError("Payment not found.");
  }
  const p = payment as Record<string, unknown>;

  const status = p.status as string;
  if (status !== "pending_verification" && status !== "receipt_uploaded") {
    throw new BusinessRuleError(
      "This payment isn't in a state that can be rejected.",
    );
  }

  await concurrencyUpdate("payments", paymentId, expectedUpdatedAt, {
    status: "rejected",
    rejection_reason: reason,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  });

  // Memory returns to awaiting_payment (user can re-upload a receipt).
  const memoryId = String(p.memory_id);
  await client
    .from("memories")
    .update({ publication_status: "awaiting_payment" })
    .eq("id", memoryId);

  // Payment returns to awaiting_payment after rejection (doc 15 flow).
  await client
    .from("payments")
    .update({ status: "awaiting_payment" })
    .eq("id", paymentId);

  await logAuditEvent({
    actorId: adminId,
    action: PAYMENT_AUDIT.REJECTED,
    entityType: "payment",
    entityId: paymentId,
    metadata: { reference: p.reference, reason },
  });
}

/** Generate a signed URL for the admin to view a private receipt. */
export async function getReceiptSignedUrl(
  paymentId: string,
): Promise<string | null> {
  await requireAdmin();
  const client = createAdminClient();

  const { data: receipt } = await client
    .from("payment_receipts")
    .select("storage_path")
    .eq("payment_id", paymentId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .single();

  const path = (receipt as { storage_path: string } | null)?.storage_path;
  if (!path) return null;

  const { data } = await client.storage
    .from("payment-receipts")
    .createSignedUrl(path, 300); // 5-minute expiry

  return data?.signedUrl ?? null;
}

// Re-export canonical audit action names used elsewhere.
export { AUDIT_ACTIONS };
