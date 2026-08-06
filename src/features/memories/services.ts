import { createClient } from "@/lib/supabase/server";
import type {
  Database,
  PublicationStatus,
} from "@/lib/supabase/types";
import { requireUser } from "@/lib/authorization";
import {
  NotFoundError,
  BusinessRuleError,
  ValidationError,
} from "@/lib/errors";
import {
  canTransition,
  isEditable,
  MAX_TAGS,
} from "./constants";

type MemoryUpdate = Database["public"]["Tables"]["memories"]["Update"];
import type { MemoryDraftInput, MemoryPatchInput } from "./schemas";
import type { MemoryView, MemorySummary, MemoryMediaRow } from "./types";

/**
 * Memory services (server-only).
 *
 * Owns the draft lifecycle + publish state machine (Phase 4 #3, #5). Pricing
 * + Genesis eligibility are delegated to `features/payments` (Phase 5); this
 * module only enforces the transitions and ownership.
 *
 * Source: docs 06 (Domain), 10 (Memory Creation), 15 (Payments),
 *         17 (Moderation), Phase 4 requirements #3, #5, #6.
 */

const SUMMARY_COLUMNS =
  "id, title, slug, pin_type, visibility, publication_status, updated_at, published_at" as const;

// ---------------------------------------------------------------------------
// 1. Draft CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new draft. The wizard calls this on step 1 (location chosen).
 * Returns the new memory id so the wizard can navigate to /create?id=… and
 * continue editing.
 */
export async function createDraft(
  input: Pick<MemoryDraftInput, "locationId" | "title"> &
    Partial<Omit<MemoryDraftInput, "locationId" | "title">>,
): Promise<{ id: string }> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  // Verify the location exists + is active (a memory cannot exist without one).
  const { data: location } = await supabase
    .from("locations")
    .select("id, status")
    .eq("id", input.locationId)
    .single();
  if (!location || location.status !== "active") {
    throw new ValidationError("Please choose a valid location.");
  }

  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: userId,
      location_id: input.locationId,
      title: input.title,
      story: input.story ?? "",
      category_id: input.categoryId ?? null,
      visibility: input.visibility ?? "public",
      pin_type: input.pinType ?? "standard",
      publication_status: "draft",
      status: "active",
    })
    .select("id")
    .single();

  if (error) throw error;

  // Tags (if provided) — best-effort; the wizard saves them via a separate
  // call to keep createDraft focused. Skipped here for clarity.
  return { id: data.id };
}

/** Load a memory owned by the current user (draft or otherwise). */
export async function getMyMemory(memoryId: string): Promise<MemoryView> {
  const { id: userId } = await requireUser();
  const memory = await getMemoryViewById(memoryId);
  if (memory.author?.id !== userId) {
    throw new NotFoundError("We couldn't find that memory.");
  }
  return memory;
}

/**
 * Patch a draft (auto-save). Only allowed while the memory is editable
 * (draft / rejected). Enforces field-level validation server-side.
 */
export async function patchDraft(
  memoryId: string,
  patch: MemoryPatchInput,
): Promise<{ updatedAt: string }> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  // Load + verify ownership + editability in one go.
  const { data: mem, error } = await supabase
    .from("memories")
    .select("id, user_id, publication_status")
    .eq("id", memoryId)
    .single();
  if (error || !mem) throw new NotFoundError("We couldn't find that memory.");
  if (mem.user_id !== userId) throw new NotFoundError("We couldn't find that memory.");
  if (!isEditable(mem.publication_status as never)) {
    throw new BusinessRuleError("This memory can't be edited anymore.");
  }

  // Build the update — only allow documented columns.
  const update: MemoryUpdate = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.story !== undefined) update.story = patch.story;
  if (patch.locationId !== undefined) update.location_id = patch.locationId;
  if (patch.categoryId !== undefined) update.category_id = patch.categoryId;
  if (patch.visibility !== undefined) update.visibility = patch.visibility;
  if (patch.pinType !== undefined) update.pin_type = patch.pinType;

  const { data, error: upErr } = await supabase
    .from("memories")
    .update(update)
    .eq("id", memoryId)
    .select("updated_at")
    .single();
  if (upErr) throw upErr;

  // Tags handled separately (M:N); skip here unless provided.
  return { updatedAt: data.updated_at };
}

