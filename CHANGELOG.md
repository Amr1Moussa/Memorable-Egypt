# Changelog

All notable changes to Memorable Egypt are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
for released versions. Phases track the build toward the 1.0.0 public launch.

## [Unreleased]

### Phase 6 — Admin Dashboard, Moderation, Analytics ✓

#### Added
- **Admin feature** (`features/admin/`):
  - `concurrency.ts` — optimistic concurrency: `concurrencyUpdate` (check
    `updated_at` → update → verify), `assertBatchUnchanged` for bulk ops.
  - `services/dashboard.ts` — metrics (parallel count queries + revenue
    aggregations) + activity feed from the existing `audit_log` (no separate
    activity system).
  - `services/payments.ts` — payment queue, `approvePayment` (state transition
    + memory publish + audit), `rejectPayment` (reason + return to
    awaiting_payment + audit), receipt signed-URL generation.
  - `services/moderation.ts` — memory list/moderate (hide/restore/delete/
    feature), `bulkModerateMemories`, reports list/resolve, `bulkResolveReports`.
  - `services/manage.ts` — users list (with auth emails + counts), locations
    list/update/approve, settings list/update, full analytics.
  - Schemas, types, `ActivityFeed` component.
- **8 admin pages** — dashboard (metrics + activity + quick links), payments
  queue (approve/reject), memories moderation, reports queue, users table,
  locations management (tier/status inline editors), settings editors,
  analytics dashboards.
- **7 admin API routes** — payments approve/reject, memories moderate/
  bulk-moderate, reports resolve, locations update, settings update.
- **Admin layout + sidebar** — role-guarded, 8-section navigation.
- **Components** — `StatCard`, `AdminSidebar`, `ActivityFeed`, inline action
  components (payment/memory/location/setting editors).
- **Audit actions extended** — `payment.approved/rejected`, `memory.hidden/
  restored/deleted/featured`, `location.updated`, `settings.changed`,
  `report.resolved` added to the canonical `AUDIT_ACTIONS`.
- **Docs** — `docs/admin-architecture.md`.

