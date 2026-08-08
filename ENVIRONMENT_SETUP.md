# Environment Setup

> Complete guide to setting up Memorable Egypt for local development, testing,
> and production deployment.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ (24 recommended) | JavaScript runtime |
| pnpm | 11+ (via corepack) | Package manager |
| Docker | latest | Local Supabase (optional) |
| Git | latest | Version control |

## Required environment variables

All variables are documented in `.env.example`. Copy it to `.env.local` and
fill in the values.

### App
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Production URL (used for canonical URLs, OG, sitemap). Default: `http://localhost:3000` |

### Supabase
| Variable | Required | Scope | Description |
|----------|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public | Anon key (RLS-constrained) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Server-only** | Service role key (bypasses RLS — never ship to browser) |

### Mapbox
| Variable | Required | Scope | Description |
|----------|----------|-------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Public | Mapbox public token (map rendering + client geocoding) |
| `MAPBOX_SECRET_TOKEN` | Yes | **Server-only** | Mapbox secret token (server-side geocoding) |

### Monitoring (optional in dev)
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN (no-op if unset) |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | No | Performance sampling rate (default: 0) |

### AI (future, no-op in MVP)
| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Present for future use; not read by any MVP code |

## Supabase setup

### Option A: Cloud Supabase (recommended for beginners)

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Choose a name, set a strong database password, select a region close to
   your users (for Egypt, `eu-central-1` or `me-central-1`).
3. Wait for provisioning (~2 min).
4. Go to **Settings → API**:
   - Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Settings → Auth → Providers**:
   - Enable **Email** (email/password signups).
   - Enable **Google** (add your OAuth client ID + secret from Google Cloud Console).
6. Go to **Settings → Auth → URL Configuration**:
   - Set Site URL to `http://localhost:3000` for dev.
   - Add `http://localhost:3000/auth/callback` to Redirect URLs.

### Option B: Local Supabase (via Docker)

```bash
corepack pnpm dlx supabase start
# Outputs: API URL, anon key, service_role key — use these in .env.local
```

Local Supabase runs at `http://localhost:54321`. The keys are printed on
startup. Use the local Studio at `http://localhost:54323` to manage the DB.

## Mapbox setup

1. Go to [mapbox.com](https://account.mapbox.com) → sign up (free tier: 50k
   map loads/month).
2. Copy your **Default Public Token** → `NEXT_PUBLIC_MAPBOX_TOKEN`.
3. Create a **Secret Token** (with `Geocoding:Read` scope) → `MAPBOX_SECRET_TOKEN`.

## Running migrations

Migrations live in `supabase/migrations/` (14 files, numbered 0001–0014).

### Apply to a linked project
```bash
corepack pnpm dlx supabase link --project-ref <your-project-ref>
corepack pnpm dlx supabase db reset    # drops + recreates all tables + seed
# OR (non-destructive):
corepack pnpm dlx supabase db push     # applies new migrations only
```

### Verify
- Check `locations` table has 27 governorates + 14 landmarks.
- Check `categories` table has 10 rows.
- Check `settings` table has pricing + payment + genesis rows.

## Storage setup

The migrations (0012) create three buckets automatically:
- `avatars` (public)
- `memory-images` (public)
- `payment-receipts` (private)

Verify in Supabase Dashboard → Storage that all three exist with correct
visibility. RLS policies are in migration 0012.

## Local development

```bash
# 1. Install dependencies
corepack pnpm install

# 2. Configure env
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Apply migrations + seed
corepack pnpm dlx supabase db reset

# 4. Start dev server
corepack pnpm dev
```

Open http://localhost:3000. The first load takes a few seconds (font fetch +
map tile cache warm-up).

### Useful scripts
| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm verify` | typecheck + lint + build (CI parity) |
| `pnpm format` | Prettier write |

### Promoting yourself to admin
```sql
-- Run in Supabase SQL Editor
UPDATE profiles SET role = 'admin' WHERE id = '<your-auth-user-id>';
```

## Running tests

```bash
# All unit tests
pnpm test

# Watch mode
pnpm test:watch
```

Tests use placeholder env vars (via `vitest.setup.ts`) so they run without a
live Supabase project. Integration/E2E tests require a live project and are
verified manually per the deployment checklist.

## Production deployment

### Pre-deploy checklist
See `docs/production-readiness.md` for the full checklist. Key steps:

1. **Verify env:** `npx tsx scripts/check-env.ts`
2. **Verify build:** `pnpm verify`
3. **Verify tests:** `pnpm test`
4. **Apply migrations:** `supabase db push` to production project
5. **Configure Vercel:** add all env vars in the Vercel dashboard
6. **Set production URL:** `NEXT_PUBLIC_SITE_URL` → `https://yourdomain.com`
7. **DNS:** point your domain to Vercel (apex + www)
8. **UptimeRobot:** set up HTTP monitor
9. **Sentry:** set `NEXT_PUBLIC_SENTRY_DSN`

### Deploy
```bash
# Vercel auto-deploys on push to main, or:
vercel --prod
```

### Post-deploy smoke test
1. Visit the site — loads without errors.
2. `/explore` — map renders, markers appear.
3. `/login` — sign in works.
4. `/admin` — redirects non-admins to `/forbidden`.
5. `/robots.txt` + `/sitemap.xml` — accessible.
6. Check security headers in browser devtools (CSP, HSTS, etc.).
