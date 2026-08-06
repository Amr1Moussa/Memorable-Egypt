import type { Database } from "@/lib/supabase/types";

/**
 * Memory view models. `MemoryRow` is the raw DB row; `MemoryView` joins the
 * location + author + media + category for display.
 *
 * Source: doc 06 (Domain Model), doc 10 (Memory Page), Phase 4 requirement #6.
 */

export type MemoryRow = Database["public"]["Tables"]["memories"]["Row"];
export type MemoryMediaRow =
  Database["public"]["Tables"]["memory_media"]["Row"];

/** A memory with its related display data resolved (for memory pages/cards). */
export interface MemoryView {
  id: string;
  title: string;
  slug: string;
  story: string;
  pinType: "standard" | "legacy";
  visibility: "public" | "private" | "unlisted";
  status: "active" | "hidden" | "deleted";
  publicationStatus: string;
  aiEnhanced: boolean;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined relations
  author: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  location: {
    id: string;
    name: string;
    slug: string;
    tier: number;
    governorate: string | null;
  } | null;
  category: { id: string; name: string; slug: string } | null;
  tags: string[];
  media: MemoryMediaRow[];
}

/** Lightweight draft summary for the "my memories" list. */
export interface MemorySummary {
  id: string;
  title: string;
  slug: string;
  pinType: "standard" | "legacy";
  visibility: "public" | "private" | "unlisted";
  publicationStatus: string;
  updatedAt: string;
  publishedAt: string | null;
  coverUrl: string | null;
  locationName: string | null;
}
