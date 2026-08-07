import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitedError,
  BusinessRuleError,
  toAppError,
} from "./errors";
import { ERROR_CODES } from "@/types/api";

/**
 * Error hierarchy + HTTP status mapping tests (doc 26, doc 08).
 *
 * Source: doc 08 (HTTP Status Codes), doc 05 (Error Handling).
 */
describe("error hierarchy", () => {
  describe("status code mapping", () => {
    it("ValidationError → 422", () => {
      expect(new ValidationError("test").status).toBe(422);
    });
    it("UnauthorizedError → 401", () => {
      expect(new UnauthorizedError().status).toBe(401);
    });
    it("ForbiddenError → 403", () => {
      expect(new ForbiddenError().status).toBe(403);
    });
    it("NotFoundError → 404", () => {
      expect(new NotFoundError().status).toBe(404);
    });
    it("ConflictError → 409", () => {
      expect(new ConflictError("test").status).toBe(409);
    });
    it("RateLimitedError → 429", () => {
      expect(new RateLimitedError().status).toBe(429);
    });
    it("BusinessRuleError → 422", () => {
      expect(new BusinessRuleError("test").status).toBe(422);
    });
  });

  describe("error codes", () => {
    it("ValidationError has VALIDATION_ERROR code", () => {
      expect(new ValidationError("test").code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });
    it("ConflictError has CONFLICT code", () => {
      expect(new ConflictError("test").code).toBe(ERROR_CODES.CONFLICT);
    });
  });

  describe("toAppError", () => {
    it("passes through AppError instances", () => {
      const original = new NotFoundError();
      expect(toAppError(original)).toBe(original);
    });

    it("wraps generic Errors", () => {
      const wrapped = toAppError(new Error("boom"));
      expect(wrapped).toBeInstanceOf(AppError);
      expect(wrapped.message).toBe("boom");
    });

    it("wraps non-Error values", () => {
      const wrapped = toAppError("oops");
      expect(wrapped).toBeInstanceOf(AppError);
      expect(wrapped.message).toBe("An unexpected error occurred.");
    });
  });

  describe("toResponse (envelope)", () => {
    it("produces the doc-08 error envelope", () => {
      const err = new ValidationError("Title is required.", {
        title: ["required"],
      });
      const response = err.toResponse();
      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(response.error.message).toBe("Title is required.");
      expect(response.error.fieldErrors?.title).toEqual(["required"]);
    });
  });
});
