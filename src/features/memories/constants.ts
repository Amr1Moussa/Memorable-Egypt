import type { PublicationStatus } from "@/lib/supabase/types";

/**
 * Memory constants + the publication state machine (Phase 4 #5).
 *
 * Two flows (doc 15):
 *   FREE (Genesis): draft → pending_moderation → published
 *   PAID:           draft → awaiting_payment → receipt_uploaded →
 *                  pending_verification → published
 *
 * Invalid transitions are rejected by `canTransition()`. `published_at` is
 * set only on the → published transition (one-way).
 *
 * Source: doc 15 (Payments), doc 17 (Moderation), Phase 4 requirement #5.
 */

/** Valid transitions. Anything not listed is forbidden. */
export const TRANSITIONS: Readonly<Record<PublicationStatus, readonly PublicationStatus[]>> = {
  draft: ["pending_moderation", "awaiting_payment"],
  pending_moderation: ["published", "rejected", "draft"],
  awaiting_payment: ["receipt_uploaded", "draft"],
  receipt_uploaded: ["pending_verification", "draft"],
  pending_verification: ["published", "rejected", "draft"],
  published: [], // terminal (admin can hide/delete via moderation `status`, not here)
  rejected: ["draft"],
};

/** Whether a transition is allowed by the state machine. */
export function canTransition(
  from: PublicationStatus,
  to: PublicationStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses that mean the memory is still editable by the owner. */
export const EDITABLE_STATUSES: readonly PublicationStatus[] = [
  "draft",
  "rejected",
] as const;

export function isEditable(status: PublicationStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/** Statuses visible in the author's "my memories" list (incl. drafts). */
export const AUTHOR_VISIBLE_STATUSES: readonly PublicationStatus[] = [
  "draft",
  "pending_moderation",
  "awaiting_payment",
  "receipt_uploaded",
  "pending_verification",
  "published",
  "rejected",
] as const;

/** Max tags per memory (doc 10.8). */
export const MAX_TAGS = 10;

/** Auto-save debounce (Phase 4 #1). */
export const AUTOSAVE_DEBOUNCE_MS = 1500;

/** Title length bounds (kept in sync with lib/validations/common). */
export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const STORY_MIN = 20;
export const STORY_MAX = 10_000;
