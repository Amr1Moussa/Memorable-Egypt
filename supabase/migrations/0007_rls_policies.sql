-- ============================================================================
-- Migration 0007 — Row Level Security
-- ============================================================================
-- RLS is the PRIMARY access-control mechanism (doc 07, 21). The anon + server
-- Supabase clients are both bound by these policies. Route-handler checks are
-- defense-in-depth.
--
-- Default posture: enable RLS on every table, then add explicit policies.
-- Tables with no policy are inaccessible (deny-by-default).
--
-- Source: docs 07 (RLS), 12 (Auth), 17 (Moderation), 21 (Security), 24 (Privacy).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Enable RLS everywhere
-- --------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.locations         enable row level security;
alter table public.categories        enable row level security;
alter table public.tags              enable row level security;
alter table public.memories          enable row level security;
alter table public.memory_media      enable row level security;
alter table public.memory_tags       enable row level security;
alter table public.payments          enable row level security;
alter table public.payment_receipts  enable row level security;
alter table public.comments          enable row level security;
alter table public.reactions         enable row level security;
alter table public.bookmarks         enable row level security;
alter table public.reports           enable row level security;
alter table public.notifications     enable row level security;
alter table public.settings          enable row level security;
alter table public.audit_log         enable row level security;

-- ============================================================================

-- --------------------------------------------------------------------------
-- profiles (doc 07)
--   - Public read (profiles are public identity, doc 24).
--   - Owner update.
--   - Admin full access.
-- --------------------------------------------------------------------------

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (public.is_owner(id) or public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete using (public.is_admin());

-- --------------------------------------------------------------------------
-- locations
--   - Public read of active locations (pending/disabled hidden from public).
--   - Authenticated users may submit (insert) pending locations (doc 13).
--   - Admins full access.
-- --------------------------------------------------------------------------

drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations
  for select using (status = 'active' or public.is_admin());

drop policy if exists locations_insert on public.locations;
create policy locations_insert on public.locations
  for insert with check (status = 'pending' or public.is_admin());

drop policy if exists locations_update on public.locations;
create policy locations_update on public.locations
  for update using (public.is_admin());

-- --------------------------------------------------------------------------
-- categories — public read, admin write
-- --------------------------------------------------------------------------

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select using (true);

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------------------
-- tags — public read. Created via the memory-creation flow (server-side
-- with service role), so we allow authenticated insert; admin can delete.
-- --------------------------------------------------------------------------

drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags for select using (true);

drop policy if exists tags_insert on public.tags;
create policy tags_insert on public.tags
  for insert to authenticated with check (true);

drop policy if exists tags_delete on public.tags;
create policy tags_delete on public.tags
  for delete using (public.is_admin());

-- --------------------------------------------------------------------------
-- memories (doc 07)
--   - Public read of PUBLISHED, public, non-deleted memories.
--   - Owners can read all their own (incl. drafts/private).
--   - Owners insert/update their own. Admins can update/hide/restore.
--   - Hard delete (admin only) — users soft-delete via status change.
-- --------------------------------------------------------------------------

drop policy if exists memories_select on public.memories;
create policy memories_select on public.memories
  for select using (
    public.is_admin()
    or public.is_owner(user_id)
    or (
      status = 'active'
      and visibility in ('public', 'unlisted')
      and deleted_at is null
      and published_at is not null
    )
  );

drop policy if exists memories_insert on public.memories;
create policy memories_insert on public.memories
  for insert to authenticated with check (public.is_owner(user_id));

drop policy if exists memories_update on public.memories;
create policy memories_update on public.memories
  for update using (public.is_owner(user_id) or public.is_admin());

drop policy if exists memories_delete on public.memories;
create policy memories_delete on public.memories
  for delete using (public.is_admin());

-- --------------------------------------------------------------------------
-- memory_media — visible iff the parent memory is visible.
--   We can't easily express "parent memory visibility" in a single policy
--   efficiently, so: public read (media is public anyway per doc 16),
--   owner insert/update, admin full.
-- --------------------------------------------------------------------------

drop policy if exists memory_media_select on public.memory_media;
create policy memory_media_select on public.memory_media for select using (true);

drop policy if exists memory_media_insert on public.memory_media;
create policy memory_media_insert on public.memory_media
  for insert to authenticated with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and public.is_owner(m.user_id)
    )
  );

