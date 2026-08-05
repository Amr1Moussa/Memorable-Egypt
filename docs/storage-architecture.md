# Storage Architecture

> Memorable Egypt — file storage design for the MVP and beyond.
> Source of truth: docs 16 (Storage System), 15 (Payments), 07 (RLS), 21 (Security).

## Overview

All file storage is **Supabase Storage**. Files live in storage; **only
metadata** (path, URL, dimensions, mime, size) is stored in PostgreSQL. This
separation is a hard rule (doc 16) — the database never holds blobs.

The MVP pipeline is intentionally simple:

1. **Validate** the upload (MIME + size, from configurable settings).
2. **Store the original** image as-is — no re-encoding, no EXIF stripping.
3. **Generate a UUID filename** with an organized folder path.
4. **Persist metadata** (width, height, mime_type, size_bytes) to PostgreSQL.
5. Keep the service **abstraction ready** for future server-side image
   processing (Sharp / Supabase Image Transformations) without changing the
   public API.

## Bucket structure

Three buckets, defined in `supabase/migrations/0012_storage_buckets.sql`:

| Bucket              | Visibility | Purpose                       | Default limits        |
| ------------------- | ---------- | ----------------------------- | --------------------- |
| `avatars`           | **public** | Profile pictures              | 5 MB, jpeg/png/webp   |
| `memory-images`     | **public** | Images attached to memories   | 10 MB, jpeg/png/webp  |
| `payment-receipts`  | **private**| Payment receipts (admin-only) | 10 MB, png/jpg/pdf    |

Limits and accepted MIME types are **configurable** via the `settings` table
(category `storage`, migration 0010) and surfaced through
`features/settings/service.ts`. The documented values (docs 15, 16) are the
fallback defaults.

### Folder structure (doc 16)

```
avatars/{userId}/{uuid}.<ext>
memory-images/{memoryId}/{uuid}.<ext>
payment-receipts/{paymentId}/{uuid}.<ext>
```

