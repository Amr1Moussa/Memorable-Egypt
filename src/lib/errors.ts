import { ERROR_CODES, type ErrorCode } from "@/types/api";

/**
 * App error model.
 *
 * Route handlers throw `AppError` (or its subclasses) and `lib/response.ts`
 * converts it into the documented API error envelope (doc 08). Keeping a
 * single error class hierarchy means business logic never builds HTTP
 * responses by hand.
 *
 * Source: doc 05 (Error Handling), doc 08 (API Specification).
 */

const STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  [ERROR_CODES.VALIDATION_ERROR]: 422,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.PAYMENT_REQUIRED]: 402,
  [ERROR_CODES.BUSINESS_RULE_VIOLATION]: 422,
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 502,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};

export interface AppErrorOptions {
  code?: ErrorCode;
  /** Optional field-level details for validation errors (doc 08). */
  fieldErrors?: Record<string, string[]>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code ?? ERROR_CODES.INTERNAL_ERROR;
    this.status = STATUS_BY_CODE[this.code] ?? 500;
    this.fieldErrors = options.fieldErrors;
  }

  /** Convert to the API error envelope payload (doc 08). */
  toResponse() {
    return {
      success: false as const,
      error: {
        code: this.code,
        message: this.message,
        ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
      },
    };
  }
}

/* ---- Typed subclasses for the most common cases ----
 * These keep call sites short and intention explicit. */

export class ValidationError extends AppError {
  constructor(
    message: string,
    fieldErrors?: Record<string, string[]>,
    cause?: unknown,
  ) {
    super(message, { code: ERROR_CODES.VALIDATION_ERROR, fieldErrors, cause });
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in to do that.") {
    super(message, { code: ERROR_CODES.UNAUTHORIZED });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super(message, { code: ERROR_CODES.FORBIDDEN });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We couldn't find that.") {
    super(message, { code: ERROR_CODES.NOT_FOUND });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, { code: ERROR_CODES.CONFLICT });
    this.name = "ConflictError";
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many requests. Please slow down.") {
    super(message, { code: ERROR_CODES.RATE_LIMITED });
    this.name = "RateLimitedError";
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, { code: ERROR_CODES.BUSINESS_RULE_VIOLATION });
    this.name = "BusinessRuleError";
  }
}

/**
 * Wrap unknown thrown values into an AppError. Use in route handlers and
 * service boundaries so a stray `throw "oops"` never escapes as a 500
 * with a leaked stack.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(error.message, { cause: error });
  }
  return new AppError("An unexpected error occurred.", { cause: error });
}
