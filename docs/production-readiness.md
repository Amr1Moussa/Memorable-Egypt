# Production Readiness

> Memorable Egypt — production readiness assessment, checklists, and known
> limitations. Source: docs 25 (Deployment), 26 (Testing), 27 (Monitoring),
> 21 (Security), Phase 7 requirement #7.

## Architecture summary

Memorable Egypt is a **location-first geosocial platform** built on Next.js 16
(App Router) + Supabase (PostgreSQL + PostGIS + Auth + Storage) + Mapbox GL JS.
The map is the product; users preserve memories at real Egyptian locations
and discover others' stories geographically.

| Layer        | Technology                                            |
| ------------ | ----------------------------------------------------- |
| Frontend     | Next.js 16, React 19, TypeScript (strict), Tailwind v4|
| UI           | shadcn/ui (new-york), Lucide, Geist font              |
| Backend      | Supabase (PostgreSQL 17 + PostGIS, Auth, Storage, RLS)|
| Maps         | Mapbox GL JS + Mapbox Geocoding                       |
| State        | Zustand (UI), TanStack Query (server), RHF + Zod      |
| Payments     | Manual (InstaPay + QNB), provider-agnostic            |
| AI           | Abstraction only (NoopProvider) — no live calls       |
| Deploy/Ops   | Vercel, Sentry, Vercel Analytics, UptimeRobot         |

## Deployment checklist

### Pre-deploy
- [ ] All migrations applied to the production Supabase project (`supabase db push`)
- [ ] Storage buckets created (`avatars`, `memory-images`, `payment-receipts`)
- [ ] RLS policies verified (every table enabled + correct policies)
- [ ] Auth providers configured (Email/Password + Google OAuth in Supabase dashboard)
- [ ] Email templates branded (verification, password reset)
- [ ] Google OAuth client ID/secret set in Supabase + redirect URLs configured
- [ ] At least one user promoted to `admin` role
- [ ] All environment variables set in Vercel (run `scripts/check-env.ts`)
- [ ] `NEXT_PUBLIC_SITE_URL` points to the production domain (HTTPS)
- [ ] Mapbox token valid + domain restrictions configured
- [ ] Sentry DSN set (optional but recommended)
- [ ] DNS configured (apex + www redirect)
- [ ] HTTPS certificate active (Vercel handles automatically)

### Deploy
- [ ] `pnpm verify` passes (typecheck + lint + build)
- [ ] `pnpm test` passes (unit tests green)
- [ ] Deploy via Vercel (git push to main → auto-deploy, or manual)
- [ ] Verify the site loads at the production URL
- [ ] Verify `/explore` renders the map
- [ ] Verify `/login` + `/register` work
- [ ] Verify `/admin` redirects non-admins to `/forbidden`
- [ ] Verify `robots.txt` + `sitemap.xml` are accessible
- [ ] Verify security headers present (check with browser devtools)

### Post-deploy
- [ ] UptimeRobot monitor configured (HTTP check on the domain)
- [ ] Sentry verified (trigger a test error, confirm it appears)
- [ ] Vercel Analytics enabled
- [ ] First admin smoke-test: create memory → pay → upload receipt → approve → verify published
- [ ] Genesis campaign counter at 0/100

## Rollback checklist
1. Identify the issue (check Sentry + Vercel deployment logs).
2. In Vercel dashboard → select the previous deployment → "Promote to Production".
3. If database migration caused the issue:
   - Do NOT roll back the database (data loss risk).
   - Instead, push a fix-forward migration.
4. Verify the previous deployment serves traffic.
5. Document the incident.

## Monitoring stack (Phase 7 #5, doc 27)

| Concern          | Tool               | Setup                                  |
| ---------------- | ------------------ | -------------------------------------- |
| Uptime           | UptimeRobot (free) | HTTP check on the domain, 5-min interval |
| Error tracking   | Sentry (free tier) | `NEXT_PUBLIC_SENTRY_DSN` env var; auto-captures frontend + backend errors |
| Web analytics    | Vercel Analytics   | Enabled in Vercel dashboard (no code)  |
| Database health  | Supabase dashboard | Built-in metrics + logs                |
| Storage health   | Supabase dashboard | Usage + upload failure monitoring       |

