import { describe, it, expect } from "vitest";
import { canTransition, isEditable } from "./constants";
import type { PublicationStatus } from "@/lib/supabase/types";

/**
 * Memory publication state machine tests (doc 26).
 *
 * Source: doc 15 (Payments), doc 17 (Moderation), Phase 4 requirement #5,
 *         doc 26 (Testing — Payment Status Transitions).
 */
describe("memory publication state machine", () => {
  describe("canTransition", () => {
    it("allows draft → pending_moderation", () => {
      expect(canTransition("draft" as PublicationStatus, "pending_moderation")).toBe(true);
    });

    it("allows draft → awaiting_payment", () => {
      expect(canTransition("draft" as PublicationStatus, "awaiting_payment")).toBe(true);
    });

    it("allows pending_moderation → published", () => {
      expect(canTransition("pending_moderation" as PublicationStatus, "published")).toBe(true);
    });

    it("allows pending_moderation → rejected → draft", () => {
      expect(canTransition("pending_moderation" as PublicationStatus, "rejected")).toBe(true);
      expect(canTransition("rejected" as PublicationStatus, "draft")).toBe(true);
    });

    it("forbids draft → published (must go through moderation or payment)", () => {
      expect(canTransition("draft" as PublicationStatus, "published")).toBe(false);
    });

    it("forbids published → anything (terminal)", () => {
      expect(canTransition("published" as PublicationStatus, "draft")).toBe(false);
      expect(canTransition("published" as PublicationStatus, "rejected")).toBe(false);
    });

    it("forbids awaiting_payment → published (must complete payment)", () => {
      expect(canTransition("awaiting_payment" as PublicationStatus, "published")).toBe(false);
    });
  });

  describe("isEditable", () => {
    it("allows editing drafts and rejected memories", () => {
      expect(isEditable("draft" as PublicationStatus)).toBe(true);
      expect(isEditable("rejected" as PublicationStatus)).toBe(true);
    });

    it("forbids editing published, pending, or in-payment memories", () => {
      expect(isEditable("published" as PublicationStatus)).toBe(false);
      expect(isEditable("pending_moderation" as PublicationStatus)).toBe(false);
      expect(isEditable("awaiting_payment" as PublicationStatus)).toBe(false);
      expect(isEditable("receipt_uploaded" as PublicationStatus)).toBe(false);
      expect(isEditable("pending_verification" as PublicationStatus)).toBe(false);
    });
  });
});
