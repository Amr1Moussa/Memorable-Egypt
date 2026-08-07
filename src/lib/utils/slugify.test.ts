import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

/**
 * Slug generation tests (doc 26 — Slug Generation).
 *
 * Source: doc 20 (SEO — Slug Rules), doc 26 (Testing — Slug generation).
 */
describe("slugify", () => {
  it("lowercases the input", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("My First Sunset")).toBe("my-first-sunset");
  });

  it("collapses multiple spaces/hyphens/underscores into one hyphen", () => {
    expect(slugify("a   b___c--d")).toBe("a-b-c-d");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  --hello--  ")).toBe("hello");
  });

  it("strips special characters", () => {
    expect(slugify("Giza Pyramids! @#$")).toBe("giza-pyramids");
  });

  it("produces doc-20-compliant slugs for Egyptian landmarks", () => {
    expect(slugify("Bibliotheca Alexandrina")).toBe("bibliotheca-alexandrina");
    expect(slugify("Khan el-Khalili")).toBe("khan-el-khalili");
    expect(slugify("Giza Pyramids")).toBe("giza-pyramids");
  });

  it("handles numbers", () => {
    expect(slugify("Tier 4 Location")).toBe("tier-4-location");
  });

  it("returns empty string for input with no valid chars", () => {
    expect(slugify("@#$%")).toBe("");
  });
});
