import { createAdminClient } from "@/lib/supabase/admin";
import { ConflictError } from "@/lib/errors";

/**
 * Optimistic concurrency helper for admin actions (Phase 6 #11).
 *
 * Every critical admin mutation (payment approval, moderation, location
 * updates, settings) carries an `expectedUpdatedAt` timestamp from when the
 * admin loaded the data. If another admin modified the row since, the update
 * matches zero rows → we detect the conflict and return a clear message.
 *
 * This prevents silently overwriting newer data (Phase 6 #11).
 *
 * Source: Phase 6 requirement #11, doc 21 (Security).
 */

export interface ConcurrencyCheck {
  table: string;
  id: string;
  /** The `updated_at` the admin saw when loading the page. */
  expectedUpdatedAt: string;
}

/**
 * Assert that a row's `updated_at` still matches what the caller expects.
 * Throws ConflictError (→ 409) if another admin modified it since.
 */
export async function assertUnchanged(check: ConcurrencyCheck): Promise<void> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from(check.table)
    .select("id", { count: "exact", head: true })
    .eq("id", check.id)
    .eq("updated_at", check.expectedUpdatedAt);

  if (error) throw error;
  if (count === 0) {
    throw new ConflictError(
      "This item was modified by another administrator. Please refresh the page and try again.",
    );
  }
}

/**
 * Execute an optimistic-concurrency update: check the version, then update.
 * Returns the new `updated_at` for the response.
 */
export async function concurrencyUpdate(
  table: string,
  id: string,
  expectedUpdatedAt: string,
  patch: Record<string, unknown>,
): Promise<{ updatedAt: string }> {
  await assertUnchanged({ table, id, expectedUpdatedAt });

  const admin = createAdminClient();
  const updatePayload = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  // The admin client's typed .update() rejects loose records; cast to the
  // expected shape per-table. This is safe — we control all callers.
  const { data, error } = await admin
    .from(table)
    .update(updatePayload as never)
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at")
    .single();

  if (error) throw error;
  if (!data) {
    // Rare race: changed between the assert and the update.
    throw new ConflictError(
      "This item was modified by another administrator. Please refresh the page and try again.",
    );
  }

  return { updatedAt: (data as { updated_at: string }).updated_at };
}

/**
 * Batch concurrency check for bulk operations (Phase 6 #12).
 * Verifies every item's version before the batch proceeds; if ANY item
 * changed, the whole batch is rejected (atomic intent).
 */
export async function assertBatchUnchanged(
  checks: ConcurrencyCheck[],
): Promise<void> {
  // Group by table to minimize round-trips.
  const byTable = new Map<string, { id: string; expectedUpdatedAt: string }[]>();
  for (const c of checks) {
    const arr = byTable.get(c.table) ?? [];
    arr.push({ id: c.id, expectedUpdatedAt: c.expectedUpdatedAt });
    byTable.set(c.table, arr);
  }

  const admin = createAdminClient();
  for (const [table, items] of byTable) {
    for (const item of items) {
      const { count, error } = await admin
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("id", item.id)
        .eq("updated_at", item.expectedUpdatedAt);
      if (error) throw error;
      if (count === 0) {
        throw new ConflictError(
          `An item in this batch was modified by another administrator. Please refresh and try again.`,
        );
      }
    }
  }
}
