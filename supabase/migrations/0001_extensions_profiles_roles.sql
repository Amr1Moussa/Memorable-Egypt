-- ============================================================================
-- Migration 0001 — Extensions, enums, profiles, role helpers
-- ============================================================================
-- Foundation for the entire schema. Idempotent: safe to re-run on a fresh DB.
--
-- Source: docs 06 (Domain Model), 07 (Database Design), 12 (Authentication),
--         21 (Security).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Extensions
-- --------------------------------------------------------------------------
-- PostGIS: geospatial queries for locations (doc 13 — nearby/bbox/cluster).
-- pgcrypto: gen_random_uuid() for default UUIDs.
-- uuid-ossp: auxiliary UUID helpers if needed.
create extension if not exists postgis;
create extension if not exists pgcrypto;
-- unaccent: ASCII transliteration for slug generation (migration 0009).
create extension if not exists unaccent;

-- --------------------------------------------------------------------------
-- 2. Enumerated types
-- --------------------------------------------------------------------------
-- Mirror src/types/domain.ts exactly. These are the only value sets allowed
-- in their columns; the app layer never invents new values.

do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visibility as enum ('public', 'private', 'unlisted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pin_type as enum ('standard', 'legacy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum (
  'draft',
  'awaiting_payment',
  'receipt_uploaded',
  'pending_verification',
  'approved',
  'rejected',
  'published',
  'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('instapay', 'bank_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum ('active', 'hidden', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_reason as enum (
  'spam',
  'harassment',
  'hate_speech',
  'violence',
  'adult_content',
  'misinformation',
  'copyright',
  'fake_location',
  'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reaction_type as enum ('love', 'nostalgic', 'emotional', 'inspiring');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum (
  'comment',
  'reaction',
  'payment_approved',
  'payment_rejected',
  'featured',
  'genesis',
  'system'
  );
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------------
-- 3. Profiles (doc 07)
-- --------------------------------------------------------------------------
-- One row per auth.users row. Created automatically by a trigger on first
-- login (migration 0009). Public-readable; owner-writable (RLS in 0007).

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique,
  display_name  text,
  bio           text,
  avatar_url    text,
  home_city     text,
  role          user_role not null default 'user',
  -- Genesis tracking: a user may claim exactly one free pin (doc 15).
  genesis_claimed boolean not null default false,
  -- Flag set when account is requested for deletion (doc 12, 24).
  pending_deletion boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- username is case-insensitive unique (doc 12). Enforced via a functional
  -- index in migration 0008; here we keep the column nullable until the
  -- profile-completion step sets it.
  constraint profiles_username_format check (
    username is null or username ~ '^[a-zA-Z0-9_]{3,30}$'
  ),
  constraint profiles_role_valid check (role in ('user', 'admin'))
);

-- --------------------------------------------------------------------------
-- 4. Role helpers for RLS policies
-- --------------------------------------------------------------------------
-- RLS policies call these `security definer` functions so they don't need
-- to join `profiles` on every query. `auth.user_role()` is a Supabase
-- built-in that reads the JWT role claim; we keep a profile-based helper
-- as the source of truth because the dashboard may assign role via the
-- profiles table directly.

create or replace function public.current_user_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Convenient owner check used widely in RLS.
create or replace function public.is_owner(owner_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select owner_id is not null and owner_id = auth.uid();
$$;

comment on table public.profiles is
  'Public user identity. 1:1 with auth.users. Created on first login.';
comment on column public.profiles.role is
  'user | admin. Admins access /admin/* and verify payments (docs 06, 21).';
comment on column public.profiles.genesis_claimed is
  'True once the user has used their one free Genesis pin (doc 15).';
