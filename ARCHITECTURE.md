# Architecture

> Memorable Egypt — production MVP. This document is a navigational map of the
> codebase and the decisions behind it. The authoritative product/engineering
> spec is the sibling `MemorableEGYPT_Docs/` folder; this file reflects how
> that spec is realized in code.

## At a glance

| Layer      | Choice                                            |
| ---------- | ------------------------------------------------- |
| Frontend   | Next.js 16 (App Router), React 19, TypeScript     |
| Styling    | Tailwind CSS v4, shadcn/ui (`new-york`), Lucide   |
| Backend    | Supabase (PostgreSQL 17 + PostGIS, Auth, Storage) |
| Maps       | Mapbox GL JS + Mapbox Geocoding                   |
| State      | Zustand (UI), TanStack Query (server)             |
| Forms      | React Hook Form + Zod (shared client/server)      |
| Payments   | Manual (InstaPay + QNB), provider-agnostic        |
| AI         | Abstraction only — no live calls in MVP           |
| Deploy/Ops | Vercel, Sentry, UptimeRobot, Vercel Analytics     |

## High-level data flow

```
Browser ──► Next.js (Server Components / Route Handlers)
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
   Supabase    Mapbox    (Paymob — future)
  (Auth/DB/   (geocoding/     │
   Storage)    map tiles)     │
        │                      │
        └──────► (admin verifies receipts) ◄┘
```

- The browser talks **only** to Next.js and, where appropriate, directly to
  Supabase via the **anon** key (constrained by Row-Level Security).
- Secrets (service role, Mapbox secret, future AI key) never leave the server.
- Payments are manual in the MVP (doc 15): the user uploads a receipt, an
  admin approves, the memory publishes.

## Project layout

```
src/
├── app/                     # Next.js App Router
│   ├── (public)/            # SEO-indexable: /, /explore, /locations/*, /memories/*, /u/*
│   ├── (auth)/              # NOT indexed: /login, /register, /forgot-password
│   ├── (app)/               # Authenticated: /create, /profile, /payments, /settings
│   ├── (admin)/             # Admin role only: /admin/*
│   ├── api/v1/              # REST route handlers (doc 08 envelope)
│   ├── layout.tsx           # root: fonts, metadata, QueryProvider
│   ├── globals.css          # design tokens (CSS vars) + Tailwind v4 theme
│   ├── not-found / error / loading
│
├── features/                # FEATURE-FIRST — each owns its whole vertical
│   ├── auth/  profile/  map/  locations/  categories/  search/
│   ├── memories/  storage/  payments/  ai/  reports/  admin/  moderation/
│   └── (deferred: comments/ reactions/ bookmarks/ notifications/ — see ADR D6)
│
├── components/              # cross-feature shared UI
│   ├── ui/                  # shadcn/ui primitives (button, input, card, …)
│   ├── layout/              # SiteHeader, SiteFooter, Container
│   ├── navigation/          # TopNav, MobileBottomNav, AdminSidebar
│   └── shared/              # EmptyState, ErrorState, PageHeader, Skeletons
│
├── lib/                     # cross-cutting infra (no feature logic)
│   ├── supabase/            # client (anon) / server (per-request) / admin (service)
│   ├── mapbox/  validations/  utils/  constants/
│   ├── env.ts               # Zod-validated process.env (server/client split)
│   ├── response.ts          # doc-08 API envelope helpers
│   ├── errors.ts            # AppError hierarchy → HTTP status map
│   ├── logger.ts            # structured logger (Sentry-ready)
│   └── rate-limit.ts        # doc-08 limit presets (Redis-ready)
│
├── hooks/                   # global hooks (feature hooks live in features/)
├── providers/               # QueryProvider (TanStack)
└── types/                   # api.ts (envelope), domain.ts (enums)
```

Each `features/<name>/` follows the same internal shape:

```
features/<name>/
├── components/   # presentation
├── api/          # route handlers (app/api/v1/<name>)
├── services/     # server-only business logic
├── schemas/      # zod (shared with client)
├── providers/    # swappable infra (payments, AI)
├── hooks/        # client data hooks
├── types.ts
├── constants.ts
└── index.ts      # public surface
```

## Core architectural principles

**Server-first, thin client.** Server Components by default; `"use client"` only
for the interactive map, forms, uploads, and payment UI. Pricing, payment
status transitions, and every authorization check run server-side — the client
never computes money or trusts its own auth (doc 05).

**Three Supabase clients, least privilege.**
- `client.ts` — browser, anon key, RLS-bound.
- `server.ts` — per-request, cookie-bound, RLS-bound.
- `admin.ts` — service role, bypasses RLS; imported only inside
  `app/api/v1/admin/*` and trusted jobs, always after an admin-role check.

RLS is the **primary** access-control mechanism; route-handler checks are
defense-in-depth (docs 07, 21).

**Feature-first + layered.** Cohesion by business domain; within each feature,
presentation / application / domain / infrastructure are separated (doc 05).

**Zod as the single validation source.** Each feature owns its schemas; client
and server import the same one; DTO types are `z.infer`-derived. No duplicate
types, no untyped `any`.

**Provider abstractions for Payments & AI.**
- Payments: `PaymentProvider` interface; MVP ships `ManualVerificationProvider`
  (InstaPay + QNB + receipt + admin approval). Paymob/Fawry/Stripe slot in
  later without changing call sites (ADR D2).
- AI: `AIProvider` interface; MVP ships `NoopProvider`. No Gemini key used
  (ADR D3).

**Pure pricing engine.** `(tier, pinType, genesisState) → price` is a pure
server-only function — trivially unit-testable, impossible to tamper with.

**Genesis 100 as first-class domain logic.** Server-enforced counter,
one-free-per-account, auto-disable at 100, permanent Founder badge.

## Data model summary

Two first-class entities anchor everything:

```
User ──owns──► Memory ──attached to──► Location
```

A Memory cannot exist without a Location (docs 06, 07). Legacy Pins are a
premium kind of Memory. See `docs/erd.png` (generated) and `supabase/migrations/`
for the full schema, RLS policies, and indexes.

Key tables: `profiles`, `locations`, `memories`, `memory_media`, `categories`,
`tags`, `memory_tags`, `comments`, `reactions`, `bookmarks`, `notifications`,
`payments`, `reports`, plus `settings` for admin-configurable business rules.

## Security model

- HTTPS only; secure cookies; CSRF/SameSite where applicable.
- Row-Level Security on every table (doc 07).
- Server-side authorization on every protected request (doc 12).
- Input validation with Zod at every boundary (doc 08).
- File validation: MIME + extension + size (docs 15, 16, 21).
- Secrets in env only, validated at boot, never shipped to the browser.
- Admin actions are audit-logged and immutable.

## SEO (built in from day one)

Per-page metadata, Open Graph + Twitter cards, canonical URLs, `robots.ts`,
`sitemap.ts`, slug rules (`/locations/{slug}`, `/memories/{slug}`, `/u/{username}`).
Public pages indexable; `(auth)`/`(app)`/`(admin)` are not (doc 20).

## Quality gates

TypeScript `strict` + `noUncheckedIndexedAccess`, ESLint flat config (no `any`),
Prettier, CI (typecheck + lint + build on every PR), Dependabot for security.
Tests are added through the phases and culminate in Phase 7.

## Decisions record

All product and architectural decisions are in `docs/adr/`. Start with
`0001-roadmap-decisions.md` — it captures the six founder decisions and the
eighteen Phase-1 architectural decisions, plus their consequences.