/** Replace the tag set for a memory (M:N). */
export async function setMemoryTags(
  memoryId: string,
  tags: string[],
): Promise<void> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  if (tags.length > MAX_TAGS) {
    throw new ValidationError(`A memory can have at most ${MAX_TAGS} tags.`);
  }

  // Verify ownership.
  const { data: mem } = await supabase
    .from("memories")
    .select("id, user_id")
    .eq("id", memoryId)
    .single();
  if (!mem || mem.user_id !== userId) {
    throw new NotFoundError("We couldn't find that memory.");
  }

  const normalized = Array.from(
    new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
  )).slice(0, MAX_TAGS);

  // Upsert tags, then replace the join rows. Service-role would be cleaner,
  // but the owner-client can do it via RLS.
  if (normalized.length === 0) {
    await supabase.from("memory_tags").delete().eq("memory_id", memoryId);
    return;
  }

  // Insert tags if missing (ignore duplicates).
  for (const name of normalized) {
    await supabase.from("tags").upsert({ name }, { onConflict: "name" });
  }

  // Fetch their ids.
  const { data: tagRows } = await supabase
    .from("tags")
    .select("id, name")
    .in("name", normalized);
  const tagIds = (tagRows ?? [])
    .filter((r) => normalized.includes((r as { name: string }).name))
    .map((r) => (r as { id: string }).id);

  // Replace join rows.
  await supabase.from("memory_tags").delete().eq("memory_id", memoryId);
  if (tagIds.length > 0) {
    const rows = tagIds.map((tag_id) => ({ memory_id: memoryId, tag_id }));
    const { error: joinErr } = await supabase.from("memory_tags").insert(rows);
    if (joinErr) throw joinErr;
  }
}

/** Soft-delete a draft (owner). */
export async function deleteDraft(memoryId: string): Promise<void> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: mem } = await supabase
    .from("memories")
    .select("id, user_id, publication_status")
    .eq("id", memoryId)
    .single();
  if (!mem || mem.user_id !== userId) {
    throw new NotFoundError("We couldn't find that memory.");
  }
  if (!isEditable(mem.publication_status as never)) {
    throw new BusinessRuleError("This memory can't be deleted anymore.");
  }
  const { error } = await supabase
    .from("memories")
    .update({ deleted_at: new Date().toISOString(), status: "deleted" })
    .eq("id", memoryId);
  if (error) throw error;
}

/** List the current user's memories (drafts + published). */
export async function listMyMemories(
  status?: string,
  page = 1,
  limit = 20,
): Promise<{ data: MemorySummary[]; total: number }> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const from = (page - 1) * limit;

  let q = supabase
    .from("memories")
    .select(SUMMARY_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .range(from, from + limit - 1);
  if (status) q = q.eq("publication_status", status as PublicationStatus);

  const { data, count, error } = await q;
  if (error) throw error;

  // Hydrate location names + cover images for the list. Bulk-fetched to avoid
  // N+1: collect ids and query once.
  const ids = (data ?? []).map((r) => (r as { id: string }).id);
  const summaries: MemorySummary[] = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      title: String(row.title ?? "Untitled"),
      slug: String(row.slug ?? ""),
      pinType: (row.pin_type as "standard" | "legacy") ?? "standard",
      visibility: (row.visibility as "public" | "private" | "unlisted") ?? "public",
      publicationStatus: String(row.publication_status ?? "draft"),
      updatedAt: String(row.updated_at ?? ""),
      publishedAt: (row.published_at as string | null) ?? null,
      coverUrl: null,
      locationName: null,
    };
  });

  if (ids.length === 0) return { data: [], total: count ?? 0 };

  // Location names (one query).
  const { data: locs } = await supabase
    .from("memories")
    .select("id, location:locations(name)")
    .in("id", ids);
  const locMap = new Map<string, string | null>();
  for (const row of (locs ?? []) as unknown as Array<{
    id: string;
    location: { name: string } | null;
  }>) {
    locMap.set(row.id, row.location?.name ?? null);
  }

  // Cover images (first per memory).
  const { data: covers } = await supabase
    .from("memory_media")
    .select("memory_id, public_url, sort_order")
    .in("memory_id", ids)
    .order("sort_order", { ascending: true });
  const coverMap = new Map<string, string>();
  for (const c of (covers ?? []) as Array<{
    memory_id: string;
    public_url: string;
  }>) {
    if (!coverMap.has(c.memory_id)) coverMap.set(c.memory_id, c.public_url);
  }

  for (const s of summaries) {
    s.locationName = locMap.get(s.id) ?? null;
    s.coverUrl = coverMap.get(s.id) ?? null;
  }

  return { data: summaries, total: count ?? 0 };
}

