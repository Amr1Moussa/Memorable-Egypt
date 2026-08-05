-- ============================================================================
-- Migration 0004 — Payments and receipts
-- ============================================================================
-- Implements doc 15 (manual verification with InstaPay + QNB). A payment is
-- created when a user finalizes a memory draft; the user uploads a receipt;
-- an admin approves; the memory publishes.
--
-- The `providers/` abstraction lives in the app layer; the DB models the
-- state machine and the immutable financial record.
--
-- Source: docs 15 (Payments), 07 (Database Design), 21 (Security).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Payments
-- --------------------------------------------------------------------------
-- Amounts are INTEGER EGP (whole pounds) — no floats in money (doc 07).

create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete restrict,
  memory_id        uuid not null references public.memories (id) on delete restrict,
  -- Human-readable reference shown on invoices + receipts (doc 15):
  --   ME-2026-000001
  reference        text unique not null,
  -- Snapshot of the pricing decision at purchase time. Price is determined
  -- by tier × pinType server-side (ADR AD-10); we freeze it here so a later
  -- admin price change never rewrites history.
  pin_type         pin_type not null,
  tier             smallint not null check (tier between 1 and 4),
  amount           integer not null check (amount >= 0),
  currency         text not null default 'EGP',
  method           payment_method,
  status           payment_status not null default 'draft',
  -- Genesis tracking: was this payment free under the campaign?
  is_genesis       boolean not null default false,
  -- Admin verification metadata.
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint payments_amount_positive check (amount >= 0),
  constraint payments_currency_egp check (currency = 'EGP')
);

comment on table public.payments is
  'Payment record. Manual verification in MVP (doc 15). Provider-agnostic.';
comment on column public.payments.reference is
  'Unique invoice reference ME-YYYY-NNNNNN (doc 15).';
comment on column public.payments.amount is
  'Integer EGP. Frozen at purchase time; never recomputed.';
comment on column public.payments.is_genesis is
  'True if this was a free Genesis Campaign pin (one per user).';

-- --------------------------------------------------------------------------
-- 2. Receipts
-- --------------------------------------------------------------------------
-- Users upload ONE receipt per payment attempt (doc 15). A rejected payment
-- may receive a new receipt (the old row stays for audit).

create table if not exists public.payment_receipts (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references public.payments (id) on delete cascade,
  -- Storage path in a PRIVATE bucket — receipts are admin-only (docs 15, 21, 24).
  storage_path  text not null,
  file_name     text not null,
  mime_type     text not null,
  size_bytes    integer not null check (size_bytes > 0),
  uploaded_at   timestamptz not null default now()
);

comment on table public.payment_receipts is
  'Receipt uploads. Private — admins only. PNG/JPG/PDF ≤ 10MB (doc 15).';
