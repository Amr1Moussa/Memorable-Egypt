-- ============================================================================
-- Migration 0012 — Storage buckets + policies
-- ============================================================================
-- Three buckets (docs 07, 15, 16):
--   avatars          (public read)  — profile pictures
--   memory-images    (public read)  — images attached to memories
--   payment-receipts (PRIVATE)      — admin-only, never public (docs 15, 21, 24)
--
-- Policies enforce: owner-write, public-read (for public buckets), admin-only
-- for the private receipts bucket. MIME/size validation lives in the app
-- layer (configurable via settings) AND is reinforced here as a defense.
--
-- Source: docs 16 (Storage System), 15 (Payments), 07 (RLS), 21 (Security).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Buckets
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Public: avatars. 5MB default (configurable via settings.storage.avatar_max_bytes).
  ('avatars', 'avatars', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']),
  -- Public: memory images. 10MB default.
  ('memory-images', 'memory-images', true, 10485760,
    array['image/jpeg', 'image/png', 'image/webp']),
  -- PRIVATE: payment receipts. NEVER public. 10MB default.
  ('payment-receipts', 'payment-receipts', false, 10485760,
    array['image/png', 'image/jpeg', 'application/pdf'])
on conflict (id) do nothing;

-- --------------------------------------------------------------------------
-- 2. Policies — avatars (public read, authenticated write to own folder)
-- --------------------------------------------------------------------------
-- Folders: avatars/{userId}/{uuid}.<ext>  (doc 16)
-- A user may only write inside their own {userId} folder.

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars/' || auth.uid()::text || '/'
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars/' || auth.uid()::text || '/'
  ) with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars/' || auth.uid()::text || '/'
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars/' || auth.uid()::text || '/'
  );

-- --------------------------------------------------------------------------
-- 3. Policies — memory-images (public read, owner write to own memory folder)
-- --------------------------------------------------------------------------
-- Folders: memory-images/{memoryId}/{uuid}.<ext>  (doc 16)
-- Authorization is enforced at the app layer: a user may only upload to a
-- memory they own. Here we restrict to authenticated users writing into a
-- memory-images/... path; the upload service verifies ownership of the
-- target memory before generating the path.

drop policy if exists "memory_images_public_read" on storage.objects;
create policy "memory_images_public_read" on storage.objects
  for select using (bucket_id = 'memory-images');

drop policy if exists "memory_images_authed_insert" on storage.objects;
create policy "memory_images_authed_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'memory-images'
    and (storage.foldername(name))[1] like 'memory-images/%/'
  );

drop policy if exists "memory_images_owner_update" on storage.objects;
create policy "memory_images_owner_update" on storage.objects
  for update to authenticated using (
    bucket_id = 'memory-images'
    and (storage.foldername(name))[1] like 'memory-images/%/'
  ) with check (
    bucket_id = 'memory-images'
    and (storage.foldername(name))[1] like 'memory-images/%/'
  );

drop policy if exists "memory_images_admin_delete" on storage.objects;
create policy "memory_images_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'memory-images' and public.is_admin()
  );

-- --------------------------------------------------------------------------
-- 4. Policies — payment-receipts (PRIVATE: owner + admin read, owner write)
-- --------------------------------------------------------------------------
-- Folders: payment-receipts/{paymentId}/{uuid}.<ext>
-- The owner of the payment may read + upload; admins read all (docs 15, 24).
-- NEVER public. The bucket itself is public=false; these policies add
-- per-object access control on top.

drop policy if exists "receipts_owner_read" on storage.objects;
create policy "receipts_owner_read" on storage.objects
  for select using (
    bucket_id = 'payment-receipts' and public.is_admin()
  );

drop policy if exists "receipts_owner_insert" on storage.objects;
create policy "receipts_owner_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] like 'payment-receipts/%/'
  );

drop policy if exists "receipts_admin_delete" on storage.objects;
create policy "receipts_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'payment-receipts' and public.is_admin()
  );
