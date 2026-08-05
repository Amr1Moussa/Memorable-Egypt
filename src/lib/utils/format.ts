import { CURRENCY } from "@/types/domain";

/**
 * Display formatters. Pure functions — no side effects, no I/O.
 * Kept here so all UI surfaces format prices/dates/strings identically.
 */

/** Format an integer-EGP amount as "200 EGP" (doc 15 invoice format). */
export function formatEGP(amount: number): string {
  return `${new Intl.NumberFormat("en-US").format(Math.round(amount))} ${CURRENCY.egp}`;
}

/**
 * Relative time like "3 days ago". Falls back to an absolute date for
 * anything older than ~1 month so memories read cleanly long-term.
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const seconds = Math.round(diffMs / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return rtf.format(-seconds, "second");
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  if (Math.abs(days) < 30) return rtf.format(-days, "day");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Truncate to `max` chars with an ellipsis. Used in card previews. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Initials for avatar fallbacks. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
