-- ============================================================================
-- Migration 0014 — Memory publication status
-- ============================================================================
-- Phase 4 introduces an explicit publication lifecycle distinct from the
-- moderation `status` (active/hidden/deleted) and the existing `published_at`
-- timestamp. `publication_status` tracks where a memory is in the publish
-- flow, and a guard function enforces valid transitions (Phase 4 #5).
--
-- States (Phase 4 #5):
--   draft                → user is still editing
--   pending_moderation   → free Genesis pin submitted for review
--   awaiting_payment     → paid pin, waiting for the user to pay
--   receipt_uploaded     → paid pin, receipt submitted (Phase 5)
--   pending_verification → paid pin, admin verifying (Phase 5)
--   published            → live on the map + memory page
--   rejected             → moderator/admin rejected (back to draft)
--
-- `published_at` is set only on the → published transition.
--
-- Source: doc 15 (Payments), doc 17 (Moderation), Phase 4 requirement #5.
-- ============================================================================

do $$ begin
  create type publication_status as enum (
    'draft',
    'pending_moderation',
    'awaiting_payment',
    'receipt_uploaded',
    'pending_verification',
    'published',
    'rejected'
  );
exception when duplicate_object then null; end $$;

alter table public.memories
  add column if not exists publication_status publication_status not null default 'draft';

comment on column public.memories.publication_status is
  'Where the memory is in the publish flow. Distinct from status (moderation).';

create index if not exists memories_publication_status_idx
  on public.memories (publication_status);

-- The memories_select RLS policy (migration 0007) gates public reads on
-- `published_at is not null`. We keep that condition; publication_status is
-- an additional surface for the UI + admin dashboard.
