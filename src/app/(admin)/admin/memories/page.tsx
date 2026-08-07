import type { Metadata } from "next";
import Link from "next/link";
import { listMemories } from "@/features/admin/services/moderation";
import { formatRelative } from "@/lib/utils/format";
import { MemoryActions } from "./memory-actions";

export const metadata: Metadata = {
  title: "Admin — Memories",
  robots: { index: false, follow: false },
};

export default async function AdminMemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "published";
  const { data: memories } = await listMemories(1, 50, status, sp.q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Memories</h1>
        <nav className="flex gap-1 text-sm">
          {["published", "pending", "hidden"].map((s) => (
            <Link
              key={s}
              href={`/admin/memories?status=${s}`}
              className={
                status === s
                  ? "rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground"
                  : "rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted"
              }
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </nav>
      </div>

      {memories.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          No memories in this category.
        </p>
      ) : (
        <div className="space-y-2">
          {memories.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={`/memories/${m.slug}`}
                    className="truncate font-medium hover:text-nile"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.title}
                  </a>
                  {m.reportCount > 0 ? (
                    <span className="rounded-full bg-error/15 px-1.5 py-0.5 text-xs text-error">
                      {m.reportCount} report{m.reportCount > 1 ? "s" : ""}
                    </span>
                  ) : null}
                  {m.isFeatured ? (
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-xs text-accent">
                      Featured
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {m.userName ?? "Unknown"} · {m.locationName ?? "—"} ·{" "}
                  {formatRelative(m.updatedAt)}
                </p>
              </div>
              <MemoryActions
                memoryId={m.id}
                updatedAt={m.updatedAt}
                status={m.status}
                isFeatured={m.isFeatured}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
