import { NextResponse } from "next/server";
import type { ApiSuccess } from "@/types/api";
import { type AppError, toAppError } from "@/lib/errors";

/**
 * Build the documented API response envelope (doc 08).
 *
 * `ok()` and `jsonError()` produce JSON; `throwIf()` / `handle()` are
 * the helpers route handlers compose. Business logic throws `AppError`
 * (or a subclass) — never returns HTTP status codes directly.
 *
 * Source: doc 08 (API Specification), doc 05 (Error Handling).
 */

/** 200 success envelope. */
export function ok<T>(data: T, message?: string): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });
}

/** 201 created envelope. */
export function created<T>(
  data: T,
  message?: string,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    { success: true, data, ...(message ? { message } : {}) },
    { status: 201 },
  );
}

/** 204 no content (e.g. successful DELETE). */
export function noContent(): NextResponse<null> {
  return new NextResponse(null, { status: 204 });
}

/**
 * Convert any thrown value into the documented error envelope with the
 * correct HTTP status. This is the single exit point for route-handler
 * try/catch blocks.
 */
export function handle(error: unknown): NextResponse {
  const appError = toAppError(error);
  return NextResponse.json(appError.toResponse(), { status: appError.status });
}

/**
 * Guards for route handlers. Throws `AppError` on failure so `handle()`
 * can translate it. Example:
 *   throwUnless(authed, new UnauthorizedError());
 */
export function throwUnless(
  condition: unknown,
  error: AppError,
): asserts condition {
  if (!condition) throw error;
}
