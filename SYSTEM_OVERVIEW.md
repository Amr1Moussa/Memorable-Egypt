# System Overview

> Read this first. It gives you the full picture of Memorable Egypt in under
> 30 minutes. Then dive into `ARCHITECTURE.md` for depth, or the per-domain
> docs (`docs/storage-architecture.md`, etc.) for specifics.

## What is Memorable Egypt?

A **location-first geosocial platform** where users preserve personal memories
at real places in Egypt. The map is the product — you don't scroll a feed,
you explore a country. Users pay to pin a memory at a location; the first 100
are free (Genesis Campaign).

**One sentence:** "Every place has a story. Make yours part of Egypt's map."

## Architecture at a glance

```
┌──────────────────────────────────────────────────────────┐
│                      Browser                              │
│  Next.js (Server Components + Client islands for map/forms)│
└──────────────┬────────────────────┬──────────────────────┘
               │                    │
       ┌───────▼───────┐    ┌──────▼──────┐
       │   Supabase    │    │   Mapbox    │
       │ PostgreSQL 17 │    │  GL JS +    │
       │ + PostGIS     │    │  Geocoding  │
       │ + Auth        │    └─────────────┘
       │ + Storage     │
       │ + RLS         │
       └───────┬───────┘
               │
       ┌───────▼───────┐
       │  Admin layer  │
       │ (verifies     │
       │  receipts,    │
       │  moderates)   │
       └───────────────┘
```

**Tech stack:** Next.js 16 · React 19 · TypeScript (strict) · Tailwind v4 ·
shadcn/ui · Supabase · Mapbox GL JS · Vercel.

## Feature modules

Each module in `src/features/` owns its full vertical (components, hooks,
services, schemas, types):

| Module | Responsibility |
|--------|---------------|
| `auth` | Email/Password + Google OAuth, session, profile completion |
| `profile` | Username validation + normalization, profile completion |
| `map` | Mapbox rendering, clustering, viewport loading, geolocation |
| `locations` | Viewport/nearby/search queries, location pages |
| `search` | Location search UX (fuzzy-ready interface) |
| `memories` | Draft CRUD, auto-save, publish state machine, public pages |
| `storage` | Image/avatar/receipt uploads, UUID paths, metadata |
| `payments` | Pricing engine, Genesis campaign, payment state machine |
| `admin` | Dashboard, moderation, payment approval, settings, analytics |

**Deferred** (ADR D6): `comments`, `reactions`, `bookmarks`, `notifications`.

## Request flow

```
User action → Route Handler (API) → Service (business logic) → Supabase → Response
     │              │                     │
     │         Zod validate         requireUser/Admin
     │         Rate limit           Authorization check
     │         Envelope             State machine
     │                              Audit log
```

Every API response uses the **doc-08 envelope**:
```json
{ "success": true, "data": {}, "message": "..." }
```

## Database overview

**16 tables** on PostgreSQL 17 + PostGIS:

- `profiles` — public identity (1:1 with `auth.users`)
- `locations` — geographic places (PostGIS point, tier 1–4)
- `memories` — stories attached to locations (publication_status lifecycle)
- `memory_media` — uploaded images (width/height/mime/size)
- `memory_tags` — many-to-many memories ↔ tags
- `categories`, `tags` — classification
- `payments` — payment records (manual verification state machine)
- `payment_receipts` — private receipt uploads
- `reports` — user-submitted moderation requests
- `settings` — admin-configurable business config (key/value)
- `audit_log` — immutable action log (request_id traceability)
- `comments`, `reactions`, `bookmarks`, `notifications` — deferred (D6)

**RLS** is enabled deny-by-default on every table. The anon client is
constrained entirely by policies; the admin (service-role) client bypasses RLS
but is only imported in protected server contexts.

**14 migrations** + seed data (10 categories, 27 governorates, 14 landmarks).

## Authentication flow

```
Visitor → Choose Email/Password or Google → Supabase Auth
                                              │
                                    ┌─────────┴──────────┐
                                    ▼                    ▼
                            Email verification      Google callback
                                    │                    │
                                    └────────┬───────────┘
                                             ▼
                                    /auth/callback (code exchange)
                                             │
                                    Profile auto-created (trigger)
                                             │
                                    Redirect to /explore
```

- **Supabase Auth is the single source of truth** for identity (ADR D1).
- `profiles` holds app metadata only (username, display name, role, genesis).
- Middleware refreshes sessions on every request + protects route groups.
- Three authorization layers: middleware → layout guard → service guard.

## Payment flow

```
Create memory draft → Preview → Publish
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
              FREE (Genesis)              PAID
                    │                         │
         Genesis eligibility check     Create payment (server-priced)
                    │                         │
              Memory published          Awaiting payment
                                         │
                                  Upload receipt
                                         │
                                  Admin verifies
                                         │
                              ┌──────────┴──────────┐
                              ▼                     ▼
                          Approved → Published   Rejected → Re-upload
```

- **Pricing is always server-side** (tier × pin type from settings).
- Genesis: first 100 free, one per account, auto-closes at 100.
- Receipts are **private** (admin-only RLS, signed URLs).

## Admin workflow

```
Admin signs in → /admin (role-checked at 3 layers)
                     │
        ┌────────────┼────────────┐────────────┐────────────┐
        ▼            ▼            ▼            ▼            ▼
   Dashboard    Payments     Memories     Reports      Settings
   (metrics +   (approve/    (hide/       (resolve)    (pricing,
   activity     reject)      restore/                  genesis,
   feed)                     delete)                  maintenance)
```

- **Optimistic concurrency** on every critical action (`expectedUpdatedAt`).
- **Audit logging** on every mutation (17 action types).
- **Bulk operations** for moderation + report resolution.
- **Activity feed** reuses `audit_log` (no separate system).

## Deployment architecture

```
GitHub → Vercel (auto-deploy on push to main)
              │
         ┌────┴────┐
         ▼         ▼
    Next.js    Supabase
    (CDN)      (Postgres +
               Auth + Storage)
         │
    Sentry (error tracking)
    UptimeRobot (uptime)
    Vercel Analytics (traffic)
```

- **3 environments:** development (local), staging (Vercel preview), production.
- **Env vars** validated at boot by Zod (`lib/env.ts`).
- **Secrets** never committed; `.env.local` is gitignored.
- **Rollback:** promote the previous Vercel deployment (no DB rollback).

## Where to go next

| Want to… | Read |
|----------|------|
| Understand the data model | `docs/erd.png` + `supabase/migrations/` |
| Add a new API endpoint | `CONTRIBUTING.md` + `openapi.yaml` |
| Understand the map | `docs/map-architecture.md` |
| Understand payments | `docs/payment-architecture.md` |
| Set up local dev | `ENVIRONMENT_SETUP.md` |
| Deploy to production | `docs/production-readiness.md` |
| See all decisions | `docs/adr/0001-roadmap-decisions.md` |
