import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/authorization";
import {
  NotFoundError,
  BusinessRuleError,
  ValidationError,
  ForbiddenError,
} from "@/lib/errors";
import {
  getPaymentSetting,
  getPublicNumber,
} from "@/features/settings/service";
import { computePrice, formatReference, isValidTier } from "./pricing";
import { claimGenesisPin, checkGenesisEligibility } from "./genesis";
import {
  canTransitionPayment,
  isLocked,
} from "./constants";
import type { PaymentView, PaymentMethods } from "./types";
import type { PinType, PaymentStatus } from "@/types/domain";

/**
 * Payment service (server-only).
 *
 * Owns the payment state machine (Phase 5 #3), receipt handling (#4), and the
 * payment-method details (#5). Pricing is always computed server-side via the
 * pricing engine; Genesis eligibility is verified per-action (#2).
 *
 * Security (Phase 5 #7): approved/published records are locked; receipts are
 * private; duplicate submissions are prevented by the state machine + a unique
 * constraint on (memory_id) for active payments.
 *
 * Source: doc 15 (Payments), Phase 5 requirements #3–#7.
 */

// ---------------------------------------------------------------------------
// 1. Payment-method details (doc 15) — read fresh from settings, never hardcoded.
// ---------------------------------------------------------------------------

export async function getPaymentMethods(): Promise<PaymentMethods> {
  const [
    instapayUsername,
    bankName,
    bankAccountHolder,
    bankAccountNumber,
    verificationSlaHours,
  ] = await Promise.all([
    getPaymentSetting("instapay_username"),
    getPaymentSetting("bank_name"),
    getPaymentSetting("bank_account_holder"),
    getPaymentSetting("bank_account_number"),
    getPublicNumber("payments", "verification_sla_hours", 12),
  ]);

  // Support email lives under `general` (migration 0006 seed) — read it from
  // the general category via the public accessor (it's not sensitive).
  const supportEmail =
    (await getPaymentSetting("support_email")) ?? "memorable.egypt@gmail.com";

  return {
    instapayUsername: instapayUsername ?? "",
    bankName: bankName ?? "",
    bankAccountHolder: bankAccountHolder ?? "",
    bankAccountNumber: bankAccountNumber ?? "",
    supportEmail: supportEmail ?? "memorable.egypt@gmail.com",
    verificationSlaHours,
  };
}

// ---------------------------------------------------------------------------
// 2. Create a payment (checkout) — computes price, generates reference.
// ---------------------------------------------------------------------------

/**
 * Create a payment record for a memory about to be published along the paid
 * path. Computes the price server-side (Phase 5 #1, #7), generates a unique
 * reference, and prevents duplicates (one active payment per memory).
 */
export async function createPayment(
  memoryId: string,
  pinType: PinType,
): Promise<PaymentView> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  // Load the memory + verify ownership + editability.
  const { data: mem, error: memErr } = await supabase
    .from("memories")
    .select("id, user_id, location_id, publication_status, title")
    .eq("id", memoryId)
    .single();
  if (memErr || !mem) throw new NotFoundError("We couldn't find that memory.");
  const m = mem as Record<string, unknown>;
  if (m.user_id !== userId) throw new NotFoundError("We couldn't find that memory.");
  if (m.publication_status !== "draft" && m.publication_status !== "awaiting_payment") {
    throw new BusinessRuleError("This memory isn't ready for payment.");
  }

  // Prevent duplicate active payments for the same memory.
  const { data: existing } = await supabase
    .from("payments")
    .select("id, status")
    .eq("memory_id", memoryId)
    .not("status", "in", '("published","failed")')
    .limit(1);
  if (existing && existing.length > 0) {
    // Return the existing one rather than creating a duplicate.
    return getPayment(String((existing[0] as { id: string }).id));
  }

  // Resolve the tier from the location.
  const { data: loc } = await supabase
    .from("locations")
    .select("tier")
    .eq("id", String(m.location_id))
    .single();
  const tier = (loc as { tier: number } | null)?.tier ?? 1;
  if (!isValidTier(tier)) throw new ValidationError("Invalid location tier.");

  // Compute the price SERVER-SIDE (Phase 5 #1, #7). Genesis eligibility is
  // checked but the paid path only applies when the user opts out of free.
  const breakdown = await computePrice(tier, pinType, false);

  // Generate a unique reference: ME-{year}-{sequence}. Sequence derived from
  // the count of existing payments this year + 1 (good enough for MVP volume;
  // a true sequence would use a Postgres sequence — reserved for scale).
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true });
  const reference = formatReference(year, (count ?? 0) + 1);

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      user_id: userId,
      memory_id: memoryId,
      reference,
      pin_type: pinType,
      tier,
      amount: breakdown.amount,
      currency: "EGP",
      status: "awaiting_payment",
      is_genesis: false,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Advance the memory to awaiting_payment.
  await supabase
    .from("memories")
    .update({ publication_status: "awaiting_payment", pin_type: pinType })
    .eq("id", memoryId);

  return getPayment(String((payment as { id: string }).id));
}

// ---------------------------------------------------------------------------
// 3. Attach a receipt (Phase 5 #4) — store privately, advance state.
// ---------------------------------------------------------------------------

/**
 * Record a receipt upload + advance the payment to receipt_uploaded.
 * The storage object is uploaded by the route handler (which has the file
 * bytes); this service records the metadata + transitions the state.
 */
