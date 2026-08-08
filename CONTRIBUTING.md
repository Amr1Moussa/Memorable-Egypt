# Contributing to Memorable Egypt

Thank you for contributing! This guide covers setup, standards, and the PR
process. Read `SYSTEM_OVERVIEW.md` first for the 30-minute project orientation.

## Development setup

### Prerequisites
- **Node.js 20+** (24 recommended)
- **pnpm** (enable via `corepack enable pnpm`)
- **Docker** (for local Supabase — optional but recommended)
- A **Supabase project** (free tier is fine) OR local Supabase via Docker
- A **Mapbox** account (free tier — get a public token)

### Quick start
```bash
git clone <repo-url> memorable-egypt
cd memorable-egypt
corepack pnpm install

# Configure environment
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#          SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_MAPBOX_TOKEN,
#          MAPBOX_SECRET_TOKEN

# Apply database migrations + seed data
corepack pnpm dlx supabase link --project-ref <your-ref>
corepack pnpm dlx supabase db reset

# Start the dev server
corepack pnpm dev
```

Open http://localhost:3000.

See `ENVIRONMENT_SETUP.md` for detailed setup instructions.

## Branch strategy (doc 25)

```
main      → Production code. Only merged from develop via PR.
develop   → Integration branch. All feature branches merge here.
feature/* → New features (e.g. feature/ai-story-enhancement)
fix/*     → Bug fixes (e.g. fix/payment-double-submit)
```

- **Never commit directly to `main` or `develop`.** Always open a PR.
- Branch from `develop`, name it `feature/<short-description>` or `fix/<issue>`.
- Keep branches short-lived; rebase onto `develop` before opening a PR.

## Coding standards

### TypeScript
- **Strict mode** (`noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`).
- **No `any`.** Use `unknown` + narrow, or define a proper type.
- Named exports preferred; default exports only for route handlers.
- Every feature owns its types — no cross-feature type imports except via `lib/types`.

### Architecture
- **Feature-first.** New features go in `src/features/<name>/` with the standard
  structure: `components/`, `hooks/`, `services/`, `schemas/`, `types.ts`, `index.ts`.
- **Server-first.** Server Components by default; `"use client"` only for
  interactivity (forms, map, uploads, state).
- **Thin client.** Business logic belongs in services (server-side). The client
  validates for UX, the server validates for security.
- **Zod everywhere.** Every input boundary (API route, form) validates with a
  shared Zod schema. Types are `z.infer`-ed — no duplicate DTOs.

### Styling
- **Tailwind CSS v4** with design tokens from `globals.css`. Never hardcode
  colors/spacing — use the token classes (`bg-sand`, `text-nile`, etc.).
- **shadcn/ui** for primitives. Add new components via `components/ui/`.
- **Lucide** is the only icon library.

### Comments
- Comment *why*, not *what*. The code says what; the comment says the reasoning.
- Every file has a top-of-file doc comment linking to the source documentation.
- JSDoc on exported functions that aren't self-explanatory.

## Commit message conventions

Follow **Conventional Commits**:

```
type(scope): brief description

Optional body explaining the why.

Optional footer.
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`.

**Examples:**
```
feat(memories): add draft auto-save
fix(payments): prevent duplicate payment records
refactor(admin): extract concurrency helper
docs(api): add OpenAPI spec
test(pricing): cover tier validation edge cases
```

## Pull request guidelines

### Before opening a PR
1. `pnpm verify` passes (typecheck + lint + build).
2. `pnpm test` passes (all unit tests green).
3. Rebase onto `develop`: `git rebase origin/develop`.
4. Squash WIP commits into clean, logical commits.

### PR description template
```
## What
Brief description of the change.

## Why
The motivation / problem solved.

## How
Key implementation decisions.

## Testing
- [ ] Unit tests added/updated
- [ ] Manual smoke-test performed
- [ ] Typecheck + lint + build pass

## Documentation
- [ ] Updated relevant docs if architecture changed
- [ ] CHANGELOG.md updated
```

### Review criteria
- Does it follow the feature-first structure?
- Are all inputs validated with Zod?
- Are all database writes behind authorization checks?
- Does it introduce any `any` types?
- Are there security implications (new endpoints, file uploads, auth changes)?
- Is the code readable? Would a new contributor understand it?

## Testing requirements

### Unit tests (required for all PRs)
- Pure business logic (pricing, state machines, validation, slug) must have
  unit tests in `*.test.ts` files co-located with the source.
- Run: `pnpm test`.

### Integration tests (for API changes)
- New API endpoints should have at least a happy-path + error-path test.
- These run against a live Supabase project in CI (future).

### Manual testing (before merge)
- Exercise the changed feature end-to-end in the browser.
- Test on mobile viewport (responsive).
- Verify error states render gracefully.

## Database changes
- Every schema change is a **new migration** in `supabase/migrations/`.
- Migrations are **idempotent** (`if not exists` / `on conflict do nothing`).
- Never edit an applied migration — always add a new one.
- Test with `supabase db reset` locally before pushing.

## Security checklist (for any PR touching auth/data/uploads)
- [ ] RLS policy added/updated if new table or column
- [ ] Authorization check in the service layer
- [ ] Input validated with Zod
- [ ] No secrets in client code
- [ ] File uploads validated (MIME + size)
- [ ] No SQL injection vectors (parameterized queries only)
