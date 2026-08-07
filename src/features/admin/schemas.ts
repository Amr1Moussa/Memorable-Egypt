import { z } from "zod";
import { uuidSchema, paginationSchema } from "@/lib/validations/common";

/**
 * Admin operation schemas (Zod).
 *
 * Source: doc 18 (Admin Dashboard), Phase 6 requirements.
 */

/** Approve a payment. */
export const approvePaymentSchema = z.object({
  paymentId: uuidSchema,
  expectedUpdatedAt: z.string().min(1),
});
export type ApprovePaymentInput = z.infer<typeof approvePaymentSchema>;

/** Reject a payment — reason is required (Phase 6 #2). */
export const rejectPaymentSchema = z.object({
  paymentId: uuidSchema,
  expectedUpdatedAt: z.string().min(1),
  reason: z.string().trim().min(3, "A rejection reason is required.").max(200),
});
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;

/** Moderate a memory (hide / restore / delete / feature). */
export const moderateMemorySchema = z.object({
  memoryId: uuidSchema,
  expectedUpdatedAt: z.string().min(1),
  action: z.enum(["hide", "restore", "delete", "feature", "unfeature"]),
});
export type ModerateMemoryInput = z.infer<typeof moderateMemorySchema>;

/** Bulk moderate memories (Phase 6 #12). */
export const bulkModerateSchema = z.object({
  items: z
    .array(
      z.object({
        memoryId: uuidSchema,
        expectedUpdatedAt: z.string().min(1),
      }),
    )
    .min(1)
    .max(100),
  action: z.enum(["hide", "restore", "delete"]),
});
export type BulkModerateInput = z.infer<typeof bulkModerateSchema>;

/** Resolve a report. */
export const resolveReportSchema = z.object({
  reportId: uuidSchema,
  action: z.enum(["approve", "reject"]),
  expectedUpdatedAt: z.string().optional(),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

/** Bulk resolve reports (Phase 6 #12). */
export const bulkResolveReportsSchema = z.object({
  reportIds: z.array(uuidSchema).min(1).max(100),
  action: z.enum(["approve", "reject"]),
});
export type BulkResolveReportsInput = z.infer<typeof bulkResolveReportsSchema>;

/** Update a location. */
export const updateLocationSchema = z.object({
  locationId: uuidSchema,
  expectedUpdatedAt: z.string().min(1),
  tier: z.number().int().min(1).max(4).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

/** Update a setting. */
export const updateSettingSchema = z.object({
  settingId: uuidSchema,
  expectedUpdatedAt: z.string().min(1),
  value: z.string().min(1).max(10000),
});
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

/** Generic admin list query with filters. */
export const adminListQuerySchema = z.object({
  ...paginationSchema.shape,
  status: z.string().optional(),
  search: z.string().optional(),
});
