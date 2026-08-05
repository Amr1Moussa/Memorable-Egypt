-- ============================================================================
-- Migration 0003 — Memories, media, tags
-- ============================================================================
-- Memories are the primary content type (docs 06, 10). A memory cannot exist
-- without a location or an author. Legacy Pins are memories with pin_type
-- = 'legacy'. Soft-deleted via deleted_at.
--
-- Source: docs 06 (Domain Model), 07 (Database Design), 10 (UI/UX),
--         16 (Storage System).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Memories
-- --------------------------------------------------------------------------

create table if not exists public.memories (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete restrict,
  location_id     uuid not null references public.locations (id) on delete restrict,
  category_id     uuid references public.categories (id) on delete set null,
  title           text not null,
  slug            text not null,
  story           text not null,
  pin_type        pin_type not null default 'standard',
  visibility      visibility not null default 'public',
  status          content_status not null default 'active',
  -- AI metadata (doc 14). Tracks whether AI was used; no AI content in MVP.
  ai_enhanced     boolean not null default false,
  -- Legacy/Premium flags surface in the UI (doc 10).
  is_featured     boolean not null default false,
  featured_at     timestamptz,
  -- Publish lifecycle. A memory is only "live" once published_at is set,
  -- which happens AFTER payment approval (doc 15).
  published_at    timestamptz,
  -- Story length bounds enforced at the API layer too, but DB-level guards
  -- protect against direct inserts / future scripts.
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  -- Slug must be unique among non-deleted memories. We add a partial unique
  -- index in migration 0008 so soft-deleted slugs can be reused.
  constraint memories_title_length check (char_length(title) between 3 and 120),
  constraint memories_story_length check (char_length(story) between 20 and 10000),
  constraint memories_pin_type_valid check (pin_type in ('standard', 'legacy')),
  constraint memories_visibility_valid check (visibility in ('public', 'private', 'unlisted')),
  constraint memories_status_valid check (status in ('active', 'hidden', 'deleted'))
);

comment on table public.memories is
  'Primary content type. User-authored story attached to a location.';
comment on column public.memories.pin_type is
  'standard | legacy. Legacy = premium (doc 13).';
comment on column public.memories.visibility is
  'public | private | unlisted. Private never appears in search (doc 12).';
comment on column public.memories.published_at is
  'Set only after payment approval. Null = draft/awaiting publication (doc 15).';
comment on column public.memories.is_featured is
  'Admin-set flag for featured discovery + location pages (docs 10, 18).';

-- --------------------------------------------------------------------------
-- 2. Memory media (doc 16)
-- --------------------------------------------------------------------------
-- One memory may contain up to 10 images. Enforcement of the count cap is
-- in the API layer + a trigger guard (migration 0009).

create table if not exists public.memory_media (
  id            uuid primary key default gen_random_uuid(),
  memory_id     uuid not null references public.memories (id) on delete cascade,
  storage_path  text not null,        -- Supabase Storage object path
  public_url    text not null,        -- CDN URL (denormalized for fast reads)
  alt_text      text,
  width         integer,
  height        integer,
  size_bytes    integer not null check (size_bytes > 0),
  mime_type     text not null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

comment on table public.memory_media is
  'Images attached to a memory. Max 10 per memory (docs 10, 16).';

-- --------------------------------------------------------------------------
-- 3. Memory ↔ Tag (many-to-many)
-- --------------------------------------------------------------------------

create table if not exists public.memory_tags (
  memory_id  uuid not null references public.memories (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (memory_id, tag_id)
);

comment on table public.memory_tags is 'Many-to-many: memories ↔ tags.';
