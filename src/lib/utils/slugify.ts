/**
 * Convert an arbitrary string to a doc-20-compliant slug.
 *
 * Rules (doc 20 — Slug Rules): lowercase, hyphen-separated, no special
 * characters. We strip diacritics first so Arabic-named locations can
 * still produce ASCII-friendly URL segments.
 *
 * Source: doc 20 (SEO).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // drop anything non [a-z0-9 space-]
    .replace(/[\s_-]+/g, "-") // collapse whitespace/underscores to one hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}
