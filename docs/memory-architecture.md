# Memory Architecture

> Memorable Egypt — memory creation, drafts, publishing, and display.
> Source of truth: docs 06 (Domain), 10 (UI/UX), 15 (Payments), 17 (Moderation),
> 20 (SEO). Phase 4 requirement #8.

## Overview

A **memory** is a personal story attached to a location. It's the platform's
primary content type. This document covers the lifecycle from draft to
published, the state machine, the image flow, slug generation, and SEO.

## Memory lifecycle

```
   ┌──────────────────────────────────────────────────────────┐
   │  AUTHOR (user)                                            │
   │                                                           │
   │  create draft  →  edit (auto-save)  →  preview  →  publish│
   │                                                           │
   └──────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
        FREE (Genesis)                  PAID
              │                               │
              ▼                               ▼
        published                  awaiting_payment
                                    (Phase 5: receipt →
                                     verification → published)
```

### Two publish paths (doc 15)

**Free (Genesis Campaign):** the first 100 approved memories are free. In the
MVP, free pins auto-publish (`draft → published`) so the core flow is
complete; admin moderation of *content* lands in Phase 6 via the
`pending_moderation` state reserved in the machine.

**Paid:** `draft → awaiting_payment`. Phase 5 wires the receipt upload and
admin verification steps (`receipt_uploaded → pending_verification →
published`).

## State machine (Phase 4 #5)

`publication_status` is distinct from the moderation `status`
(active/hidden/deleted). Valid transitions are enforced server-side by
`canTransition()` in `features/memories/constants.ts`; anything not listed is
rejected.

| From                   | To                     | Trigger                          |
| ---------------------- | ---------------------- | -------------------------------- |
| `draft`                | `pending_moderation`   | publish (free, reserved)         |
| `draft`                | `awaiting_payment`     | publish (paid)                   |
| `pending_moderation`   | `published` / `rejected` / `draft` | admin / author          |
| `awaiting_payment`     | `receipt_uploaded` / `draft` | Phase 5 / author cancel   |
| `receipt_uploaded`     | `pending_verification` / `draft` | Phase 5                |
| `pending_verification` | `published` / `rejected` / `draft` | admin (Phase 6)        |
| `published`            | — (terminal)           | admin can hide/delete via `status` |
| `rejected`             | `draft`                | author re-edits                  |

`published_at` is set **only** on the → `published` transition (one-way).

## Draft flow (Phase 4 #3)

1. **Create on location pick:** the wizard POSTs `/api/v1/memories` with a
   `locationId` and a placeholder title. Returns the new `id`; the URL becomes
   `/create?id=…` so a refresh resumes the draft.
2. **Auto-save:** the wizard uses `useAutoSave` (debounced 1.5s) to PATCH
   `/api/v1/memories/{id}` on every change. Status is shown ("Saving… / Saved /
   Unsaved changes"). `beforeunload` warns if there are unsaved changes.
3. **Continue later:** drafts appear in `/memories` (the author's list) and
   open back into the wizard at the same step.
4. **Delete:** soft-deletes (`deleted_at` set, `status = deleted`) — owner
   only, only while editable.

Editing is only allowed while `publication_status ∈ {draft, rejected}`.

## Publishing flow (Phase 4 #5)

```
preview step
     │
     ├─ "Publish for free" ──► POST /memories/{id}/publish {path:"free"}
     │                            │
     │                            └─► draft → published (sets published_at)
     │                                  redirect to /memories
     │
     └─ "Continue to payment" ──► POST /memories/{id}/publish {path:"paid"}
                                      │
                                      └─► draft → awaiting_payment
                                            (Phase 5 takes over here)
```

Before any transition, the service validates completeness (title ≥ 3 chars,
story ≥ 20 chars, location set). Pricing is delegated to `features/payments`
(Phase 5); this module only enforces the transitions + ownership.

## Image flow (Phase 4 #2)

Reuses the storage abstraction from Phase 2.3:

1. Wizard step 3 renders `ImageUploader` (drag/drop via native input, reorder
   + remove, progress via fetch).
2. Each image POSTs to `/api/v1/media/upload` (multipart), which validates
   (MIME + size from configurable settings), generates a UUID path under
   `memory-images/{memoryId}/{uuid}.ext`, stores the original, reads
   dimensions, and persists a `memory_media` row.
3. The wizard tracks the uploaded set in local state; removing drops it from
   the working set (storage cleanup happens when the memory is saved/deleted).
4. **No image editing or filters** — original bytes only (Phase 4 #2).

## Slug generation

Slugs are derived from the title and enforced unique among non-deleted
memories (partial unique index `memories_slug_active_uniq`, migration 0008).

- **DB trigger** (`tg_memories_slug`, migration 0009): `slugify(title)` on
  insert/update-of-title. Lowercases, strips diacritics via `unaccent`,
  collapses non-`[a-z0-9]` runs to hyphens.
- **Uniqueness:** the API layer appends a short suffix on collision
  (Phase 4 route handler). The DB unique index is the final guard.

The same `slugify` logic exists in TS (`lib/utils/slugify`) and SQL
(`public.slugify`) so client previews match server-stored values.

## SEO strategy (Phase 4 #6, doc 20)

`/memories/[slug]` is a Server Component:

- **`generateMetadata`**: title (`{title} | Memorable Egypt`), description
  (first 155 chars of the story), canonical, OpenGraph (`type: article`,
  cover image), Twitter card (`summary_large_image` if a cover exists).
- **Schema.org `Article`** JSON-LD: headline, description, datePublished,
  author, image array, contentLocation, url.
- **Public visibility:** RLS gates the query — only `published_at IS NOT NULL`
  AND `visibility IN (public, unlisted)` AND `deleted_at IS NULL` AND
  `status = active` (migration 0007). Private memories never resolve.
- **Images:** lazy-loaded (`loading="lazy"`), first image eager.
- **Internal links:** breadcrumb to the location page; CTA to create a memory
  at the same place.

## Performance (Phase 4 #7)

| Concern                | Optimization                                            |
| ---------------------- | ------------------------------------------------------- |
| Long stories           | Rendered as plain `whitespace-pre-wrap` text — no heavy markdown parser |
| Images                 | Lazy-loaded; responsive `sizes`; Next/Image optimization |
| Auto-save payload      | Only changed scalar fields; tags replaced atomically    |
| List hydration         | Bulk-fetch location names + covers (no N+1)             |
| Draft loading          | Single joined query + parallel author/media/tags fetches|

## Module map

```
features/memories/
├── constants.ts          # state machine (TRANSITIONS, canTransition)
├── types.ts              # MemoryView, MemorySummary
├── schemas.ts            # Zod (draft, patch, publish, tags)
├── services.ts           # draft CRUD, publish, by-slug, tags
├── hooks/
│   └── use-auto-save.ts  # debounced dirty-save + beforeunload warn
└── components/
    ├── memory-editor.tsx # distraction-free title/story/category/visibility
    ├── tag-input.tsx     # add/remove tags, max enforcement
    ├── memory-card.tsx   # list card
    └── memory-preview.tsx# preview step
```

API: `/api/v1/memories` (create/list), `/api/v1/memories/[id]`
(GET/PATCH/DELETE), `/api/v1/memories/[id]/publish`, `/api/v1/categories`.
