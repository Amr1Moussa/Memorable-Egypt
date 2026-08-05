# Changelog

All notable changes to Memorable Egypt are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
for released versions. Phases track the build toward the 1.0.0 public launch.

## [Unreleased]

### Phase 2.1 — Database schema (in progress)

_Planned: Supabase project, SQL migrations (all doc-07 tables + PostGIS), RLS
policies, indexes, seed data (categories, governorates, landmark locations),
generated ER diagram._

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
