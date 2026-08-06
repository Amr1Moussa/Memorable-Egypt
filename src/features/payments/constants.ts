import type { PaymentStatus } from "@/types/domain";

/**
 * Payment constants + the payment state machine (Phase 5 #3).
 *
 * Lifecycle (doc 15 + Phase 5 requirement #3):
 *   draft → awaiting_payment → receipt_uploaded → pending_verification
 *        → approved → published
 *
 * Rejection returns the memory to awaiting_payment with a reason.
 *
 * Source: doc 15 (Payments), Phase 5 requirement #3.
 */

/** Valid payment-status transitions. Anything else is rejected. */
export const PAYMENT_TRANSITIONS: Readonly<
  Record<PaymentStatus, readonly PaymentStatus[]>
> = {
  draft: ["awaiting_payment"],
  awaiting_payment: ["receipt_uploaded", "draft"],
  receipt_uploaded: ["pending_verification", "awaiting_payment"],
  pending_verification: ["approved", "rejected", "awaiting_payment"],
  approved: ["published"],
  rejected: ["awaiting_payment"],
  published: [], // terminal
  failed: ["awaiting_payment"],
};

/** Whether a transition is allowed. */
export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Payment statuses that mean the record is locked (no user edits). */
export const LOCKED_STATUSES: readonly PaymentStatus[] = [
  "pending_verification",
  "approved",
  "published",
] as const;

export function isLocked(status: PaymentStatus): boolean {
  return LOCKED_STATUSES.includes(status);
}

/** Reference prefix (doc 15 — ME-2026-000001). */
export const REFERENCE_PREFIX = "ME";

/** Documented rejection reasons (doc 15). */
export const REJECTION_REASONS = [
  "Incorrect amount",
  "Blurry receipt",
  "Duplicate receipt",
  "Missing payment",
  "Invalid reference",
] as const;

/** Receipt upload constraints — the authoritative values come from settings;
 *  these mirror doc 15 defaults for client-side advisory validation. */
export const RECEIPT_DEFAULTS = {
  maxBytes: 10 * 1024 * 1024,
  acceptedMime: ["image/png", "image/jpeg", "application/pdf"],
  acceptedExtensions: [".png", ".jpg", ".jpeg", ".pdf"],
} as const;
