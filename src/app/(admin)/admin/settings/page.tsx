import type { Metadata } from "next";
import { listSettings } from "@/features/admin/services/manage";
import { SettingEditor } from "./setting-editor";

export const metadata: Metadata = {
  title: "Admin — Settings",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const settings = await listSettings();

  // Group by category for display.
  const byCategory = new Map<string, typeof settings>();
  for (const s of settings) {
    const arr = byCategory.get(s.category) ?? [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="space-y-6">
        {Array.from(byCategory.entries()).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-nile">
              {category}
            </h2>
            <div className="space-y-2">
              {items.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.key}</p>
                    {s.description ? (
                      <p className="text-xs text-muted-foreground">
                        {s.description}
                      </p>
                    ) : null}
                  </div>
                  <SettingEditor
                    settingId={s.id}
                    value={s.value}
                    type={s.type}
                    updatedAt={s.updatedAt}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
