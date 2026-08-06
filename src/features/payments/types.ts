import type { Database } from "@/lib/supabase/types";

/**
 * Payment view models.
 *
 * Source: doc 15 (Payments), doc 06 (Payment entity).
 */

export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentReceiptRow =
  Database["public"]["Tables"]["payment_receipts"]["Row"];

/** A payment with its related memory + location for display. */
export interface PaymentView {
  id: string;
  reference: string;
  memoryId: string;
  memoryTitle: string;
  locationName: string | null;
  pinType: "standard" | "legacy";
  tier: number;
  amount: number;
  currency: string;
  method: "instapay" | "bank_transfer" | null;
  status: string;
  isGenesis: boolean;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  /** Whether a receipt has been uploaded (and its id). */
  receiptId: string | null;
}

/** Public payment-method details (doc 15). Sensitive values come from the
 *  settings service, never hardcoded. */
export interface PaymentMethods {
  instapayUsername: string;
  bankName: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  supportEmail: string;
  verificationSlaHours: number;
}
