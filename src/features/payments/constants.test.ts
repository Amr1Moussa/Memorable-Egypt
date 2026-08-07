import { describe, it, expect } from "vitest";
import { canTransitionPayment, isLocked } from "./constants";

/**
 * Payment state machine tests (doc 26 — Payment Tests).
 *
 * Source: doc 15 (Payment Status), doc 26 (Testing — Payment Status Changes),
 *         Phase 5 requirement #3.
 */
describe("payment state machine", () => {
  describe("canTransitionPayment", () => {
    it("allows draft → awaiting_payment", () => {
      expect(canTransitionPayment("draft", "awaiting_payment")).toBe(true);
    });

    it("allows awaiting_payment → receipt_uploaded", () => {
      expect(canTransitionPayment("awaiting_payment", "receipt_uploaded")).toBe(true);
    });

    it("allows awaiting_payment → draft (cancel)", () => {
      expect(canTransitionPayment("awaiting_payment", "draft")).toBe(true);
    });

    it("allows receipt_uploaded → pending_verification", () => {
      expect(canTransitionPayment("receipt_uploaded", "pending_verification")).toBe(true);
    });

    it("allows pending_verification → approved", () => {
      expect(canTransitionPayment("pending_verification", "approved")).toBe(true);
    });

    it("allows pending_verification → rejected", () => {
      expect(canTransitionPayment("pending_verification", "rejected")).toBe(true);
    });

    it("allows approved → published", () => {
      expect(canTransitionPayment("approved", "published")).toBe(true);
    });

    it("allows rejected → awaiting_payment", () => {
      expect(canTransitionPayment("rejected", "awaiting_payment")).toBe(true);
    });

    it("forbids draft → published (must go through payment)", () => {
      expect(canTransitionPayment("draft", "published")).toBe(false);
    });

    it("forbids published → anything (terminal)", () => {
      expect(canTransitionPayment("published", "draft")).toBe(false);
      expect(canTransitionPayment("published", "rejected")).toBe(false);
      expect(canTransitionPayment("published", "approved")).toBe(false);
    });

    it("forbids awaiting_payment → approved (must upload receipt first)", () => {
      expect(canTransitionPayment("awaiting_payment", "approved")).toBe(false);
    });

    it("forbids skipping verification", () => {
      expect(canTransitionPayment("receipt_uploaded", "approved")).toBe(false);
      expect(canTransitionPayment("receipt_uploaded", "published")).toBe(false);
    });
  });

  describe("isLocked", () => {
    it("locks pending_verification, approved, published", () => {
      expect(isLocked("pending_verification")).toBe(true);
      expect(isLocked("approved")).toBe(true);
      expect(isLocked("published")).toBe(true);
    });

    it("does NOT lock draft, awaiting_payment, receipt_uploaded, rejected, failed", () => {
      expect(isLocked("draft")).toBe(false);
      expect(isLocked("awaiting_payment")).toBe(false);
      expect(isLocked("receipt_uploaded")).toBe(false);
      expect(isLocked("rejected")).toBe(false);
      expect(isLocked("failed")).toBe(false);
    });
  });
});
