# Payment Architecture

> Memorable Egypt — pricing engine, Genesis campaign, and manual payment
> verification. Source of truth: docs 15 (Payments), 02 (Business Model),
> 22 (System Settings). Phase 5 requirement #8.

## Overview

The MVP uses **manual payment verification** (doc 15): the user pays via
InstaPay or QNB bank transfer, uploads a receipt, and an admin verifies it
before the memory publishes. The architecture is **provider-agnostic** —
Paymob/Fawry/Stripe slot in later by implementing the same service interface
without changing call sites (ADR D2).

## Pricing engine (Phase 5 #1)

`features/payments/pricing.ts` — `computePrice(tier, pinType, genesisEligible)`.

```
Price = Location Tier × Pin Type
```

- **Server-authoritative.** The client NEVER sends a price; it only displays
  the value returned by the engine via `/api/v1/payments/calculate`.
- **Settings-driven.** All eight price cells live in the `settings` table
  (category `pricing`, seeded in migration 0006). The documented defaults
  (docs 02, 15) are fallbacks only.
- **Frozen at purchase.** `createPayment` writes the computed `amount` into
  the `payments` row; a later admin price change never rewrites history.

| Tier | Standard | Legacy |
| ---- | -------- | ------ |
| 1    | 30 EGP   | 80 EGP |
| 2    | 50 EGP   | 130 EGP|
| 3    | 90 EGP   | 200 EGP|
| 4    | 180 EGP  | 400 EGP|

## Genesis Campaign (Phase 5 #2)

`features/payments/genesis.ts`.

Rules (doc 15 + Phase 5 #2):
- First **100 approved** memories receive a free Standard Pin.
- **One Genesis Pin per account** (`profiles.genesis_claimed`).
- Eligibility verified server-side before claiming.
- Campaign **auto-closes** at 100 (sets `genesis.enabled = false`).
- Existing Genesis memories remain valid permanently.

The counter lives in `settings` (`genesis.used_free_pins` /
`genesis.max_free_pins`) so admins observe + adjust it via the dashboard.
`claimGenesisPin` uses a compare-and-swap on `genesis_claimed` to prevent
double-claims under contention.

## Payment lifecycle (Phase 5 #3)

```
draft
  │
  ▼
awaiting_payment  ◄────── rejection (with reason)
  │
  ▼
receipt_uploaded
  │
  ▼
pending_verification
  │
  ├─ approved ──► published
  │
  └─ rejected ──► awaiting_payment (reason recorded)
```

State transitions are enforced server-side by `canTransitionPayment()` in
`features/payments/constants.ts`. The memory's `publication_status` mirrors
the payment status so the wizard and pages stay in sync.

**Free path (Genesis):** `draft → published` directly (the claim handles
eligibility + counter). The `pending_moderation` state is reserved for
Phase 6 admin content review.

**Paid path:** `draft → awaiting_payment` (payment created) → user uploads
receipt → `receipt_uploaded` → admin verifies → `approved → published`.

## Receipt lifecycle (Phase 5 #4)

Receipts flow through the existing storage abstraction (Phase 2.3):

1. User uploads via `/api/v1/payments/{id}/receipt` (multipart: file + method).
2. `uploadReceipt` validates MIME (PNG/JPG/PDF) + size (≤10MB from settings) +
   ownership, then stores to the **private** `payment-receipts` bucket at
   `payment-receipts/{paymentId}/{uuid}.{ext}`.
3. `attachReceipt` inserts a `payment_receipts` row and advances the payment
   to `receipt_uploaded`.
4. Receipts are **never public** — the bucket is `public=false`, RLS grants
   admin-only SELECT, and there is no public-URL helper for this bucket.

## Admin verification workflow (Phase 6 territory, reserved here)

The payment state machine already supports the admin transitions:
`pending_verification → approved | rejected`. Phase 6 builds the admin
dashboard UI that exercises them. On approval, the memory publishes
(`publication_status → published`, `published_at` set). On rejection, the
reason is recorded and the payment returns to `awaiting_payment`.

## Security considerations (Phase 5 #7)

| Concern                       | Mitigation                                             |
| ----------------------------- | ------------------------------------------------------ |
| Client-calculated prices      | Pricing engine is server-only; client never sends amount |
| Private receipts exposed      | Private bucket + admin-only RLS; no public URL helper  |
| Duplicate payment submissions | State machine + active-payment check in `createPayment` |
| Modifying approved records    | `isLocked()` blocks edits on pending_verification/approved/published |
| Invalid state transitions     | `canTransitionPayment()` enforces all documented paths |
| Ownership bypass              | Every service verifies `user_id` before any mutation   |

## Module map

```
features/payments/
├── pricing.ts           # computePrice (tier × pinType from settings)
├── genesis.ts           # eligibility, claim, counter, auto-close
├── service.ts           # createPayment, attachReceipt, getPayment, history
├── constants.ts         # state machine (PAYMENT_TRANSITIONS, isLocked)
├── schemas.ts           # Zod (checkout, receipt, calculate, history)
├── types.ts             # PaymentView, PaymentMethods
└── components/
    ├── status-badge.tsx     # status chip
    └── receipt-uploader.tsx # private receipt upload
```

API: `/api/v1/payments/calculate`, `/checkout`, `/[id]`, `/[id]/receipt`,
`/history`. Pages: `/payments` (history), `/payments/[id]` (detail + upload).
