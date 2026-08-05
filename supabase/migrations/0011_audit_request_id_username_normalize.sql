-- ============================================================================
-- Migration 0011 — audit_log.request_id + username normalization
-- ============================================================================
-- Phase 2.3 requirements #1 and #2:
--   1. request_id on audit_log for traceability (correlate entries from one
--      user action across rows).
--   2. Username normalization (trim + lowercase) enforced at the DB layer so
--      the case-insensitive unique index and any direct inserts stay
--      consistent regardless of how the value arrives.
--
-- Source: Phase 2.3 requirements, doc 12 (Username Rules).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. audit_log.request_id
-- --------------------------------------------------------------------------
-- Nullable so existing inserts keep working; new inserts populate it.

alter table public.audit_log
  add column if not exists request_id uuid;

comment on column public.audit_log.request_id is
  'Optional id correlating audit entries produced by a single user action.';

create index if not exists audit_log_request_id_idx
  on public.audit_log (request_id)
  where request_id is not null;

-- --------------------------------------------------------------------------
-- 2. Username normalization trigger
-- --------------------------------------------------------------------------
-- Always stores username trimmed + lowercased. This complements the app-layer
-- normalizeUsername() — defense-in-depth so any direct DB write (scripts,
-- service-role admin edits) stays consistent with the case-insensitive
-- unique index (migration 0008: profiles_username_ci_uniq).

create or replace function public.tg_normalize_username()
returns trigger
language plpgsql
as $$
begin
  if new.username is not null then
    new.username := lower(btrim(new.username));
    -- Reject if normalization emptied it or it no longer matches the format.
    if new.username !~ '^[a-z0-9_]{3,30}$' then
      raise exception 'Username must be 3–30 lowercase letters, numbers, or underscores.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_normalize_username on public.profiles;
create trigger profiles_normalize_username
  before insert or update of username on public.profiles
  for each row execute function public.tg_normalize_username();
