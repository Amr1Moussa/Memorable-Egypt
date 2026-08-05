-- ============================================================================
-- Migration 0010 — Auth-related settings + configurable storage limits
-- ============================================================================
-- Phase 2.2 additions:
--   - maintenance_mode      (general)  gates the whole site for non-admins
--   - registration_enabled  (general)  gates new signups
--   - storage limits moved  (storage)  out of app constants into settings so
--                                       admins can tune them without a deploy
--
-- No new tables; just inserts into the existing `settings` table.
-- Idempotent via ON CONFLICT.
--
-- Source: docs 22 (System Settings), 16 (Storage System), 15 (Payments).
-- ============================================================================

insert into public.settings (category, key, value, type, description) values
  -- General — operational switches (doc 22 §1, §11)
  ('general', 'maintenance_mode', 'false', 'boolean',
   'When true, non-admin visitors see a maintenance page (doc 22 §11).'),
  ('general', 'registration_enabled', 'true', 'boolean',
   'When false, new account signup is disabled.'),

  -- Storage — configurable limits (doc 16, replaces app constants)
  ('storage', 'memory_image_max_files', '10', 'number',
   'Max images per memory (doc 16).'),
  ('storage', 'memory_image_max_bytes', '10485760', 'number',
   'Max bytes per memory image (10MB, doc 16).'),
  ('storage', 'avatar_max_bytes', '5242880', 'number',
   'Max bytes per avatar (5MB, doc 16).'),
  ('storage', 'receipt_max_bytes', '10485760', 'number',
   'Max bytes per payment receipt (10MB, doc 15).'),
  ('storage', 'memory_image_accept', 'image/jpeg,image/png,image/webp', 'string',
   'Accepted MIME types for memory images (doc 16).'),
  ('storage', 'avatar_accept', 'image/jpeg,image/png,image/webp', 'string',
   'Accepted MIME types for avatars (doc 16).'),
  ('storage', 'receipt_accept', 'image/png,image/jpeg,application/pdf', 'string',
   'Accepted MIME types for payment receipts (doc 15).')
on conflict (category, key) do nothing;

comment on schema public is 'Memorable Egypt public schema.';
