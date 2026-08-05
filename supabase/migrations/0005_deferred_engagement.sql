-- ============================================================================
-- Migration 0005 — Deferred engagement tables
-- ============================================================================
-- These tables are part of doc 07's schema and are cheap to create now, so we
-- include them to keep the schema complete and avoid a risky migration later.
-- Per ADR D6, the features themselves (comments, reactions, bookmarks,
-- notifications) are NOT implemented in the MVP until the core flow is stable.
--
-- RLS in migration 0007 blocks ALL writes from non-admins for these tables,
-- so they are inert until a later phase explicitly enables them.
--
-- Reports, by contrast, ARE part of the core MVP moderation loop (docs 17,
-- 18) and will be writable by authenticated users.
--
-- Source: docs 06 (Domain Model), 07 (Database Design), 17 (Moderation).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Comments (deferred)
-- --------------------------------------------------------------------------

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  memory_id   uuid not null references public.memories (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  content     text not null,
  status      content_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint comments_length check (char_length(content) between 1 and 500)
);

comment on table public.comments is
  'Deferred (ADR D6). 500-char public response to a memory (doc 10.11).';

-- --------------------------------------------------------------------------
-- 2. Reactions (deferred)
-- --------------------------------------------------------------------------
-- Per ADR D5: four emotional types only. One per user per type.

create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  memory_id   uuid not null references public.memories (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  reaction    reaction_type not null,
  created_at  timestamptz not null default now(),
  unique (user_id, memory_id, reaction)
);

comment on table public.reactions is
  'Deferred (ADR D5/D6). Four types: love, nostalgic, emotional, inspiring.';

-- --------------------------------------------------------------------------
-- 3. Bookmarks (deferred)
-- --------------------------------------------------------------------------
-- Private saved memories (doc 10.10). Never affects public ranking.

create table if not exists public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  memory_id   uuid not null references public.memories (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, memory_id)
);

comment on table public.bookmarks is 'Deferred (ADR D6). Private saved memory.';

-- --------------------------------------------------------------------------
-- 4. Reports (MVP — part of moderation loop)
-- --------------------------------------------------------------------------

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles (id) on delete cascade,
  memory_id     uuid not null references public.memories (id) on delete cascade,
  reason        report_reason not null,
  description   text,
  status        report_status not null default 'pending',
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  -- One user cannot report the same memory twice (doc 17).
  unique (reporter_id, memory_id)
);

comment on table public.reports is
  'User-submitted moderation request. One report per user per memory (doc 17).';

-- --------------------------------------------------------------------------
-- 5. Notifications (deferred)
-- --------------------------------------------------------------------------

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        notification_type not null,
  title       text not null,
  body        text,
  -- Polymorphic-ish link to the relevant entity (memory id, payment id, …).
  entity_type text,
  entity_id   uuid,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.notifications is 'Deferred (ADR D6). User inbox.';
