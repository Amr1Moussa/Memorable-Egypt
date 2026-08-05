/**
 * API envelope & error code types.
 *
 * Source: doc 08 (API Specification). Every route handler returns this
 * envelope via `lib/response.ts`. Error codes are the documented set
 * mapped from the HTTP status table.
 */

/** Standard success envelope: `{ success, data, message }`. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

/** Standard error envelope: `{ success, error: { code, message } }`. */
export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    /** Optional field-level details for validation errors. */
    fieldErrors?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Paginated list response (doc 08 — Pagination). */
export interface Paginated<T> {
  page: number;
  limit: number;
  total: number;
  data: T[];
}

/**
 * Documented error codes (doc 08 — HTTP Status Codes).
 * Pair with `lib/errors.ts` to map each code → HTTP status.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
