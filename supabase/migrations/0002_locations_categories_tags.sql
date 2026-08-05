-- ============================================================================
-- Migration 0002 — Locations, categories, tags
-- ============================================================================
-- Locations are first-class, permanent entities (docs 06, 13). Every memory
-- must reference one. Categories are admin-managed; tags are user/AI-created.
--
-- Source: docs 06 (Domain Model), 07 (Database Design), 13 (Map System).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Locations
-- --------------------------------------------------------------------------
-- Stores both raw lat/lng columns (doc 07) AND a PostGIS geography point.
-- The point is GENERATED from the columns so inserts stay simple and the
-- two never drift. Indexes (incl. GIST) are added in migration 0008.

create table if not exists public.locations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  governorate     text,
  city            text,
  address         text,
  place_type      text,             -- landmark | museum | café | … (doc 13)
  tier            smallint not null default 1
                  check (tier between 1 and 4),
  latitude        double precision not null
                  check (latitude between -90 and 90),
  longitude       double precision not null
                  check (longitude between -180 and 180),
  -- PostGIS point derived from lat/lng. WGS84 (EPSG:4326) per doc 13.
  coordinates     geography(Point, 4326)
                  generated always as (st_setsrid(st_makepoint(longitude, latitude), 4326)::geography) stored,
  description     text,
  -- Locations can be pending (user-submitted) or verified (doc 13).
  status          text not null default 'active'
                  check (status in ('pending', 'active', 'disabled')),
  -- Denormalized counts for fast map rendering / location pages.
  memory_count    integer not null default 0,
  legacy_count    integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.locations is
  'A real geographic place. Permanent. 1:N memories (docs 06, 13).';
comment on column public.locations.tier is
  'Pricing tier 1–4 (doc 13). Tier × pin type → price (doc 15).';
comment on column public.locations.coordinates is
  'Generated PostGIS geography(Point,4326) from lat/lng. Do not write directly.';
comment on column public.locations.status is
  'pending = user-submitted awaiting admin approval; active = usable; disabled = hidden.';

-- --------------------------------------------------------------------------
-- 2. Categories
-- --------------------------------------------------------------------------
-- Admin-managed high-level memory classification (doc 10.7). Seeded in seed.sql.

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  icon        text,                 -- lucide icon name
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

comment on table public.categories is 'Admin-managed memory categories (doc 10.7).';

-- --------------------------------------------------------------------------
-- 3. Tags
-- --------------------------------------------------------------------------
-- User- or AI-created keywords. Many-to-many with memories (migration 0003).

create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  created_at  timestamptz not null default now()
);

comment on table public.tags is
  'Keywords describing memories. User- or AI-created (doc 10.8).';
