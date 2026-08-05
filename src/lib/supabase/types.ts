/**
 * Supabase generated database types.
 *
 * Phase 1 ships an empty placeholder so imports resolve before the
 * database schema exists. In Phase 2, after the first migration, this
 * file is regenerated with:
 *
 *   pnpm supabase gen types typescript \
 *     --project-id <id> > src/lib/supabase/types.ts
 *
 * and committed. After that, all Supabase queries are fully typed.
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