User-supplied filenames are **never** used for storage — every object is a
fresh UUID. This eliminates path-traversal, naming collisions, and PII leakage
through filenames (Phase 2.3 requirement #5).

## Upload flow

```
Client selects file
        │
        ▼
  Client-side advisory validation          (mime/size/count — UX only)
        │
        ▼
  POST /api/v1/media/{upload,avatar}       (multipart form-data)
        │
        ▼
  requireUser()  →  authenticate + resolve profile
        │
        ▼
  rateLimit()    →  per-user throttling
        │
        ▼
  validateUpload()                         (server AUTHORITATIVE:
        │                                   mime + size from settings)
        ▼
  Ownership check                           (memory/avatar/payment belongs
        │                                   to caller; RLS reinforces)
        ▼
  Generate UUID path                        crypto.randomUUID()
        │
        ▼
  supabase.storage.upload(original bytes)   (store AS-IS, no transforms)
        │
        ▼
  readImageDimensions()                     image-size, header-only
        │
        ▼
  persistMemoryImage()                      → memory_media row
        │                                   (width/height/mime/size)
        ▼
  Return { id, url, width, height }
```

Receipts (private bucket) follow the same shape minus dimension reading and
return a storage path (not a public URL).

### Why no client-side re-encoding in the MVP

Per the founder's Phase 2.3 direction, the MVP stores originals untouched.
Client-side canvas re-encoding and EXIF stripping were explicitly **excluded**.
The service abstraction is designed so a server-side pipeline can be introduced
later without touching client code (see "Future image transformation
architecture" below).

## RLS policies

Storage policies (migration 0012) enforce the same ownership rules as the
database RLS. Defense-in-depth: the service layer is authoritative, storage
policies reinforce.

### `avatars` (public read)
- **SELECT** — anyone (public read).
- **INSERT / UPDATE / DELETE** — authenticated, and only into
  `avatars/{ownUserId}/...`.

### `memory-images` (public read)
- **SELECT** — anyone (public read).
- **INSERT / UPDATE** — authenticated, into a `memory-images/{memoryId}/...`
  path. The upload service verifies the caller owns the target memory before
  generating the path.
- **DELETE** — admin only.

### `payment-receipts` (PRIVATE)
- **SELECT** — admin only. Owners do **not** get blanket read here; the
  owner-facing receipt view is served through a separate, scoped mechanism in
  Phase 5 (the policy is intentionally restrictive — receipts contain
  financial PII, docs 15/24).
- **INSERT** — authenticated, into `payment-receipts/{paymentId}/...` (service
  verifies ownership of the payment).
- **DELETE** — admin only.

> **Receipts are NEVER exposed through public URLs.** The bucket is
> `public=false`, and the only SELECT policy grants admin access. Phase 5
> serves receipts to admins via short-lived **signed URLs** generated
> server-side with the admin client.

## Public vs. private assets

| Asset            | Public? | How it's served                              |
| ---------------- | ------- | -------------------------------------------- |
| Avatar           | yes     | stable public URL on `profiles.avatar_url`   |
| Memory image     | yes     | stable public URL on `memory_media.public_url`|
| Payment receipt  | **no**  | signed URL (admin only), short-lived         |

The `getPublicUrl()` helper in `features/storage/url.ts` is only used for the
two public buckets. The private receipts bucket is accessed exclusively via
the admin client + signed URLs — there is no helper that constructs a public
URL for it.

## File naming strategy

- **UUIDv4** for every object: `crypto.randomUUID()`.
- Extension derived from the validated MIME type (`image/jpeg → .jpg`,
  `image/png → .png`, `image/webp → .webp`, `application/pdf → .pdf`).
- Original filename is read for logging/error messages only; it never
  influences the stored path.
- Paths are organized by owning entity id, so listing/cleanup is scoped and
  fast.

## Image metadata model

Stored on `memory_media` (migration 0003), persisted by
`features/storage/metadata.ts`:

| Column        | Type    | Source                         |
| ------------- | ------- | ------------------------------ |
| `storage_path`| text    | `{memoryId}/{uuid}.ext`        |
| `public_url`  | text    | denormalized CDN URL           |
| `alt_text`    | text    | user-supplied (optional)       |
| `width`       | integer | `image-size` header read       |
| `height`      | integer | `image-size` header read       |
| `size_bytes`  | integer | file size                      |
| `mime_type`   | text    | validated MIME                 |
| `sort_order`  | integer | caller-supplied ordering       |

Dimensions are read **server-side** with `image-size` (pure JS, header-only,
serverless-safe). Non-image uploads (PDF receipts) skip dimension reading.

## Future image transformation architecture

The MVP returns the original for every requested variant. The public API is
already shaped so a transform pipeline slots in with **no client changes**:

```ts
// features/storage/url.ts
getPublicUrl(bucket, path, variant?: "original" | "thumbnail" | "medium" | "large")
```

Two integration paths, both invisible to callers:

### Option A — Supabase Image Transformations (recommended first step)
Append render parameters to the public URL and let Supabase's CDN generate
derivatives on the edge:

```
https://<host>/storage/v1/render/image/public/memory-images/{path}?width=400&height=400&resize=cover
```

Only `getPublicUrl()` changes — it branches on `variant` to append the query
string. Zero new infrastructure.

### Option B — Pre-process pipeline (Sharp)
A background job (triggered on upload, or a scheduled sweep) writes derived
objects to `{memoryId}/{uuid}-{variant}.webp` using Sharp. `getPublicUrl()`
then resolves the variant-specific path. Suitable when transforms exceed
Supabase's limits or need custom logic (watermarks, focal-point cropping).

### Reserved future concerns (not in MVP)
- EXIF stripping — handled by whichever pipeline ships (Sharp strips by
  default; Supabase Transformations drop metadata).
- Responsive `srcset` generation — the variant enum already covers the
  breakpoints.
- AVIF/HEIC output formats — additive, no API change.

## Security checklist (docs 16, 21)

- [x] MIME type validated server-side (configurable allow-list).
- [x] File size validated server-side (configurable limits).
- [x] UUID filenames — no user-controlled paths.
- [x] Ownership verified before every upload.
- [x] Storage RLS reinforces ownership.
- [x] Private bucket for receipts — never public.
- [x] Signed URLs (Phase 5) for admin receipt access.
- [x] Accepted formats exclude executables/scripts/SVG/GIF (doc 16).
