import { z } from "zod";

/**
 * Shared Zod primitives reused across feature schemas.
 *
 * Centralizing these keeps validation rules consistent (e.g. a memory's
 * title has the same length cap everywhere it appears) and avoids the
 * duplicate-logic anti-pattern called out in doc 05.
 *
 * Source: doc 05 (Engineering Principles), doc 08 (API Specification),
 *         doc 09 (Forms/Validation).
 */

/** Standard pagination query (doc 08). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/** Sort + order query (doc 08). */
export const sortSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/** A UUIDv4. Used as the primary key for every entity (doc 07). */
export const uuidSchema = z.string().uuid();

/**
 * Coordinates. Latitude ∈ [-90, 90], longitude ∈ [-180, 180].
 * Stored as both raw columns and a PostGIS geography point (doc 07).
 */
export const latitudeSchema = z.number().min(-90).max(90);
export const longitudeSchema = z.number().min(-180).max(180);

/**
 * Slug rules (doc 20 — SEO): lowercase, hyphens, no special chars.
 * Used for `/locations/{slug}` and `/memories/{slug}`.
 */
export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase, hyphen-separated",
  );

/**
 * Username rules (doc 12 + Phase 2.3 #2): 3–30 chars, lowercase letters /
 * numbers / underscores only. Input is normalized (trim + lowercase) by
 * `normalizeUsername()` before this check, so the regex enforces the stored
 * form. Reserved names are rejected in `features/profile`.
 */
export const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(
    /^[a-z0-9_]+$/,
    "Username may only contain lowercase letters, numbers, and underscores",
  );

/** Story title (doc 01 — Memory Creation). */
export const titleSchema = z
  .string()
  .trim()
  .min(3, "Title must be at least 3 characters")
  .max(120, "Title must be 120 characters or fewer");

/** Story body. Long enough for a meaningful memory, capped to bound storage. */
export const storySchema = z
  .string()
  .trim()
  .min(20, "Story must be at least 20 characters")
  .max(10_000, "Story must be 10,000 characters or fewer");
