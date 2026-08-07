import { resolveReportSchema, bulkResolveReportsSchema } from "@/features/admin/schemas";
import { resolveReport, bulkResolveReports } from "@/features/admin/services/moderation";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

/**
 * POST /api/v1/admin/reports/resolve
 * Resolve a single report or bulk-resolve (Phase 6 #3, #12).
 */
export async function POST(request: Request) {
  try {
    const json = (await request.json()) as unknown;

    // Single report resolution.
    const single = resolveReportSchema.safeParse(json);
    if (single.success) {
      await resolveReport(single.data.reportId, single.data.action);
      return ok({ done: true }, `Report ${single.data.action}d.`);
    }

    // Bulk resolution.
    const bulk = bulkResolveReportsSchema.safeParse(json);
    if (bulk.success) {
      const result = await bulkResolveReports(
        bulk.data.reportIds,
        bulk.data.action,
      );
      return ok(result, `${result.processed} reports resolved.`);
    }

    throw new ValidationError("Invalid request body.");
  } catch (error) {
    return handle(error);
  }
}
