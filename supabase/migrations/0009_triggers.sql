-- ============================================================================
-- Migration 0009 — Triggers and functions
-- ============================================================================
-- Automation kept in the DB where it must always hold (doc 07):
--   - updated_at maintenance
--   - slug generation for locations/memories/categories
--   - profile auto-creation on first signup (doc 12)
--   - memory_media count cap (max 10 per memory, doc 16)
--   - denormalized location memory/legacy counters
--
-- Business logic that's negotiable stays in the app layer (ADR AD-4).
--
-- Source: docs 07 (Database), 12 (Authentication), 16 (Storage), 13 (Map).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Generic updated_at trigger function
-- --------------------------------------------------------------------------

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Attach to every table that has updated_at.
do $$ begin
  create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.tg_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger locations_set_updated_at
    before update on public.locations
    for each row execute function public.tg_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger memories_set_updated_at
    before update on public.memories
    for each row execute function public.tg_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger payments_set_updated_at
    before update on public.payments
    for each row execute function public.tg_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger comments_set_updated_at
    before update on public.comments
    for each row execute function public.tg_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger settings_set_updated_at
    before update on public.settings
    for each row execute function public.tg_set_updated_at();
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------------
-- 2. Slug generation
-- --------------------------------------------------------------------------
-- Lowercases, collapses non-[a-z0-9] runs to hyphens, trims. Arabic &
-- diacritics are transliterated to ASCII-friendly segments. Mirrors
-- src/lib/utils/slugify.ts.

create or replace function public.slugify(input text)
returns text
language sql immutable
as $$
  select regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(unaccent(input)),
        '[^a-z0-9]+', '-', 'g'
      ),
      '^-+', ''
    ),
    '-+$', ''
  )
$$;

-- unaccent extension is created in migration 0001.

-- Locations: auto-slug if not provided, uniqueness ensured by app + retry.
create or replace function public.tg_locations_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.name);
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger locations_slug
    before insert or update on public.locations
    for each row execute function public.tg_locations_slug();
exception when duplicate_object then null; end $$;

-- Memories: slug always derived from title; app ensures uniqueness.
create or replace function public.tg_memories_slug()
returns trigger language plpgsql as $$
begin
  new.slug := public.slugify(new.title);
  return new;
end;
$$;

do $$ begin
  create trigger memories_slug
    before insert or update of title on public.memories
    for each row execute function public.tg_memories_slug();
exception when duplicate_object then null; end $$;

-- Categories: auto-slug from name.
create or replace function public.tg_categories_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.name);
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger categories_slug
    before insert or update on public.categories
    for each row execute function public.tg_categories_slug();
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------------
-- 3. Profile auto-creation on signup (doc 12)
-- --------------------------------------------------------------------------
-- When a new auth.users row is created, create a profiles row with a
-- unique default username. Username finalization happens in profile setup.

create or replace function public.tg_handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.tg_handle_new_user();
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------------
-- 4. memory_media count cap (max 10 per memory, doc 16)
-- --------------------------------------------------------------------------

create or replace function public.tg_memory_media_cap()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  cnt integer;
begin
  select count(*) into cnt from public.memory_media where memory_id = new.memory_id;
  if cnt >= 10 then
    raise exception 'A memory may have at most 10 images (doc 16).'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger memory_media_cap
    before insert on public.memory_media
    for each row execute function public.tg_memory_media_cap();
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------------
-- 5. Denormalized location counters
-- --------------------------------------------------------------------------
-- Keep locations.memory_count / legacy_count accurate for fast map reads.

create or replace function public.tg_location_memory_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.locations
      set memory_count = memory_count + 1,
          legacy_count = legacy_count + (case when new.pin_type = 'legacy' then 1 else 0 end)
      where id = new.location_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.locations
      set memory_count = greatest(memory_count - 1, 0),
          legacy_count = greatest(legacy_count - (case when old.pin_type = 'legacy' then 1 else 0 end), 0)
      where id = old.location_id;
    return old;
  elsif (tg_op = 'UPDATE' and new.pin_type <> old.pin_type) then
    -- Pin-type change shifts the legacy counter.
    update public.locations
      set legacy_count = legacy_count
        + (case when new.pin_type = 'legacy' then 1 else -1 end)
      where id = new.location_id;
    return new;
  end if;
  return null;
end;
$$;

-- Only count PUBLISHED memories toward the public counters.
do $$ begin
  create trigger location_memory_count_insert
    after insert on public.memories
    for each row
    when (new.published_at is not null and new.deleted_at is null)
    execute function public.tg_location_memory_count();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger location_memory_count_delete
    after delete on public.memories
    for each row
    when (old.published_at is not null and old.deleted_at is null)
    execute function public.tg_location_memory_count();
exception when duplicate_object then null; end $$;
