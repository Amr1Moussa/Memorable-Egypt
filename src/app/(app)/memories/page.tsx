import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/authorization";
import { listMyMemories } from "@/features/memories/services";
import { MemoryCard } from "@/features/memories/components/memory-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ROUTES } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: "My memories",
  robots: { index: false, follow: false },
};

/**
 * The author's memory list (Phase 4 #3): drafts + published, newest first.
 * Not indexed (doc 20).
 */
export default async function MyMemoriesPage() {
  const { profile } = await requireUser();
  const { data: memories } = await listMyMemories();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My memories</h1>
          <p className="text-sm text-muted-foreground">
            {profile.username
              ? `@${profile.username}`
              : "Drafts and published memories."}
          </p>
        </div>
        <Link
          href={ROUTES.create}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New memory
        </Link>
      </header>

      {memories.length === 0 ? (
        <EmptyState
          title="No memories yet"
          description="Every place has a story. Preserve your first memory on Egypt's map."
          action={
            <Link
              href={ROUTES.create}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Create a memory
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} />
          ))}
        </div>
      )}
    </main>
  );
}
