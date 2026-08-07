# Admin Architecture

> Memorable Egypt — admin dashboard, moderation, payment verification, and
> platform management. Source of truth: docs 18 (Admin Dashboard), 17
> (Moderation), 19 (Analytics), 22 (System Settings). Phase 6 requirement #9.

## Overview

The admin dashboard gives platform operators complete control: payment
verification, content moderation, user/location management, settings, and
analytics — with **optimistic concurrency** on every critical action (Phase 6
#11), **audit logging** on every mutation, and **bulk operations** where
practical (Phase 6 #12). The **activity feed** reuses the existing audit log
(Phase 6 #13) rather than introducing a separate system.

## Permission model (Phase 6 #8)

Three layers of defense:
1. **Middleware** (`src/middleware.ts`) — checks session + `profiles.role ===
   "admin"` on `/admin/*`; redirects non-admins to `/forbidden`.
2. **Layout guard** (`app/(admin)/layout.tsx`) — calls `requireAdmin()` on
   every admin page render.
3. **Service guards** — every admin service calls `requireAdmin()` or
   `requireUser()` before any mutation.

This prevents **IDOR** (direct object reference): no admin action proceeds
without the role check, regardless of how the endpoint is reached.

## Dashboard architecture (Phase 6 #1, #13)

The dashboard loads two things in parallel:
- **Metrics** (`getDashboardMetrics`) — counts + revenue aggregations run as
  parallel `head: true` queries for speed. Revenue counts only
  approved+published payments (doc 19).
- **Activity feed** (`getActivityFeed`) — reads from the existing `audit_log`
  filtered to admin-relevant actions, with actor names resolved in one batch
  query. No separate activity table.

## Optimistic concurrency (Phase 6 #11)

Every critical admin mutation carries an `expectedUpdatedAt` (the row's
`updated_at` when the admin loaded the page). The flow:

```
Admin loads page → sees row with updated_at = T1
                          │
Admin submits action → sends expectedUpdatedAt = T1
                          │
                          ▼
concurrencyUpdate(table, id, T1, patch)
                          │
                    ┌─────┴──────┐
                    ▼            ▼
          .eq("updated_at", T1)  count === 0?
                    │                   │
              row updated              ConflictError
              (T2 = now)          "modified by another admin"
```

If another admin modified the row since T1, the update matches zero rows →
`ConflictError` (→ HTTP 409) with a clear refresh-and-retry message. **Never
silently overwrites newer data.**

Bulk operations use `assertBatchUnchanged` — if ANY item changed, the whole
batch is rejected (atomic intent).

## Bulk operations (Phase 6 #12)

Designed for extension without restructuring:
- `bulkModerateMemories(items, action)` — hide/restore/delete multiple
  memories with per-item version checks.
- `bulkResolveReports(reportIds, action)` — resolve multiple reports.

The pattern is identical for future bulk actions: validate all versions, then
apply, then audit each. Adding a new bulk operation is a new service function +
route — no architectural change.

## Payment approval workflow (Phase 6 #2)

```
Payment in queue (receipt_uploaded / pending_verification)
        │
        ▼
Admin reviews receipt (signed URL, 5-min expiry)
        │
        ├── Approve ──► concurrencyUpdate(payments → approved)
        │                   │
        │                   ├── memory.published_at = now
        │                   ├── payment → published
        │                   └── audit: payment.approved
        │
        └── Reject (reason required) ──► concurrencyUpdate(payments → rejected)
                                            │
                                            ├── memory → awaiting_payment
                                            ├── payment → awaiting_payment
                                            └── audit: payment.rejected
```

Approval **completes the full transition**: payment → approved, memory →
published, payment → published (terminal). All three steps + the audit event
happen in the same request.

## Moderation workflow (Phase 6 #3)

```
Memory (active/hidden)        Report (pending)
    │                              │
    ├── Hide ──► status=hidden     ├── Approve ──► status=approved
    ├── Restore ──► status=active  │             (admin takes action separately)
    ├── Delete ──► deleted_at=now  │
    ├── Feature ──► is_featured    └── Reject ──► status=rejected
    └── Bulk hide/restore/delete                  (no action; report dismissed)
```

Every action requires a **confirmation dialog** (UI) and logs an **audit
event**. Bulk moderation checks every item's version before proceeding.

## Settings architecture (Phase 6 #6)

The settings page lists all rows grouped by category. Each setting has an
inline editor (toggle for booleans, text for others) with optimistic
concurrency. **Sensitive categories** (`payments` bank details) are editable
through the admin UI but masked in the public settings API — they never reach
the browser cache (Phase 2.2 requirement #2). Server-only secrets (not in the
`settings` table) are never editable here.

## Admin modules

```
features/admin/
├── concurrency.ts             # assertUnchanged, concurrencyUpdate, assertBatchUnchanged
├── schemas.ts                 # Zod (approve, reject, moderate, bulk, reports, locations, settings)
├── types.ts                   # DashboardMetrics, ActivityEntry, Admin*Row types
├── services/
│   ├── dashboard.ts           # getDashboardMetrics, getActivityFeed (from audit_log)
│   ├── payments.ts            # getPaymentQueue, approvePayment, rejectPayment, getReceiptSignedUrl
│   ├── moderation.ts          # listMemories, moderateMemory, bulkModerateMemories, listReports, resolveReport
│   └── manage.ts              # listUsers, listLocations, updateLocation, listSettings, updateSetting, getAnalytics
└── components/
    └── activity-feed.tsx      # reuse of audit_log entries

app/(admin)/admin/
├── page.tsx                   # Dashboard (metrics + activity)
├── payments/page.tsx          # Payment queue + actions
├── memories/page.tsx          # Memory moderation list
├── reports/page.tsx           # Reports queue
├── users/page.tsx             # User search + table
├── locations/page.tsx         # Location management
├── settings/page.tsx          # Settings editors
└── analytics/page.tsx         # Analytics dashboards
```

## Audit flow

Every admin action calls `logAuditEvent` with:
- `actorId` — the admin's user id
- `action` — a canonical `AUDIT_ACTIONS` constant
- `entityType` + `entityId` — what was modified
- `requestId` — auto-generated (correlates multi-step actions)
- `metadata` — structured context (never secrets)

The dashboard's activity feed reads these same rows back — **the same audit
log that satisfies compliance also powers the operational dashboard** (Phase 6
#13).

## Security checklist (Phase 6 #8)

- [x] Admin-only access (middleware + layout + service guards)
- [x] Server-side authorization on every action
- [x] IDOR prevention (role check before every mutation)
- [x] Audit logging on every administrative action
- [x] Optimistic concurrency prevents lost updates
- [x] Receipts served via signed URLs (never public)
- [x] Sensitive settings masked in public APIs