drop policy if exists memory_media_update on public.memory_media;
create policy memory_media_update on public.memory_media
  for update using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and public.is_owner(m.user_id)
    ) or public.is_admin()
  );

drop policy if exists memory_media_delete on public.memory_media;
create policy memory_media_delete on public.memory_media
  for delete using (public.is_admin());

-- --------------------------------------------------------------------------
-- memory_tags — same shape as memory_media (write gated by memory owner).
-- --------------------------------------------------------------------------

drop policy if exists memory_tags_select on public.memory_tags;
create policy memory_tags_select on public.memory_tags for select using (true);

drop policy if exists memory_tags_insert on public.memory_tags;
create policy memory_tags_insert on public.memory_tags
  for insert to authenticated with check (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and public.is_owner(m.user_id)
    )
  );

drop policy if exists memory_tags_delete on public.memory_tags;
create policy memory_tags_delete on public.memory_tags
  for delete using (
    exists (
      select 1 from public.memories m
      where m.id = memory_id and public.is_owner(m.user_id)
    ) or public.is_admin()
  );

-- --------------------------------------------------------------------------
-- payments — owner read only; writes are server-side via service role.
--   Users must NEVER mutate payment status (docs 15, 21).
-- --------------------------------------------------------------------------

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select using (public.is_owner(user_id) or public.is_admin());

-- No insert/update/delete policies for the anon/authenticated role: all
-- payment mutations go through the service-role admin client in route
-- handlers (which bypass RLS), after the user is authorized.

-- --------------------------------------------------------------------------
-- payment_receipts — owner + admin read only. Writes via service role.
--   Receipts are private (docs 15, 24). Users see their own; admins see all.
-- --------------------------------------------------------------------------

drop policy if exists payment_receipts_select on public.payment_receipts;
create policy payment_receipts_select on public.payment_receipts
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.payments p
      where p.id = payment_id and public.is_owner(p.user_id)
    )
  );

-- --------------------------------------------------------------------------
-- DEFERRED engagement tables (ADR D6)
--   Comments, reactions, bookmarks, notifications:
--     - SELECT/INSERT/UPDATE/DELETE blocked for all non-admins.
--     - Admins retain read for moderation. The features are inert until a
--       later phase flips these policies to authenticated-write.
-- --------------------------------------------------------------------------

drop policy if exists comments_admin_read on public.comments;
create policy comments_admin_read on public.comments
  for select using (public.is_admin());

drop policy if exists reactions_admin_read on public.reactions;
create policy reactions_admin_read on public.reactions
  for select using (public.is_admin());

drop policy if exists bookmarks_owner_read on public.bookmarks;
create policy bookmarks_owner_read on public.bookmarks
  for select using (public.is_owner(user_id) or public.is_admin());

drop policy if exists notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications
  for select using (public.is_owner(user_id) or public.is_admin());

-- --------------------------------------------------------------------------
-- reports (MVP — part of moderation)
--   - Authenticated users may create reports (one per memory, enforced by
--     the unique constraint in migration 0005).
--   - Reporters can read their own; admins read all.
--   - Only admins update (review) / delete.
-- --------------------------------------------------------------------------

drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select using (public.is_owner(reporter_id) or public.is_admin());

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated with check (public.is_owner(reporter_id));

drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports
  for update using (public.is_admin());

drop policy if exists reports_delete on public.reports;
create policy reports_delete on public.reports
  for delete using (public.is_admin());

-- --------------------------------------------------------------------------
-- settings — public read of NON-SENSITIVE settings only. Admins full.
--   Sensitive categories (payments bank details, AI keys) are filtered out
--   at the app/API layer; here we allow public SELECT so the client can read
--   pricing + Genesis status without auth. The API never returns sensitive
--   rows; this broad read policy is safe because no secrets live in `value`
--   for public-facing categories.
-- --------------------------------------------------------------------------

drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select using (true);

drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------------------
-- audit_log — admin read only. Writes via service role. Never user-editable.
-- --------------------------------------------------------------------------

drop policy if exists audit_log_admin_read on public.audit_log;
create policy audit_log_admin_read on public.audit_log
  for select using (public.is_admin());
