import { z } from "zod";
import { uuidSchema, paginationSchema } from "@/lib/validations/common";

/**
 * Payment validation schemas (Zod).
 *
 * Source: doc 15 (Payments), doc 08 (API Specification).
 */

/** Initiate/checkout a payment for a memory. */
export const checkoutSchema = z.object({
  memoryId: uuidSchema,
  pinType: z.enum(["standard", "legacy"]).default("standard"),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Upload a receipt for a payment. */
export const receiptUploadSchema = z.object({
  paymentId: uuidSchema,
  method: z.enum(["instapay", "bank_transfer"]),
});
export type ReceiptUploadInput = z.infer<typeof receiptUploadSchema>;

/** Calculate price for display (no auth required). */
export const calculateSchema = z.object({
  tier: z.coerce.number().int().min(1).max(4),
  pinType: z.enum(["standard", "legacy"]).default("standard"),
});
export type CalculateInput = z.infer<typeof calculateSchema>;

/** Payment history query. */
export const historyQuerySchema = paginationSchema;