#### Design decisions (per founder direction)
- Optimistic concurrency on all critical admin actions (Phase 6 #11).
- Bulk operations for memory moderation + report resolution (Phase 6 #12).
- Activity feed reuses `audit_log` — no separate activity system (Phase 6 #13).
- User deletion not implemented; suspend is future-ready (Phase 6 #4).
- Sensitive settings masked in public APIs, editable only via admin UI.

#### Verification
- `tsc --noEmit`, `eslint`, `next build` all pass clean.
- Route tree: 8 admin pages + 7 admin API routes.
- ⚠️ Admin authentication, payment approval, moderation, settings, analytics,
  and audit logs need click-testing against the live project.

### Phase 5 — Payments ✓

#### Added
- **Payments feature** (`features/payments/`):
  - `pricing.ts` — `computePrice(tier, pinType)` server-authoritative engine
    reading all 8 price cells from settings; client never sends a price.
  - `genesis.ts` — Genesis Campaign: eligibility check, one-per-account
    enforcement (CAS on `genesis_claimed`), counter management, auto-close at 100.
  - `service.ts` — `createPayment` (price computed server-side, reference
    generated, duplicates prevented), `attachReceipt` (private storage +
    state advance), `getPayment`, `listPaymentHistory`, `getPaymentMethods`.
  - `constants.ts` — payment state machine (`canTransitionPayment`, `isLocked`).
  - Schemas, types, `PaymentStatusBadge`, `ReceiptUploader`.
- **API routes** — `/api/v1/payments/{calculate,checkout,[id],[id]/receipt,history}`.
- **Memories publish wired** — free path claims a Genesis pin + publishes;
  paid path delegates to `createPayment` (advances to `awaiting_payment`).
- **Payment pages** — `/payments` (history), `/payments/[id]` (detail:
  amount due, InstaPay + QNB instructions, receipt upload, status,
  rejection reason, processing/done states).
- **Docs** — `docs/payment-architecture.md`.

#### Design decisions (per founder direction)
- Manual verification only (doc 15); provider-agnostic for future Paymob/Fawry/Stripe.
- Receipts always private (private bucket + admin-only RLS, no public URL helper).
- Approved/published records locked (no user edits).

#### Verification
- `tsc --noEmit`, `eslint`, `next build` all pass clean.
- Route tree includes `/payments`, `/payments/[id]`, and all five
  `/api/v1/payments/*` routes.
- ⚠️ Pricing engine, Genesis rules, payment transitions, receipt uploads,
  and history need click-testing against the live project.

### Phase 4 — Memory creation & publishing ✓

#### Added
- **Migration 0014** — `publication_status` enum + column on `memories`,
  distinct from the moderation `status`, tracking the publish lifecycle.
- **Memories feature** (`features/memories/`):
  - State machine (`constants.ts`): `TRANSITIONS` + `canTransition` enforcing
    the documented valid paths; invalid transitions rejected server-side.
  - Services: `createDraft`, `getMyMemory`, `patchDraft`, `setMemoryTags`,
    `deleteDraft`, `listMyMemories`, `publishMemory` (free/paid paths),
    `getPublishedMemoryBySlug` (joined author/location/category/media/tags).
  - Schemas: draft, patch, publish, tags (Zod, shared client/server).
  - `useAutoSave` hook: debounced dirty-save (1.5s), status feedback,
    `beforeunload` unsaved-changes warning, `flush()` for pre-publish.
  - `MemoryEditor` (distraction-free title/story/category/visibility + live
    char counters + validation), `TagInput` (add/remove, max 10),
    `MemoryCard` (list), `MemoryPreview` (preview step).
- **API routes** — `/api/v1/memories` (POST create, GET list),
  `/api/v1/memories/[id]` (GET/PATCH/DELETE), `/api/v1/memories/[id]/publish`,
  `/api/v1/categories` (public list).
- **Create wizard** (`/create`) — 5-step flow: location → story → images →
  pin type → preview → publish (free) / continue to payment.
- **My memories** (`/memories`) — author's drafts + published list.
- **Public memory page** (`/memories/[slug]`) — SEO Server Component:
  `generateMetadata` (title/description/canonical/OG/Twitter), Schema.org
  `Article` JSON-LD, lazy-loaded gallery, author, location link, tags.
- **Docs** — `docs/memory-architecture.md` (lifecycle, state machine, draft
  flow, publish flow, image flow, slug generation, SEO, performance).

#### Design decisions (per founder direction)
- Comments, reactions, bookmarks remain disabled (ADR D6).
- Free Genesis pins auto-publish in the MVP (admin content moderation reserved
  via `pending_moderation` for Phase 6).
- Image editing/filters excluded; original bytes stored (Phase 2.3 abstraction).

#### Verification
- `tsc --noEmit`, `eslint`, `next build` all pass clean.
- Route tree includes `/create`, `/memories`, `/memories/[slug]`, and all
  `/api/v1/memories/*` + `/api/v1/categories` routes.
- ⚠️ Draft creation, auto-save, publishing, image uploads, preview, state
  transitions, and SEO pages need click-testing against the live project.

### Phase 3 — Interactive Egypt Map & Location System ✓

#### Added
- **Migration 0013** — two PostGIS RPC functions (`locations_in_viewport`
  via `ST_Covers`/`ST_MakeEnvelope`, `locations_nearby` via `ST_DWithin`)
  powering fast server-side spatial queries.
- **Map feature** (`features/map/`) — pure rendering, no business logic:
  - `useMapbox` — Mapbox GL JS lifecycle (create/cleanup/flyTo), Egypt bounds.
  - `useViewportLocations` — debounced (350ms) viewport → locations fetch;
    loads only what's visible, never the full dataset.
  - `useGeolocation` — browser geolocation with non-blocking denial handling.
  - `MapView` — GeoJSON source + native clustering (sized by point_count),
    tier-colored markers, click-to-expand clusters, popups, geolocate button,
    loading overlay. Receives a `fetcher` + emits `onSelectLocation`.
- **Locations feature** (`features/locations/`) — geographic data layer
  separate from memory logic: viewport/nearby/search/by-slug/governorates
  services, Zod schemas, `MapLocation`/`LocationDetail` types.
- **Search feature** (`features/search/`) — `searchLocationsClient` with a
  generic interface shaped for future fuzzy/AI drop-in; `LocationSearch`
  component (debounced, abortable, loading/empty/result states).
- **API routes** — `/api/v1/locations/{viewport,nearby,search}`, rate-limited,
  doc-08 envelope.
- **Explore page** — map + tier-filter sidebar + search + location preview.
- **Location pages** (`/locations/[slug]`) — SEO Server Component with full
  metadata, OpenGraph/Twitter, Schema.org `Place` JSON-LD, tier badge,
  coordinates, counts, pricing hint; memory list is a placeholder (Phase 4).
- **Docs** — `docs/map-architecture.md` (rendering, viewport flow, clustering,
  search, geolocation, performance, future scalability).

#### Verification
- `tsc --noEmit`, `eslint`, `next build` all pass clean.
- Route tree includes `/explore`, `/locations/[slug]`, and three
  `/api/v1/locations/*` routes.
- ⚠️ Map rendering, clustering, viewport loading, search, filters,
  geolocation, and responsive behavior need click-testing against the live
  Supabase project with a valid Mapbox token.

#### Notable fixes during build
- Aliased Mapbox `Map` → `MapboxMap` to avoid collision with JS built-in `Map`.
- Passed the map **ref** (not `.current`) into `useViewportLocations` to
  satisfy React 19's `react-hooks/refs` rule (no ref access during render).
- Restructured search/loader state to satisfy `react-hooks/set-state-in-effect`.
- Added the two RPC functions to the typed `Database` interface.

### Phase 2.3 — Storage ✓

#### Added
- **Migration 0011** — `audit_log.request_id` (nullable, indexed) for
  traceability; DB-level username normalization trigger (trim + lowercase +
  format check) complementing the app layer.
- **Migration 0012** — three storage buckets (`avatars`, `memory-images`
  public; `payment-receipts` private) with per-object RLS policies enforcing
  owner-write and admin-only receipt access.
- **Storage feature** (`features/storage/`):
  - `services.ts` — `uploadMemoryImage`, `uploadAvatar`, `uploadReceipt`:
    validate → ownership check → UUID path → store original → read dimensions.
  - `url.ts` — `getPublicUrl(bucket, path, variant?)` with the future-variants
    abstraction (every variant returns the original today; Sharp/Supabase
    Image Transformations slot in later without API change).
  - `validation.ts` — MIME + size checks against configurable settings.
  - `dimensions.ts` — server-side dimension reading via `image-size`.
  - `metadata.ts` — persist `memory_media` rows (width/height/mime/size).
- **Username normalization** — `normalizeUsername()` (trim + lowercase) threaded
  through the profile service, auth schema, and DB trigger.
- **API routes** — `/api/v1/media/avatar`, `/api/v1/media/upload` (multipart,
  rate-limited, doc-08 envelope).
- **Components** — `ImageUploader` (multi-file, preview, advisory client
  validation), `AvatarUploader` (circular, click-to-replace).
- **Docs** — `docs/storage-architecture.md` (buckets, flow, RLS, public vs
  private, naming, metadata model, future transforms).

#### Audit
- `logAuditEvent()` now accepts/derives `requestId` (crypto.randomUUID when
  omitted) and persists it on every audit_log row.

#### Design decisions (per founder direction)
- MVP pipeline stores originals as-is — **no** client-side canvas re-encoding,
  **no** EXIF stripping. Both are future server-side pipeline concerns.
- Original filenames never reach storage — UUID paths only.
- Receipts are NEVER public; served to admins via signed URLs (Phase 5).

#### Verification
- `tsc --noEmit`, `eslint`, `next build` all pass clean.
- Route tree includes `/api/v1/media/{avatar,upload}`.
- ⚠️ Storage upload flow + RLS need click-testing against the live Supabase
  project (buckets + policies exercise a real project).

### Phase 2.2 — Authentication, profiles, middleware ✓

#### Added
- **Migration 0010** — `general.maintenance_mode`,
  `general.registration_enabled`, and a full `storage.*` category moving
  upload limits (memory images, avatars, receipts) out of app constants into
  admin-configurable settings.
- **Audit service** (`lib/audit.ts`) — `logAuditEvent()` writing the 8
  required auth events via the service-role client (users can't forge audit
  entries): registered, email_verified, login_success, login_failed,
  password_reset_requested, password_changed, role_changed, admin_login.
  Failures are logged but never break the recorded operation.
- **Authorization guards** (`lib/authorization.ts`) — `requireUser()`,
  `requireAdmin()`, `requireOwnerOrAdmin()` resolving user + profile or
  throwing `AppError` (→ 401/403). Defense-in-depth alongside RLS.
- **Settings service** (`features/settings/`) — public-only in-memory cache
  (30s TTL, invalidated on writes); sensitive categories (payments bank
  details) are never cached or exposed publicly; `getStorageLimits()` reads
  limits from settings with documented defaults.
- **Auth feature** (`features/auth/`):
  - Zod schemas (shared client/server) for signup, login, forgot/reset
    password, profile completion.
  - Server services wrapping Supabase Auth (single source of truth for
    identity) with audit logging on every outcome + `registration_enabled`
    gate on signup.
  - `AuthForm` (RHF + Zod, shared by login/signup), `GoogleButton`,
    `ForgotPasswordForm`, `ResetPasswordForm`.
  - `useCurrentUser`, `useAuthActions` hooks.
- **Profile feature** (`features/profile/`) — username availability check
  (case-insensitive, reserved-names list), `completeProfile()` for first
  login, `isProfileIncomplete()` for the interstitial.
- **Pages** — login, register, forgot-password, reset-password, verify-email
  (all noindex); `/auth/callback` (OAuth + email-verification + recovery code
  exchange); `/maintenance` and `/forbidden`.
- **API routes** — `/api/v1/auth/{signup,login,logout,reset-password,
  update-password,google}` with rate limiting + the doc-08 envelope.
- **Middleware** (`src/middleware.ts`) — Supabase SSR session refresh,
  maintenance-mode gate (admins bypass), registration-aware, route-group
  protection ((auth)/(app)/(admin)), admin-role check → /forbidden.

#### Changed
- `src/lib/constants/app.ts` storage constants marked `@deprecated`; the
  settings table is now the source of truth, constants kept only as static
  fallbacks for client-side validation.
- Supabase clients (`client`/`server`/`admin`) now typed against the
  hand-authored `Database` interface; full type inference on all queries.

#### Verification
- `tsc --noEmit`, `eslint`, `next build` all pass clean.
- Route tree confirms all auth pages, API routes, callback, and middleware
  (`ƒ Proxy (Middleware)`) compiled.
- ⚠️ End-to-end auth flows (real OAuth, real email verification) require
  testing against the live Supabase project — see the post-approval checklist.

### Phase 2.1 — Database schema ✓

#### Added
- **Supabase project config** (`supabase/config.toml`) — PostgreSQL 17,
  PostGIS, Auth (Email/Password + Google OAuth), Storage, with the documented
  local ports and security settings.
- **9 SQL migrations** (`supabase/migrations/`):
  - `0001` — Extensions (postgis, pgcrypto, unaccent), enums, `profiles`,
    role-helper functions (`current_user_id`, `is_admin`, `is_owner`).
  - `0002` — `locations` (PostGIS generated geography point + tier/status),
    `categories`, `tags`.
  - `0003` — `memories` (pin_type, visibility, lifecycle), `memory_media`,
    `memory_tags` (M:N).
  - `0004` — `payments` (manual verification state machine, doc 15),
    `payment_receipts` (private).
  - `0005` — Engagement tables: `comments`, `reactions` (4 types), `bookmarks`,
    `notifications` (deferred per ADR D6) + `reports` (MVP moderation).
  - `0006` — `settings` (key/value business config, doc 22) seeded with
    payment details, all 8 prices, Genesis campaign state; `audit_log`
    (immutable).
  - `0007` — **Row-Level Security** on every table. Deny-by-default; public
    read only for genuinely public data; owner/admin write rules. Deferred
    engagement tables locked to admin-read-only.
  - `0008` — Indexes: PostGIS GIST on `locations.coordinates`, FK indexes,
    filter indexes, partial unique on `memories.slug`, case-insensitive
    unique on `profiles.username`.
  - `0009` — Triggers: `updated_at` maintenance, auto-slug generation
    (locations/memories/categories), profile auto-create on signup,
    memory-media count cap (max 10), denormalized location counters.
- **Seed data** (`supabase/seed.sql`) — 10 categories, all 27 Egyptian
  governorates, 14 Tier 3–4 landmark locations.
- **Typed database client** (`src/lib/supabase/types.ts`) — hand-authored
  `Database` interface mirroring the schema; wired into all three Supabase
  clients (`client`, `server`, `admin`).
- **ER diagram** (`docs/erd.png` + `docs/erd.dot`) — generated via Graphviz;
  first-class entities highlighted, deferred tables marked.

#### Verification
- `tsc --noEmit`, `eslint`, and `next build` all pass clean.
- SQL statically reviewed for ordering (extensions before functions),
  `auth.uid()` correctness, and `security definer set search_path` hardening.
- ⚠️ **Migrations are NOT yet execute-verified** — this sandbox has no
  Docker/WSL/native Postgres, so `supabase db reset` could not run here.
  Apply locally with `supabase db reset` (requires Docker) before Phase 2.2.

## [0.1.0] — 2026-08-05

### Phase 1 — Foundation

#### Added
- **Project scaffold** — Next.js 16 (App Router) + React 19 + TypeScript
  (strict, `noUncheckedIndexedAccess`), Tailwind CSS v4, `src/` layout.
- **Design system** (`src/app/globals.css`) — full doc-11 token set as CSS
  variables: Egyptian Sand `#D8B36A`, Nile Blue `#2C6E91`, Terracotta
  `#C76B4F`, background/surface/border/text + semantic colors, 8px spacing,
  radius scale, shadows, focus-visible rings. Exposed to Tailwind via
  `@theme inline`.
- **Cross-cutting infrastructure** (`src/lib/`):
  - `env.ts` — Zod-validated `process.env`, server/client split.
  - `response.ts` — doc-08 API envelope helpers (`ok`, `created`, `handle`).
  - `errors.ts` — `AppError` hierarchy mapped to doc-08 HTTP status codes.
  - `logger.ts` — structured, Sentry-ready logger (never logs secrets).
  - `rate-limit.ts` — doc-08 limit presets, Redis-ready.
  - `supabase/{client,server,admin}.ts` — three least-privilege clients.
  - `mapbox/client.ts` — public/secret token surface.
  - `validations/common.ts` — shared Zod primitives.
  - `utils/{cn,slugify,format}.ts`, `constants/{app,seo}.ts`.
- **Types** (`src/types/`) — domain enums (Visibility, PinType, LocationTier,
  PaymentStatus, PaymentMethod, Role, ContentStatus, ReportReason, Currency)
  and API envelope/error-code types.
- **App shell** — root layout (Geist font, metadata/OG/Twitter per doc 20,
  TanStack QueryProvider), `not-found`/`error`/`loading` pages, on-brand
  home placeholder, four route-group layouts (`(public)`/`((auth)`/`(app)`/
  `(admin)`).
- **Components** — shadcn/ui primitives (button, input, card), layout
  (SiteHeader, SiteFooter, Container), shared (EmptyState, ErrorState,
  PageHeader).
- **Quality & docs** — `.env.example` (canonical env list), `.gitignore`,
  `.editorconfig`, CI workflow (typecheck + lint + build), Dependabot,
  README, `ARCHITECTURE.md`, and `docs/adr/0001-roadmap-decisions.md`.

#### Tooling
- TypeScript strict + `noUncheckedIndexedAccess` + `noImplicitOverride`.
- ESLint 9 flat config extending `eslint-config-next`; no-`any` enforced.
- Prettier with `prettier-plugin-tailwindcss`.
- Scripts: `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`,
  `format`, `format:check`, `verify`.

#### Verification
- `tsc --noEmit`, `eslint`, and `next build` all pass clean.
- Dev server boots in ~1s; home page returns HTTP 200 with correct metadata
  and brand tokens.

### Decisions recorded (ADR 0001)
- **D1** Auth = Email/Password **and** Google OAuth (Supabase).
- **D2** Payments = manual verification (InstaPay + QNB), provider-agnostic.
- **D3** AI = abstraction only; no live Gemini calls in MVP.
- **D4** Newer dedicated docs win on conflicts; stale cross-refs ignored.
- **D5** Four emotional reactions only; bookmarks separate.
- **D6** Comments / reactions / bookmarks / notifications deferred until core
  MVP is stable.