export async function attachReceipt(
  paymentId: string,
  method: "instapay" | "bank_transfer",
  receipt: {
    storagePath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  },
): Promise<PaymentView> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const payment = await loadOwnedPayment(paymentId, userId);
  if (isLocked(payment.status as PaymentStatus)) {
    throw new BusinessRuleError("This payment is already being verified.");
  }

  const from = payment.status as PaymentStatus;
  const target: PaymentStatus = "receipt_uploaded";
  if (!canTransitionPayment(from, target)) {
    throw new BusinessRuleError(
      "This payment can't accept a receipt right now.",
    );
  }

  // Insert the receipt row (private bucket; only owner + admin read via RLS).
  const { error: receiptErr } = await supabase
    .from("payment_receipts")
    .insert({
      payment_id: paymentId,
      storage_path: receipt.storagePath,
      file_name: receipt.fileName,
      mime_type: receipt.mimeType,
      size_bytes: receipt.sizeBytes,
    });
  if (receiptErr) throw receiptErr;

  // Advance payment + memory.
  await supabase
    .from("payments")
    .update({ status: target, method, updated_at: new Date().toISOString() })
    .eq("id", paymentId);
  await supabase
    .from("memories")
    .update({ publication_status: "receipt_uploaded" })
    .eq("id", payment.memoryId);

  return getPayment(paymentId);
}

// ---------------------------------------------------------------------------
// 4. Read a single payment (owner or admin).
// ---------------------------------------------------------------------------

export async function getPayment(paymentId: string): Promise<PaymentView> {
  const { id: userId, profile } = await requireUser();
  const payment = await loadOwnedPayment(paymentId, userId, profile.role);
  return payment;
}

// ---------------------------------------------------------------------------
// 5. Payment history (owner).
// ---------------------------------------------------------------------------

export async function listPaymentHistory(
  page = 1,
  limit = 20,
): Promise<{ data: PaymentView[]; total: number }> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const from = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from("payments")
    .select("id, reference, memory_id, pin_type, tier, amount, currency, method, status, is_genesis, rejection_reason, created_at, updated_at, reviewed_at", {
      count: "exact",
    })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);
  if (error) throw error;

  // Hydrate memory titles + location names.
  const memoryIds = (data ?? []).map((r) => (r as { memory_id: string }).memory_id);
  const titles = new Map<string, string>();
  const locNames = new Map<string, string | null>();
  if (memoryIds.length > 0) {
    const { data: mems } = await supabase
      .from("memories")
      .select("id, title, location:locations(name)")
      .in("id", memoryIds);
    for (const row of (mems ?? []) as unknown as Array<{
      id: string;
      title: string;
      location: { name: string } | null;
    }>) {
      titles.set(row.id, row.title);
      locNames.set(row.id, row.location?.name ?? null);
    }
  }

  // Receipt ids.
  const { data: receipts } = await supabase
    .from("payment_receipts")
    .select("payment_id, id")
    .in("payment_id", (data ?? []).map((r) => (r as { id: string }).id));
  const receiptMap = new Map<string, string>();
  for (const r of (receipts ?? []) as Array<{ payment_id: string; id: string }>) {
    receiptMap.set(r.payment_id, r.id);
  }

  const views: PaymentView[] = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const memId = String(row.memory_id);
    return {
      id: String(row.id),
      reference: String(row.reference),
      memoryId: memId,
      memoryTitle: titles.get(memId) ?? "Untitled",
      locationName: locNames.get(memId) ?? null,
      pinType: (row.pin_type as "standard" | "legacy") ?? "standard",
      tier: Number(row.tier ?? 1),
      amount: Number(row.amount ?? 0),
      currency: String(row.currency ?? "EGP"),
      method: (row.method as "instapay" | "bank_transfer" | null) ?? null,
      status: String(row.status ?? "draft"),
      isGenesis: Boolean(row.is_genesis),
      rejectionReason: (row.rejection_reason as string | null) ?? null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      reviewedAt: (row.reviewed_at as string | null) ?? null,
      receiptId: receiptMap.get(String(row.id)) ?? null,
    };
  });

  return { data: views, total: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadOwnedPayment(
  paymentId: string,
  userId: string,
  role?: string,
): Promise<PaymentView> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, reference, user_id, memory_id, pin_type, tier, amount, currency, method, status, is_genesis, rejection_reason, created_at, updated_at, reviewed_at")
    .eq("id", paymentId)
    .single();
  if (error || !data) throw new NotFoundError("We couldn't find that payment.");
  const row = data as Record<string, unknown>;
  if (row.user_id !== userId && role !== "admin") {
    throw new ForbiddenError();
  }

  // Hydrate memory title + location.
  const { data: mem } = await supabase
    .from("memories")
    .select("title, location:locations(name)")
    .eq("id", String(row.memory_id))
    .single();
  const memRow = mem as
    | { title: string; location: { name: string } | null }
    | null;

  const { data: receipt } = await supabase
    .from("payment_receipts")
    .select("id")
    .eq("payment_id", paymentId)
    .limit(1);

  return {
    id: String(row.id),
    reference: String(row.reference),
    memoryId: String(row.memory_id),
    memoryTitle: memRow?.title ?? "Untitled",
    locationName: memRow?.location?.name ?? null,
    pinType: (row.pin_type as "standard" | "legacy") ?? "standard",
    tier: Number(row.tier ?? 1),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "EGP"),
    method: (row.method as "instapay" | "bank_transfer" | null) ?? null,
    status: String(row.status ?? "draft"),
    isGenesis: Boolean(row.is_genesis),
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    receiptId:
      (receipt?.[0] as { id: string } | undefined)?.id ?? null,
  };
}

/** Re-export Genesis helpers for the publish flow to use. */
export { checkGenesisEligibility, claimGenesisPin };
