import { z } from "zod";
import {
  titleSchema,
  storySchema,
  uuidSchema,
  paginationSchema,
} from "@/lib/validations/common";
import { MAX_TAGS } from "./constants";

/**
 * Memory validation schemas (Zod). Shared by client forms + server routes.
 *
 * Source: doc 10 (Memory Creation), doc 01 (PRD §10.5), Phase 4 requirement #1.
 */

/** Tag: short, alphanumeric-friendly keyword (doc 10.8). */
export const tagSchema = z
  .string()
  .trim()
  .min(2, "Tag must be at least 2 characters")
  .max(30, "Tag must be 30 characters or fewer")
  .regex(/^[a-zA-Z0-9\s_-]+$/, "Tags may only contain letters, numbers, spaces, hyphens, and underscores");

/** Create/update a draft. The wizard writes drafts continuously (Phase 4 #1, #3). */
export const memoryDraftSchema = z.object({
  locationId: uuidSchema,
  title: titleSchema,
  story: storySchema,
  categoryId: uuidSchema.nullable().optional(),
  visibility: z.enum(["public", "private", "unlisted"]).default("public"),
  pinType: z.enum(["standard", "legacy"]).default("standard"),
  tags: z.array(tagSchema).max(MAX_TAGS, `A memory can have at most ${MAX_TAGS} tags`).default([]),
});
export type MemoryDraftInput = z.infer<typeof memoryDraftSchema>;

/** Patch a draft — all fields optional so the wizard can auto-save partial state. */
export const memoryPatchSchema = memoryDraftSchema.partial();
export type MemoryPatchInput = z.infer<typeof memoryPatchSchema>;

/** Publish action: which path to take (Phase 4 #5). */
export const publishSchema = z.object({
  pinType: z.enum(["standard", "legacy"]).default("standard"),
  /** "free" claims a Genesis free pin (if eligible); "paid" starts payment. */
  path: z.enum(["free", "paid"]).default("free"),
});
export type PublishInput = z.infer<typeof publishSchema>;

/** List my memories with optional status filter. */
export const myMemoriesQuerySchema = z.object({
  ...paginationSchema.shape,
  status: z
    .enum(["draft", "pending_moderation", "awaiting_payment", "published", "rejected"])
    .optional(),
});
export type MyMemoriesQuery = z.infer<typeof myMemoriesQuerySchema>;
