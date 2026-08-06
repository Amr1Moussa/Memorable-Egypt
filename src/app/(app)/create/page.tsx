"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationSearch } from "@/features/search/components/location-search";
import { ImageUploader } from "@/features/storage/components/image-uploader";
import type { UploadedImage } from "@/features/storage/components/image-uploader";
import { TIER_STYLES } from "@/features/map/constants";
import { useAutoSave, type SaveStatus } from "@/features/memories/hooks/use-auto-save";
import { MemoryEditor } from "@/features/memories/components/memory-editor";
import { TagInput } from "@/features/memories/components/tag-input";
import type { MemoryView } from "@/features/memories/types";
import { ROUTES } from "@/lib/constants/app";

/**
 * The create-memory wizard (Phase 4 core flow):
 *   1. Choose location
 *   2. Write the story (title, story, category, visibility, tags)
 *   3. Upload images
 *   4. Choose pin type (standard / legacy)
 *   5. Preview
 *   6. Publish (free Genesis) or Continue to payment (Phase 5)
 *
 * Loads/creates a draft via the API, auto-saves on change, and publishes at
 * the end. Auto-save is debounced + warns on unload (Phase 4 #1).
 *
 * Source: doc 10 (Create Memory Flow), Phase 4 requirements #1–#5.
 */

type Step = "location" | "write" | "images" | "pin" | "preview";

const STEP_ORDER: Step[] = ["location", "write", "images", "pin", "preview"];
const STEP_LABELS: Record<Step, string> = {
  location: "Location",
  write: "Story",
  images: "Images",
  pin: "Pin type",
  preview: "Preview",
};

interface DraftState {
  id: string | null;
  locationId: string | null;
  locationName: string | null;
  locationTier: number;
  title: string;
  story: string;
  categoryId: string | null;
  visibility: "public" | "private" | "unlisted";
  pinType: "standard" | "legacy";
  tags: string[];
}

