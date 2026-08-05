-- ============================================================================
-- Migration 0006 — System settings and audit log
-- ============================================================================
-- Settings: key/value business configuration manageable by admins without a
-- code deploy (doc 22). Includes the Genesis Campaign counter, prices, and
-- payment-method details.
--
-- Audit log: immutable record of admin actions (docs 17, 18, 21).
--
-- Source: docs 22 (System Settings), 17 (Moderation), 18 (Admin Dashboard),
--         21 (Security).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Settings
-- --------------------------------------------------------------------------
-- A single table with category-scoped keys; values are typed via `type`
-- and stored as text/jsonb. The app layer reads + caches these.

create table if not exists public.settings (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,        -- general | payments | pricing | genesis | ai | features | …
  key          text not null,
  value        text not null,
  type         text not null default 'string'
               check (type in ('string', 'number', 'boolean', 'json')),
  -- Optional description surfaced in the admin UI.
  description  text,
  updated_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (category, key)
);

comment on table public.settings is
  'Admin-managed business config (doc 22). Cached app-side on read.';

-- Seed the core settings (doc 22 defaults + doc 15 payment details + Genesis).
insert into public.settings (category, key, value, type, description) values
  -- General
  ('general', 'platform_name', 'Memorable Egypt', 'string', 'Public platform name.'),
  ('general', 'support_email', 'memorable.egypt@gmail.com', 'string', 'Doc 15 payment support email.'),
  -- Payments — manual verification details (doc 15)
  ('payments', 'instapay_username', 'amr.mahmod.moussa@instapay', 'string', 'InstaPay handle.'),
  ('payments', 'bank_name', 'Qatar National Bank (QNB)', 'string', 'Bank transfer bank name.'),
  ('payments', 'bank_account_holder', 'Amr Mahmoud Moussa', 'string', 'Bank account holder.'),
  ('payments', 'bank_account_number', '4738650300507566', 'string', 'Bank account number.'),
  ('payments', 'verification_sla_hours', '12', 'number', 'Target admin review time (doc 15).'),
  -- Pricing — Standard pin (doc 15)
  ('pricing', 'standard_tier1', '30', 'number', 'EGP. Standard pin, tier 1.'),
  ('pricing', 'standard_tier2', '50', 'number', 'EGP. Standard pin, tier 2.'),
  ('pricing', 'standard_tier3', '90', 'number', 'EGP. Standard pin, tier 3.'),
  ('pricing', 'standard_tier4', '180', 'number', 'EGP. Standard pin, tier 4.'),
  -- Pricing — Legacy pin (doc 15)
  ('pricing', 'legacy_tier1', '80', 'number', 'EGP. Legacy pin, tier 1.'),
  ('pricing', 'legacy_tier2', '130', 'number', 'EGP. Legacy pin, tier 2.'),
  ('pricing', 'legacy_tier3', '200', 'number', 'EGP. Legacy pin, tier 3.'),
  ('pricing', 'legacy_tier4', '400', 'number', 'EGP. Legacy pin, tier 4.'),
  -- Genesis Campaign (doc 15 + ADR AD-11)
  ('genesis', 'enabled', 'true', 'boolean', 'Is the Genesis 100 free-pin campaign active?'),
  ('genesis', 'max_free_pins', '100', 'number', 'Total free pins in the campaign.'),
  ('genesis', 'used_free_pins', '0', 'number', 'Approved free pins so far. Decremented on approval.'),
  -- AI (ADR D3 — abstraction only in MVP)
  ('ai', 'enabled', 'false', 'boolean', 'AI features gated off in MVP.'),
  ('ai', 'provider', 'noop', 'string', 'Active AI provider. noop in MVP.')
on conflict (category, key) do nothing;

-- --------------------------------------------------------------------------
-- 2. Audit log (immutable)
-- --------------------------------------------------------------------------
-- Every admin action appends a row here. Never updated or deleted (docs 17, 21).

create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references public.profiles (id) on delete set null,
  action        text not null,        -- e.g. payment.approve, memory.hide
  entity_type   text not null,
  entity_id     uuid,
  -- JSON snapshot of before/after for sensitive changes (settings, payments).
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

comment on table public.audit_log is
  'Immutable record of admin actions (docs 17, 18, 21).';
