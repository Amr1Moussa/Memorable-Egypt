# Memorable Egypt

> Every place has a story. Make yours part of Egypt's map.

Memorable Egypt is a location-first platform where users can purchase a virtual
location pin anywhere in Egypt and attach a personal memory, story, or
confession to that location. The first 100 approved pins are free
(**Genesis Campaign**).

This repository is the production MVP. The complete product, engineering, and
operations documentation lives in the sibling `MemorableEGYPT_Docs` folder and
is the single source of truth for every implementation decision.

## Tech stack

| Layer        | Technology                                        |
| ------------ | ------------------------------------------------- |
| Frontend     | Next.js (App Router), React, TypeScript, Tailwind |
| UI           | shadcn/ui (`new-york`), Lucide icons, Geist font  |
| Backend      | Supabase (PostgreSQL + PostGIS, Auth, Storage)    |
| Maps         | Mapbox GL JS + Mapbox Geocoding                   |
| State/Data   | Zustand, TanStack Query, React Hook Form, Zod     |
| Payments     | Manual (InstaPay + QNB) — provider-agnostic       |
| AI           | Abstraction only (no live calls in MVP)           |
| Deploy/Ops   | Vercel, Sentry, UptimeRobot, Vercel Analytics     |

## Getting started

```bash
# 1. Install dependencies (pnpm via corepack)
corepack pnpm install

# 2. Configure environment
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_MAPBOX_TOKEN, MAPBOX_SECRET_TOKEN

# 3. Run the dev server
corepack pnpm dev
```

## Scripts

| Script                  | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `pnpm dev`              | Start the dev server                     |
| `pnpm build`            | Production build                         |
| `pnpm start`            | Run the production build                 |
| `pnpm lint`             | ESLint (flat config, strict)             |
| `pnpm typecheck`        | `tsc --noEmit`                           |
| `pnpm format`           | Prettier write                           |
| `pnpm verify`           | typecheck + lint + build (CI parity)     |

## Architecture

Feature-first under `src/features/{auth,map,memory,...}`. Each feature owns its
components, hooks, services, schemas, and types. Cross-cutting infra lives in
`src/lib/`. See `docs/adr/` for the recorded decisions.

## Documentation

The authoritative documentation is in the sibling `MemorableEGYPT_Docs/` folder.
When conflicts arise, the **newer dedicated document** wins (ADR 0001).
