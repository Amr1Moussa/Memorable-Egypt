import { createClient } from "@/lib/supabase/server";
import { ok, handle } from "@/lib/response";

/**
 * GET /api/v1/categories
 * Public list of memory categories (doc 10.7). Used by the memory wizard.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, icon")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return ok({ categories: data ?? [] });
  } catch (error) {
    return handle(error);
  }
}
