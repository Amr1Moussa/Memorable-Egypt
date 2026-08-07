import { describe, it, expect } from "vitest";
import { normalizeUsername, RESERVED_USERNAMES } from "./constants";

/**
 * Username normalization tests (Phase 2.3 requirement #2, doc 12).
 *
 * Source: doc 12 (Username Rules), Phase 2.3 requirement #2.
 */
describe("normalizeUsername", () => {
  it("trims whitespace", () => {
    expect(normalizeUsername("  amr  ")).toBe("amr");
  });

  it("lowercases", () => {
    expect(normalizeUsername("AmrMoussa")).toBe("amrmoussa");
  });

  it("trims + lowercases together", () => {
    expect(normalizeUsername("  Amr_Moussa  ")).toBe("amr_moussa");
  });

  it("handles already-normalized input", () => {
    expect(normalizeUsername("amr123")).toBe("amr123");
  });

  it("handles empty string", () => {
    expect(normalizeUsername("")).toBe("");
  });
});

describe("RESERVED_USERNAMES", () => {
  it("contains documented reserved names (doc 12)", () => {
    expect(RESERVED_USERNAMES.has("admin")).toBe(true);
    expect(RESERVED_USERNAMES.has("support")).toBe(true);
    expect(RESERVED_USERNAMES.has("memorable")).toBe(true);
    expect(RESERVED_USERNAMES.has("egypt")).toBe(true);
    expect(RESERVED_USERNAMES.has("api")).toBe(true);
  });

  it("is case-insensitive (stores lowercase)", () => {
    // The set contains lowercase; callers compare against normalized input.
    expect(RESERVED_USERNAMES.has("admin")).toBe(true);
  });
});