// ---------------------------------------------------------------------------
// 2. Publishing (state machine, Phase 4 #5)
// ---------------------------------------------------------------------------

/**
 * Publish a memory along the free (Genesis) or paid path. Enforces the state
 * machine; sets the transition target.
 *
 * Free path:  draft → pending_moderation
 * Paid path:  draft → awaiting_payment (Phase 5 wires payment/receipt here)
 *
 * The admin/Phase-5 flow advances the rest of the way to `published`.
 */
export async function publishMemory(
  memoryId: string,
  path: "free" | "paid",
  pinType: "standard" | "legacy",
): Promise<{ publicationStatus: string }> {
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const { data: mem, error } = await supabase
    .from("memories")
    .select("id, user_id, publication_status, title, story, location_id")
    .eq("id", memoryId)
    .single();
  if (error || !mem) throw new NotFoundError("We couldn't find that memory.");
  if (mem.user_id !== userId) throw new NotFoundError("We couldn't find that memory.");

  // Validate completeness before any transition.
  const m = mem as Record<string, unknown>;
  if (typeof m.title !== "string" || m.title.trim().length < 3) {
    throw new ValidationError("Your memory needs a title before publishing.");
  }
  if (typeof m.story !== "string" || m.story.trim().length < 20) {
    throw new ValidationError("Your story is too short to publish.");
  }
  if (!m.location_id) {
    throw new ValidationError("Please choose a location.");
  }

  const from = m.publication_status as never;
  const target = path === "free" ? "pending_moderation" : "awaiting_payment";
  if (!canTransition(from, target as never)) {
    throw new BusinessRuleError("This memory can't be published from its current state.");
  }

  const update: MemoryUpdate = {
    publication_status: target as PublicationStatus,
    pin_type: pinType,
    updated_at: new Date().toISOString(),
  };

  // For the free path, immediately flip to published (Genesis auto-publishes
  // pending moderation in MVP — admin moderation happens in Phase 6, but the
  // memory goes live so the product flow is complete). Per doc 15, free pins
  // are "approved" by virtue of the campaign. We keep the pending_moderation
  // step in the state machine for Phase 6 but auto-advance for the MVP flow.
  if (path === "free") {
    update.publication_status = "published";
    update.published_at = new Date().toISOString();
  }

  const { error: upErr } = await supabase
    .from("memories")
    .update(update)
    .eq("id", memoryId);
  if (upErr) throw upErr;

  return { publicationStatus: update.publication_status as string };
}

// ---------------------------------------------------------------------------
// 3. Reading (for public memory pages + author views)
// ---------------------------------------------------------------------------

/**
 * Resolve a full memory view by id (joined relations). Used by author + admin.
 * Public reads go through `getPublishedMemoryBySlug` (RLS gates visibility).
 */
