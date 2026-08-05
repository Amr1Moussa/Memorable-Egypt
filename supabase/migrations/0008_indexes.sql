-- ============================================================================
-- Migration 0008 — Indexes
-- ============================================================================
-- Spatial + B-tree indexes for the documented query patterns: map viewport
-- bbox queries, nearby search, FK joins, and filter columns (doc 07/13).
--
-- Source: docs 07 (Index Strategy), 13 (Map System).
-- ============================================================================

-- --------------------------------------------------------------------------
-- Locations — spatial + filter indexes
-- --------------------------------------------------------------------------
-- GIST on the generated geography point: powers ST_DWithin (nearby) and
-- bbox viewport queries (doc 13).
create index if not exists locations_coordinates_idx
  on public.locations using gist (coordinates);

create index if not exists locations_governorate_idx
  on public.locations (governorate);

create index if not exists locations_tier_idx
  on public.locations (tier);

create index if not exists locations_status_idx
  on public.locations (status);

create index if not exists locations_city_idx
  on public.locations (city);

-- --------------------------------------------------------------------------
-- Memories — FK + filter indexes (doc 07)
-- --------------------------------------------------------------------------
create index if not exists memories_user_id_idx        on public.memories (user_id);
create index if not exists memories_location_id_idx     on public.memories (location_id);
create index if not exists memories_category_id_idx     on public.memories (category_id);
create index if not exists memories_visibility_idx      on public.memories (visibility);
create index if not exists memories_pin_type_idx        on public.memories (pin_type);
create index if not exists memories_status_idx          on public.memories (status);
create index if not exists memories_published_at_idx    on public.memories (published_at desc);
create index if not exists memories_is_featured_idx     on public.memories (is_featured) where is_featured = true;

-- Partial unique slug: soft-deleted memories may free up their slug.
create unique index if not exists memories_slug_active_uniq
  on public.memories (slug)
  where deleted_at is null;

-- Common "list published public memories" path (doc 10 discovery).
create index if not exists memories_public_published_idx
  on public.memories (published_at desc)
  where status = 'active' and visibility = 'public' and deleted_at is null;

-- --------------------------------------------------------------------------
-- Username — case-insensitive unique (doc 12)
-- --------------------------------------------------------------------------
create unique index if not exists profiles_username_ci_uniq
  on public.profiles (lower(username))
  where username is not null;

-- --------------------------------------------------------------------------
-- Media / tags / payments / reports / notifications — FK + filter indexes
-- --------------------------------------------------------------------------
create index if not exists memory_media_memory_id_idx    on public.memory_media (memory_id);
create index if not exists memory_tags_tag_id_idx        on public.memory_tags (tag_id);
create index if not exists payments_user_id_idx          on public.payments (user_id);
create index if not exists payments_memory_id_idx        on public.payments (memory_id);
create index if not exists payments_status_idx           on public.payments (status);
create index if not exists payments_reference_idx        on public.payments (reference);
create index if not exists payment_receipts_payment_id_idx on public.payment_receipts (payment_id);
create index if not exists reports_status_idx            on public.reports (status);
create index if not exists reports_memory_id_idx         on public.reports (memory_id);
create index if not exists notifications_user_id_idx     on public.notifications (user_id);
create index if not exists audit_log_actor_id_idx        on public.audit_log (actor_id);
create index if not exists audit_log_entity_idx          on public.audit_log (entity_type, entity_id);
