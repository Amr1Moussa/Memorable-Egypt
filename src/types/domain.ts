/**
 * Global domain enums.
 *
 * These mirror the business rules in the documentation. The canonical
 * values are the lowercase strings used by the API (doc 08) and stored
 * in the database (doc 07). `as const` arrays are co-located with each
 * enum so validation schemas and UI selects can reuse them.
 *
 * Source: docs 06 (Domain Model), 07 (Database Design), 15 (Payments).
 */

/** Where a memory is visible. See doc 07 — `memories.visibility`. */
export const VISIBILITY = {
  public: "public",
  private: "private",
  unlisted: "unlisted",
} as const;
export type Visibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];

/** Memory pin tier. Standard vs premium (doc 13, 15). */
export const PIN_TYPE = {
  standard: "standard",
  legacy: "legacy",
} as const;
export type PinType = (typeof PIN_TYPE)[keyof typeof PIN_TYPE];

/**
 * Location pricing tier 1–4 (doc 13). SmallInt in Postgres (doc 07).
 * Tier drives the price for both Standard and Legacy pins.
 */
export const LOCATION_TIER = {
  tier1: 1, // Local      (neighborhoods, villages)
  tier2: 2, // City       (universities, parks, cafés)
  tier3: 3, // Landmark   (Bibliotheca Alexandrina, Khan El Khalili)
  tier4: 4, // Iconic     (Giza Pyramids, Luxor Temple)
} as const;
export type LocationTier = 1 | 2 | 3 | 4;

/**
 * Payment lifecycle (doc 15). A paid memory moves:
 *   draft → awaiting_payment → receipt_uploaded → pending_verification
 *        → approved → published
 * On rejection it can be sent back to re-upload a new receipt.
 */
export const PAYMENT_STATUS = {
  draft: "draft",
  awaiting_payment: "awaiting_payment",
  receipt_uploaded: "receipt_uploaded",
  pending_verification: "pending_verification",
  approved: "approved",
  rejected: "rejected",
  published: "published",
  failed: "failed",
} as const;
export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/** Manual payment methods for the MVP (doc 15). */
export const PAYMENT_METHOD = {
  instapay: "instapay",
  bank_transfer: "bank_transfer",
} as const;
export type PaymentMethod =
  (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

/** User roles (docs 06, 12, 21). */
export const ROLE = {
  user: "user",
  admin: "admin",
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

/** Moderation/content lifecycle (doc 17). */
export const CONTENT_STATUS = {
  active: "active",
  hidden: "hidden",
  deleted: "deleted",
} as const;
export type ContentStatus =
  (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS];

/** Report reasons available to users (doc 17). */
export const REPORT_REASON = {
  spam: "spam",
  harassment: "harassment",
  hate_speech: "hate_speech",
  violence: "violence",
  adult_content: "adult_content",
  misinformation: "misinformation",
  copyright: "copyright",
  fake_location: "fake_location",
  other: "other",
} as const;
export type ReportReason = (typeof REPORT_REASON)[keyof typeof REPORT_REASON];

/** Egyptian Pound. Amounts are stored as integer piasters/halala? — doc 07
 * uses INTEGER for `payments.amount`. We store whole EGP (the pricing tables
 * are whole EGP), so amounts are integer EGP. This keeps money calculations
 * exact with no floating point. */
export const CURRENCY = {
  egp: "EGP",
} as const;
export type Currency = (typeof CURRENCY)[keyof typeof CURRENCY];
