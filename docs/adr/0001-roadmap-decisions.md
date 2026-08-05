# ADR 0001 — Roadmap & architectural decisions

- **Status:** Accepted
- **Date:** 2026-08-05
- **Decision makers:** Founder (product) + Engineering Lead

## Context

Memorable Egypt is being built as a production MVP from a 31-document
specification in the sibling `MemorableEGYPT_Docs/` folder. The docs are
internally consistent on the whole, but a handful of conflicts and ambiguities
surfaced during the documentation read-through. This ADR records the
resolutions so implementation never drifts.

## Decisions

### D1 — Authentication: Email/Password **and** Google OAuth

The PRD (doc 01) lists Email/Password plus Google OAuth as MVP requirements,
while doc 12 lists only Google OAuth with Email/Password as "future".

**Decision:** Build **both** Email/Password and Google OAuth using Supabase
Auth. Email verification and password reset are in scope. The PRD is the
higher-authority spec for product scope.

### D2 — Payments: manual verification (doc 15 wins)

Docs 05 and 08 describe automated Paymob (checkout URL + webhook). Doc 15
(dedicated Payments document) explicitly overrides this: the MVP uses manual
InstaPay + QNB bank transfer with receipt upload and admin approval.

**Decision:** Follow **doc 15**. The payment layer is built provider-agnostic
(`features/payments/providers/`) so Paymob, Fawry, and Stripe slot in later
without changing call sites. Doc 15 is the newer, more specific authority.

### D3 — AI: abstraction layer only, no live calls in MVP

Doc 04 lists AI in the MVP; doc 29 places AI in Phase 3. The founder's brief
specifies "AI — Future-ready only".

**Decision:** Ship the **provider-agnostic AI abstraction** (`features/ai/`)
with a `NoopProvider` that gracefully returns "AI unavailable." No Gemini API
key is used; no AI-generated content reaches users. The service layer, prompt
templates, and rate-limit scaffolding are in place for the future flip.

### D4 — Documentation conflicts: newer dedicated docs win

Doc 05 references a non-existent `27-Environment-Variables.md` (file 27 is
Monitoring). Doc 02 references `16-Admin.md` (file 16 is Storage).

**Decision:** The **newer dedicated document** is authoritative when conflicts
exist. Ignore the stale cross-references. The canonical environment variable
list is derived from docs 05, 21, and 25 and lives in `.env.example`.

### D5 — Reactions: four emotional reactions only; bookmarks separate

Doc 01 lists five reactions including "📌 Saved for Later," which duplicates
the Bookmark feature (§10.10). Doc 06 lists four.

**Decision:** Implement exactly four emotional reactions:
**❤️ Love, 🌅 Nostalgic, 🥹 Emotional, ✨ Inspiring.** Bookmarks remain a
separate feature.

### D6 — Engagement layer deferred until core MVP is stable

**Decision:** Comments, reactions, bookmarks, and notifications are
**optional enhancements**. They are not scaffolded in Phase 1 and will be
built only after every core MVP feature (browse → locate → create → pay →
approve → publish → public view) is complete and stable.

---

## Architectural decisions (Phase 1)

The following architectural decisions are recorded here for traceability;
they are summarized in the project README and reflected in the code layout.

- **AD-1** Single Next.js App Router app, `src/` layout.
- **AD-2** Route groups `(public)` / `(auth)` / `(app)` / `(admin)` with
  per-group indexing rules and guards.
- **AD-3** Feature-first folder structure with layered internals
  (components / api / services / schemas / providers / types).
- **AD-4** Server-first, thin client. Pricing and authorization are
  server-only.
- **AD-5** Three Supabase clients: browser (anon, RLS), server
  (per-request, RLS), admin (service role, guarded, server-only).
- **AD-6** PostgreSQL + PostGIS via Supabase CLI migrations (versioned,
  reversible, with rollback).
- **AD-7** REST surface at `/api/v1` with the documented envelope.
- **AD-8** Zod as the single validation source (shared schemas, client
  and server).
- **AD-9** Provider abstractions for Payments (manual MVP provider) and
  AI (NoopProvider).
- **AD-10** Pricing engine is pure and server-only.
- **AD-11** Genesis 100 as first-class domain logic (counter, one-free-
  per-account, auto-disable at 100, Founder badge).
- **AD-12** Deferred engagement layer (D6).
- **AD-13** Mapbox isolated inside `features/map`.
- **AD-14** Design tokens as CSS variables in `globals.css`.
- **AD-15** shadcn/ui copy-in components under `components/ui`.
- **AD-16** Zod-validated `process.env` with server/client split.
- **AD-17** SEO baked in from Phase 1 (metadata, OG, canonical, robots,
  sitemap, slug rules).
- **AD-18** Quality gates: TS strict + `noUncheckedIndexedAccess`, ESLint
  flat, Prettier, CI, Dependabot.

## Consequences

- Phase 1 delivers a working, on-brand foundation with no business logic,
  ready for Phase 2 to add auth, the database, and storage.
- The payment and AI layers can evolve without touching the rest of the
  application, protecting the core experience as the startup validates.
- The engagement layer (D6) is consciously deferred; the core flow works
  without it because payment status is visible in the user's payment-
  history page.
