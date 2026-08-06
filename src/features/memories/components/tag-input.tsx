"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { tagSchema } from "../schemas";
import { MAX_TAGS } from "../constants";

/**
 * Tag input with inline add/remove (Phase 4 #1).
 *
 * Enter or comma adds a tag (validated + lowercased + deduped). Backspace on
 * an empty input removes the last tag. Enforces the max (doc 10.8).
 *
 * Source: doc 10.8 (Tags), Phase 4 requirement #1.
 */
export function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addTag() {
    const raw = draft.trim();
    setDraft("");
    if (!raw) return;
    const normalized = raw.toLowerCase();

    if (tags.length >= MAX_TAGS) {
      setError(`You can add up to ${MAX_TAGS} tags.`);
      return;
    }
    if (tags.includes(normalized)) {
      setError("That tag is already added.");
      return;
    }
    const parsed = tagSchema.safeParse(normalized);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid tag.");
      return;
    }
    setError(null);
    onChange([...tags, normalized]);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
    setError(null);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-surface p-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-faint-foreground hover:text-error"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS ? (
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              } else if (
                e.key === "Backspace" &&
                draft === "" &&
                tags.length > 0
              ) {
                removeTag(tags[tags.length - 1] as string);
              }
            }}
            onBlur={addTag}
            placeholder={tags.length === 0 ? "Add tags (Enter to add)" : ""}
            className="min-w-[8rem] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-faint-foreground"
            aria-label="Add a tag"
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-error">{error}</span>
        <span className="text-faint-foreground">
          {tags.length} / {MAX_TAGS}
        </span>
      </div>
    </div>
  );
}