Failures are observable without affecting UX: Sentry captures silently, the
error boundary shows a friendly message, and the app never crashes to a white
screen.

## Security checklist (Phase 7 #4, doc 21)

- [x] RLS enabled on every table (deny-by-default)
- [x] Service-role key never shipped to the browser
- [x] All API routes validate input (Zod)
- [x] All API routes rate-limited (in-memory, Redis-ready)
- [x] Auth checks on every protected route (middleware + service guards)
- [x] Admin role checked at 3 layers (middleware + layout + service)
- [x] Payment prices computed server-side only
- [x] Receipts stored privately (never public URLs)
- [x] File uploads validated (MIME + size + ownership)
- [x] Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS
- [x] Secrets in env only, validated at boot, never committed
- [x] User-generated content rendered safely (React auto-escapes; popup HTML escaped)
- [x] Optimistic concurrency prevents lost admin updates

### Remaining risks (documented)
- **Rate limiting is in-memory** — fine for a single Vercel instance; needs Upstash Redis for multi-instance. Low risk for MVP volume.
- **EXIF metadata** — not stripped from uploaded images (by design for the MVP per founder direction). Future server-side pipeline will handle this.
- **CSRF** — Supabase Auth uses SameSite cookies; explicit CSRF tokens not added. Supabase's JWT-based auth mitigates most CSRF vectors. Low risk.

## Performance checklist (Phase 7 #3, doc 26)

| Metric              | Target    | How                                        |
| ------------------- | --------- | ------------------------------------------ |
| Page load           | < 3s      | Server Components, code splitting, CDN     |
| Map interaction     | 60 FPS    | Clustering, viewport queries, lazy loading |
| Search              | < 1s      | Debounced, abortable, PostGIS-indexed       |
| Image loading       | Optimized | Next/Image, lazy loading, responsive sizes  |
| Lighthouse perf     | ≥ 90      | Minimal JS, no heavy dependencies          |
| Lighthouse a11y     | ≥ 95      | Semantic HTML, ARIA, keyboard nav           |

### Optimizations in place
- Server Components by default; client only for map/forms/uploads.
- Images: `next/image` with lazy loading + responsive `sizes`.
- Map: viewport-only loading (PostGIS RPC), native clustering, debounced queries.
- Database: GIST spatial index, FK indexes, partial unique indexes.
- Bundle: no heavy charting/AI libraries in the MVP.

## Testing summary (Phase 7 #2, doc 26)

### Unit tests (61 tests, 7 files)
- **Pricing engine** — reference formatting, tier validation.
- **Payment state machine** — all valid + invalid transitions, lock states.
- **Memory state machine** — publish paths, editability rules.
- **Slug generation** — lowercasing, collapsing, trimming, special chars.
- **Username normalization** — trim, lowercase, reserved names.
- **Rate limiter** — limits, remaining count, key isolation, window reset.
- **Error hierarchy** — status codes, codes, envelope, wrapping.

### Integration + E2E (deferred to live project)
Integration and E2E tests require a live Supabase project (auth flows, payment
flows, image uploads) and are verified manually against the staging/production
environment per the deployment checklist. The unit tests cover all pure
business logic that doesn't need external services.

## Known limitations

1. **Rate limiting is in-memory** — single-instance only.
2. **EXIF not stripped** — by design for MVP; future pipeline.
3. **No automated integration/E2E tests** — manual verification per checklist.
4. **Comments, reactions, bookmarks, notifications** — deferred per ADR D6.
5. **AI features** — abstraction only; no live Gemini calls (ADR D3).
6. **Payments** — manual verification only; no automated gateway (ADR D2).
7. **Dark mode** — architecture ready, not implemented (doc 11).
8. **Arabic localization** — English only for MVP (doc 20).

## Future improvements (not in scope)

See `docs/adr/0001-roadmap-decisions.md` for the full roadmap. Priority items
after launch validation:
- Upstash Redis for distributed rate limiting.
- Server-side image processing (Sharp / Supabase Image Transformations).
- Paymob/Fawray/Stripe payment gateway integration.
- AI story enhancement (Gemini).
- Engagement features (comments, reactions, bookmarks, notifications).
- Arabic localization + RTL support.
