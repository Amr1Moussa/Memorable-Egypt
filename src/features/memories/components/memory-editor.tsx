"use client";

import { useMemo } from "react";
import { titleSchema, storySchema } from "@/lib/validations/common";
import { cn } from "@/lib/utils/cn";
import {
  TITLE_MIN,
  TITLE_MAX,
  STORY_MIN,
  STORY_MAX,
} from "../constants";

/**
 * The distraction-free memory editor (Phase 4 #1).
 *
 * A controlled component — the wizard owns the state and passes it down. This
 * surface renders: title, story, category select, visibility, and live
 * character counters + validation hints. Auto-save is handled by the wizard
 * via `useAutoSave`, not here.
 *
 * Source: doc 10 (Create Memory Flow), Phase 4 requirement #1.
 */

export interface MemoryEditorData {
  title: string;
  story: string;
  categoryId: string | null;
  visibility: "public" | "private" | "unlisted";
}

export function MemoryEditor({
  data,
  categories,
  onChange,
}: {
  data: MemoryEditorData;
  categories: { id: string; name: string }[];
  onChange: (patch: Partial<MemoryEditorData>) => void;
}) {
  const titleValid = useMemo(
    () => titleSchema.safeParse(data.title).success,
    [data.title],
  );
  const storyValid = useMemo(
    () => storySchema.safeParse(data.story).success,
    [data.story],
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Give your memory a title…"
          maxLength={TITLE_MAX + 20}
          className="w-full border-0 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-faint-foreground sm:text-3xl"
          aria-label="Memory title"
        />
        <CharCounter
          value={data.title.length}
          min={TITLE_MIN}
          max={TITLE_MAX}
          valid={titleValid}
        />
      </div>

      {/* Story */}
      <div className="space-y-1.5">
        <textarea
          value={data.story}
          onChange={(e) => onChange({ story: e.target.value })}
          placeholder="Tell your story. What happened here? Why does this place matter to you?"
          className="min-h-[40vh] w-full resize-y border-0 bg-transparent text-base leading-relaxed outline-none placeholder:text-faint-foreground"
          aria-label="Memory story"
        />
        <CharCounter
          value={data.story.length}
          min={STORY_MIN}
          max={STORY_MAX}
          valid={storyValid}
        />
      </div>

      {/* Category + visibility row */}
      <div className="flex flex-wrap gap-4 border-t border-border pt-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Category</span>
          <select
            value={data.categoryId ?? ""}
            onChange={(e) =>
              onChange({ categoryId: e.target.value || null })
            }
            className="h-9 rounded-md border border-input bg-surface px-2 text-sm"
          >
            <option value="">Choose a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Visibility</span>
          <select
            value={data.visibility}
            onChange={(e) =>
              onChange({
                visibility: e.target.value as "public" | "private" | "unlisted",
              })
            }
            className="h-9 rounded-md border border-input bg-surface px-2 text-sm"
          >
            <option value="public">Public — anyone can find this</option>
            <option value="unlisted">Unlisted — only with the link</option>
            <option value="private">Private — only me</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function CharCounter({
  value,
  min,
  max,
  valid,
}: {
  value: number;
  min: number;
  max: number;
  valid: boolean;
}) {
  const over = value > max;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={cn(valid ? "text-muted-foreground" : "text-warning")}>
        {value < min
          ? `${min - value} more to go`
          : valid
            ? "Looks good"
            : ""}
      </span>
      <span className={cn("tabular-nums", over ? "text-error" : "text-faint-foreground")}>
        {value.toLocaleString()} / {max.toLocaleString()}
      </span>
    </div>
  );
}