export default function CreatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const draftId = params.get("id");

  const [step, setStep] = useState<Step>(draftId ? "write" : "location");
  const [loading, setLoading] = useState(Boolean(draftId));
  const [categories, setCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [draft, setDraft] = useState<DraftState>({
    id: draftId,
    locationId: null,
    locationName: null,
    locationTier: 1,
    title: "",
    story: "",
    categoryId: null,
    visibility: "public",
    pinType: "standard",
    tags: [],
  });

  // Load categories once.
  useEffect(() => {
    fetch("/api/v1/categories")
      .then((r) => r.json())
      .then((j) =>
        setCategories(
          j.success
            ? (j.data as { id: string; name: string }[]).map((c) => ({
                id: c.id,
                name: c.name,
              }))
            : [],
        ),
      )
      .catch(() => undefined);
  }, []);

  // Load an existing draft. `loading` is initialized true when draftId exists,
  // so we only ever set it false here (in the async callback, not sync).
  useEffect(() => {
    if (!draftId) return;
    fetch(`/api/v1/memories/${draftId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        const m = j.data.memory as MemoryView;
        setDraft((d) => ({
          ...d,
          id: m.id,
          locationId: m.location?.id ?? null,
          locationName: m.location?.name ?? null,
          locationTier: m.location?.tier ?? 1,
          title: m.title,
          story: m.story,
          categoryId: m.category?.id ?? null,
          visibility: m.visibility,
          pinType: m.pinType,
          tags: m.tags,
        }));
        setImages(
          m.media.map((mm) => ({
            id: mm.id,
            url: mm.public_url,
            width: mm.width,
            height: mm.height,
          })),
        );
      })
      .finally(() => setLoading(false));
  }, [draftId]);

  // Patch the draft scalar fields via auto-save (only once the draft exists).
  const save = useCallback(
    async (data: DraftState) => {
      if (!data.id) return;
      await fetch(`/api/v1/memories/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          story: data.story,
          categoryId: data.categoryId,
          visibility: data.visibility,
          pinType: data.pinType,
          tags: data.tags,
        }),
      });
    },
    [],
  );
  const { status: saveStatus, flush } = useAutoSave(draft, save, {
    enabled: Boolean(draft.id) && step === "write",
  });

  // --- Step handlers ---

  async function chooseLocation(loc: {
    id: string;
    name: string;
    tier: number;
  }) {
    // Create the draft on first location pick.
    if (!draft.id) {
      const res = await fetch("/api/v1/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: loc.id,
          title: "Untitled memory",
          story: "",
        }),
      });
      const j = (await res.json()) as
        | { success: true; data: { id: string } }
        | { success: false };
      if (!j.success) return;
      setDraft((d) => ({
        ...d,
        id: j.data.id,
        locationId: loc.id,
        locationName: loc.name,
        locationTier: loc.tier,
      }));
      // Replace URL so a refresh resumes the draft.
      window.history.replaceState(null, "", `/create?id=${j.data.id}`);
    } else {
      setDraft((d) => ({
        ...d,
        locationId: loc.id,
        locationName: loc.name,
        locationTier: loc.tier,
      }));
    }
    setStep("write");
  }

  async function createDraftFor(loc: {
    id: string;
    name: string;
    tier: number;
  }) {
    const res = await fetch("/api/v1/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId: loc.id,
        title: "Untitled memory",
        story: "",
      }),
    });
    const j = (await res.json()) as
      | { success: true; data: { id: string } }
      | { success: false };
    if (!j.success) return null;
    return j.data.id;
  }

  async function nextFromLocation(loc: {
    id: string;
    name: string;
    tier: number;
  }) {
    const existingId = draft.id ?? (await createDraftFor(loc));
    if (!existingId) return;
    await chooseLocation({ ...loc, tier: loc.tier });
    if (!draft.id && existingId) {
      // chooseLocation already set state; ensure id is current.
      setDraft((d) => ({ ...d, id: existingId }));
    }
  }

  function patchDraft(patch: Partial<DraftState>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function goNext() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1] as Step);
  }
  function goBack() {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1] as Step);
  }

  async function publish(path: "free" | "paid") {
    if (!draft.id) return;
    setPublishing(true);
    setPublishError(null);
    await flush();
    try {
      const res = await fetch(`/api/v1/memories/${draft.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, pinType: draft.pinType }),
      });
      const j = (await res.json()) as
        | { success: true; data: { publicationStatus: string } }
        | { success: false; error: { message: string } };
      if (!j.success) {
        setPublishError(j.error.message);
        return;
      }
      if (path === "free" && j.data.publicationStatus === "published") {
        router.push(ROUTES.profile);
      } else {
        // Paid → Phase 5 payment flow. For now, redirect to profile with a note.
        router.push(ROUTES.profile);
      }
    } catch {
      setPublishError("We couldn't publish your memory. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  const canProceedFromWrite = draft.title.trim().length >= 3 && draft.story.trim().length >= 20;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-1 text-xs">
        {STEP_ORDER.map((s, i) => {
          const active = s === step;
          const done = STEP_ORDER.indexOf(step) > i;
          return (
            <li key={s} className="flex items-center gap-1">
              <span
                className={
                  active
                    ? "rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground"
                    : done
                      ? "rounded-full bg-muted px-2.5 py-1 text-muted-foreground"
                      : "rounded-full px-2.5 py-1 text-faint-foreground"
                }
              >
                {done ? <Check className="inline h-3 w-3" /> : `${i + 1}.`}{" "}
                {STEP_LABELS[s]}
              </span>
              {i < STEP_ORDER.length - 1 ? (
                <span className="text-faint-foreground">›</span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      {step === "location" ? (
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Where did this happen?
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search for a place in Egypt. Every memory begins with a location.
            </p>
          </div>
          <LocationSearch
            onSelect={(loc) =>
              nextFromLocation({
                id: loc.id,
                name: loc.name,
                tier: loc.tier,
              })
            }
          />
        </section>
      ) : null}

      {step === "write" ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="inline-flex items-center gap-1 text-sm text-nile">
                <MapPin className="h-3.5 w-3.5" />
                {draft.locationName}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Tell your story
              </h1>
            </div>
            <SaveIndicator status={saveStatus} />
          </div>
          <MemoryEditor
            data={{
              title: draft.title,
              story: draft.story,
              categoryId: draft.categoryId,
              visibility: draft.visibility,
            }}
            categories={categories}
            onChange={(p) =>
              patchDraft({
                ...(p.title !== undefined ? { title: p.title } : {}),
                ...(p.story !== undefined ? { story: p.story } : {}),
                ...(p.categoryId !== undefined ? { categoryId: p.categoryId } : {}),
                ...(p.visibility !== undefined ? { visibility: p.visibility } : {}),
              })
            }
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Tags</label>
            <TagInput tags={draft.tags} onChange={(t) => patchDraft({ tags: t })} />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setStep("location")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={goNext} disabled={!canProceedFromWrite}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      ) : null}

      {step === "images" ? (
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Add images
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Up to 10 images. They help your memory come alive.
            </p>
          </div>
          {draft.id ? (
            <ImageUploader
              memoryId={draft.id}
              onChange={setImages}
            />
          ) : null}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={goNext}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      ) : null}

      {step === "pin" ? (
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Choose your pin
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Standard pins preserve everyday memories. Legacy pins are for
              life&apos;s most meaningful moments.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PinOption
              selected={draft.pinType === "standard"}
              onSelect={() => patchDraft({ pinType: "standard" })}
              title="Standard Pin"
              tier={draft.locationTier}
              legacy={false}
            />
            <PinOption
              selected={draft.pinType === "legacy"}
              onSelect={() => patchDraft({ pinType: "legacy" })}
              title="Legacy Pin"
              tier={draft.locationTier}
              legacy
            />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={goNext}>
              Preview <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      ) : null}

      {step === "preview" ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Preview</h1>
            <Button variant="ghost" size="sm" onClick={() => setStep("write")}>
              Edit
            </Button>
          </div>
          <PreviewContent
            title={draft.title}
            story={draft.story}
            tags={draft.tags}
            pinType={draft.pinType}
            visibility={draft.visibility}
            locationName={draft.locationName}
            locationTier={draft.locationTier}
            images={images}
          />
          {publishError ? (
            <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
              {publishError}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => publish("free")}
                disabled={publishing}
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Publish for free
              </Button>
              <Button onClick={() => publish("paid")} disabled={publishing}>
                Continue to payment
              </Button>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            <Link href={ROUTES.profile}>Cancel and save as draft</Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "dirty"
          ? "Unsaved changes"
          : status === "error"
            ? "Couldn't save"
            : "";
  if (!label) return null;
  return (
    <span
      className={
        status === "error"
          ? "text-xs text-error"
          : status === "dirty"
            ? "text-xs text-warning"
            : "text-xs text-muted-foreground"
      }
    >
      {status === "saving" ? (
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
      ) : null}
      {label}
    </span>
  );
}

function PinOption({
  selected,
  onSelect,
  title,
  tier,
  legacy,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  tier: number;
  legacy: boolean;
}) {
  const style = TIER_STYLES[tier as 1 | 2 | 3 | 4];
  const price = legacy
    ? [80, 130, 200, 400][tier - 1]
    : [30, 50, 90, 180][tier - 1];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? "rounded-lg border-2 p-4 text-left"
          : "rounded-lg border border-border p-4 text-left transition hover:border-nile"
      }
      style={selected ? { borderColor: legacy ? "#C76B4F" : "#D8B36A" } : {}}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {legacy ? (
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-accent" /> {title}
            </span>
          ) : (
            title
          )}
        </span>
        {selected ? <Check className="h-4 w-4 text-nile" /> : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Tier {tier} ({style?.label})
      </p>
      <p className="mt-2 text-lg font-semibold">{price} EGP</p>
    </button>
  );
}

/** Lightweight preview renderer (reuses MemoryPreview shape without a full load). */
function PreviewContent(props: {
  title: string;
  story: string;
  tags: string[];
  pinType: "standard" | "legacy";
  visibility: "public" | "private" | "unlisted";
  locationName: string | null;
  locationTier: number;
  images: UploadedImage[];
}) {
  const style = TIER_STYLES[props.locationTier as 1 | 2 | 3 | 4];
  const legacy = props.pinType === "legacy";
  const price = legacy
    ? [80, 130, 200, 400][props.locationTier - 1]
    : [30, 50, 90, 180][props.locationTier - 1];

  return (
    <article className="space-y-4 rounded-lg border border-border bg-surface p-5">
      {legacy ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
          <Sparkles className="h-3 w-3" /> Legacy Pin
        </span>
      ) : null}
      <h2 className="text-xl font-semibold">{props.title}</h2>
      <p className="inline-flex items-center gap-1 text-sm text-nile">
        <MapPin className="h-3.5 w-3.5" />
        {props.locationName} · Tier {props.locationTier} ({style?.label})
      </p>
      {props.images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {props.images.slice(0, 6).map((img) => (
            <div
              key={img.id}
              className="relative aspect-square overflow-hidden rounded-md bg-muted"
            >
              <Image
                src={img.url}
                alt={props.title}
                fill
                sizes="33vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}
      <p className="whitespace-pre-wrap text-sm text-foreground">
        {props.story}
      </p>
      {props.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {props.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex justify-between border-t border-border pt-2 text-sm">
        <span className="text-muted-foreground">
          {legacy ? "Legacy Pin" : "Standard Pin"} · {props.visibility}
        </span>
        <span className="font-semibold">{price} EGP</span>
      </div>
    </article>
  );
}
