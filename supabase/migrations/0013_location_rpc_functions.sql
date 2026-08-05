-- ============================================================================
-- Migration 0013 — PostGIS location RPC functions
-- ============================================================================
-- Server-side spatial functions for the map + location service (Phase 3 #1).
-- Running these in Postgres is dramatically faster than client-side filtering
-- and keeps payloads small (only viewport/nearby locations are returned).
--
-- Both functions return only the columns the map needs (Phase 3 #1: never
-- load the full dataset into the browser) and only `active` locations.
--
-- Source: doc 13 (Map System), doc 07 (PostGIS), Phase 3 requirement #1.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. locations_in_viewport
-- --------------------------------------------------------------------------
-- Bounding-box containment via ST_MakeEnvelope + ST_Covers on the geography
-- point. Optional tier/governorate/city filters and a result cap.

create or replace function public.locations_in_viewport(
  west double precision,
  south double precision,
  east double precision,
  north double precision,
  filter_tier smallint default null,
  filter_governorate text default null,
  filter_city text default null,
  result_limit integer default 500
)
returns table (
  id uuid,
  name text,
  slug text,
  tier smallint,
  latitude double precision,
  longitude double precision,
  memory_count integer,
  legacy_count integer,
  status text
)
language sql stable security definer set search_path = public
as $$
  select
    l.id, l.name, l.slug, l.tier, l.latitude, l.longitude,
    l.memory_count, l.legacy_count, l.status
  from public.locations l
  where l.status = 'active'
    and st_covers(
      st_makeenvelope(west, south, east, north, 4326),
      st_setsrid(st_makepoint(l.longitude, l.latitude), 4326)
    )
    and (filter_tier is null or l.tier = filter_tier)
    and (filter_governorate is null or l.governorate = filter_governorate)
    and (filter_city is null or l.city = filter_city)
  order by l.memory_count desc
  limit result_limit;
$$;

-- --------------------------------------------------------------------------
-- 2. locations_nearby
-- --------------------------------------------------------------------------
-- Radius search via ST_DWithin on geography (meters). Returns nearest first.

create or replace function public.locations_nearby(
  lat double precision,
  lng double precision,
  radius_m integer default 10000,
  result_limit integer default 50
)
returns table (
  id uuid,
  name text,
  slug text,
  tier smallint,
  latitude double precision,
  longitude double precision,
  memory_count integer,
  legacy_count integer,
  status text
)
language sql stable security definer set search_path = public
as $$
  select
    l.id, l.name, l.slug, l.tier, l.latitude, l.longitude,
    l.memory_count, l.legacy_count, l.status
  from public.locations l
  where l.status = 'active'
    and st_dwithin(
      l.coordinates,
      st_setsrid(st_makepoint(lng, lat), 4326)::geography,
      radius_m
    )
  order by st_distance(
    l.coordinates,
    st_setsrid(st_makepoint(lng, lat), 4326)::geography
  )
  limit result_limit;
$$;

comment on function public.locations_in_viewport is
  'Active locations inside a bounding box. Powers map viewport queries (doc 13).';
comment on function public.locations_nearby is
  'Active locations within a radius, nearest first. Powers nearby search (doc 13).';