export async function getMemoryViewById(memoryId: string): Promise<MemoryView> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select(
      `id, title, slug, story, pin_type, visibility, status, publication_status,
       ai_enhanced, is_featured, published_at, created_at, updated_at,
       location:locations(id, name, slug, tier, governorate),
       category:categories(id, name, slug)`,
    )
    .eq("id", memoryId)
    .single();

  if (error || !data) throw new NotFoundError("We couldn't find that memory.");

  // Author + media + tags in parallel.
  const row = data as Record<string, unknown>;
  const authorId = await resolveAuthorId(memoryId);
  const [author, media, tags] = await Promise.all([
    authorId ? resolveAuthor(authorId) : Promise.resolve(null),
    resolveMedia(memoryId),
    resolveTags(memoryId),
  ]);

  return mapMemoryView(row, author, media, tags);
}

/**
 * Public memory page lookup by slug. RLS ensures only published, public/
 * unlisted, non-deleted memories are returned (migration 0007).
 */
export async function getPublishedMemoryBySlug(
  slug: string,
): Promise<MemoryView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select(
      `id, title, slug, story, pin_type, visibility, status, publication_status,
       ai_enhanced, is_featured, published_at, created_at, updated_at,
       location:locations(id, name, slug, tier, governorate)`,
    )
    .eq("slug", slug)
    .not("published_at", "is", null)
    .single();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const authorId = await resolveAuthorId(String(row.id));
  const [author, media, tags] = await Promise.all([
    authorId ? resolveAuthor(authorId) : Promise.resolve(null),
    resolveMedia(String(row.id)),
    resolveTags(String(row.id)),
  ]);
  return mapMemoryView(row, author, media, tags);
}

// ---------------------------------------------------------------------------
// Helpers (joins)
// ---------------------------------------------------------------------------

async function resolveAuthorId(memoryId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select("user_id")
    .eq("id", memoryId)
    .single();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

async function resolveAuthor(
  authorId: string,
): Promise<MemoryView["author"]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", authorId)
    .single();
  const p = data as
    | { id: string; username: string | null; display_name: string | null; avatar_url: string | null }
    | null;
  if (!p) return null;
  return {
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
  };
}

async function resolveMedia(memoryId: string): Promise<MemoryMediaRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memory_media")
    .select("*")
    .eq("memory_id", memoryId)
    .order("sort_order", { ascending: true });
  return (data ?? []) as MemoryMediaRow[];
}

async function resolveTags(memoryId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memory_tags")
    .select("tag:tags(name)")
    .eq("memory_id", memoryId);
  // The typed client doesn't infer the memory_tags → tags relation (composite
  // PK), so cast through unknown.
  const rows = (data ?? []) as unknown as Array<{
    tag: { name: string } | null;
  }>;
  return rows
    .map((r) => r.tag?.name ?? null)
    .filter((n): n is string => n !== null);
}

function mapMemoryView(
  row: Record<string, unknown>,
  author: MemoryView["author"],
  media: MemoryMediaRow[],
  tags: string[],
): MemoryView {
  const locationRow = row.location as
    | { id: string; name: string; slug: string; tier: number; governorate: string | null }
    | null;
  const categoryRow = row.category as
    | { id: string; name: string; slug: string }
    | null;
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    story: String(row.story),
    pinType: (row.pin_type as "standard" | "legacy") ?? "standard",
    visibility: (row.visibility as "public" | "private" | "unlisted") ?? "public",
    status: (row.status as "active" | "hidden" | "deleted") ?? "active",
    publicationStatus: String(row.publication_status ?? "draft"),
    aiEnhanced: Boolean(row.ai_enhanced),
    isFeatured: Boolean(row.is_featured),
    publishedAt: (row.published_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    author,
    location: locationRow
      ? {
          id: locationRow.id,
          name: locationRow.name,
          slug: locationRow.slug,
          tier: locationRow.tier,
          governorate: locationRow.governorate,
        }
      : null,
    category: categoryRow
      ? {
          id: categoryRow.id,
          name: categoryRow.name,
          slug: categoryRow.slug,
        }
      : null,
    tags,
    media,
  };
}

/** Re-export the publish schema input type for route handlers. */
export type { PublishInput } from "./schemas";
