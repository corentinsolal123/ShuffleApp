"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { saveGarment } from "@/app/(app)/wardrobe/actions";
import { Button } from "@/components/ui/button";
import { ChipGroup, Chip } from "@/components/ui/chip-group";
import { ChoiceFieldset } from "@/components/ui/choice-fieldset";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  MAX_COLORS,
  SEASONS,
  SEASON_LABELS,
  WARMTH_LABELS,
  WARMTH_LEVELS,
  type Category,
  type GarmentWithPhoto,
  type Season,
  type Warmth,
} from "@/lib/garments/model";
import { GARMENT_PHOTOS_BUCKET, photoPath } from "@/lib/garments/photo";
import { fieldErrors, garmentInputSchema, type GarmentFieldErrors, type GarmentInput } from "@/lib/garments/schema";
import { compressPhoto, type CompressedPhoto } from "@/lib/image/compress";
import { PALETTE, type ColorKey } from "@/lib/palette";
import { createClient } from "@/lib/supabase/client";
import type { Occasion } from "@/lib/occasions/model";
import { ColorSwatch } from "./color-swatch";
import { PhotoPicker } from "./photo-picker";

type Photo =
  | { kind: "existing"; path: string; url: string | null }
  | { kind: "new"; compressed: CompressedPhoto; previewUrl: string };

type Status = "idle" | "compressing" | "saving";

const CATEGORY_OPTIONS = CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));
const WARMTH_OPTIONS = WARMTH_LEVELS.map((value) => ({ value, label: WARMTH_LABELS[value] }));

export function GarmentForm({
  userId,
  occasions,
  garment,
  defaultCategory,
}: {
  userId: string;
  occasions: Occasion[];
  garment?: GarmentWithPhoto;
  defaultCategory?: Category;
}) {
  const router = useRouter();
  const [name, setName] = useState(garment?.name ?? "");
  const [category, setCategory] = useState<Category | null>(garment?.category ?? defaultCategory ?? null);
  const [colors, setColors] = useState<ColorKey[]>(garment?.colors ?? []);
  const [seasons, setSeasons] = useState<Season[]>(garment?.seasons ?? []);
  const [occasionIds, setOccasionIds] = useState<string[]>(garment?.occasionIds ?? []);
  const [warmth, setWarmth] = useState<Warmth>(garment?.warmth ?? 2);
  const [rainOk, setRainOk] = useState(garment?.rainOk ?? false);
  const [photo, setPhoto] = useState<Photo | null>(
    garment ? { kind: "existing", path: garment.photoPath, url: garment.photoUrl } : null,
  );
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<GarmentFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const previewUrl = photo?.kind === "new" ? photo.previewUrl : (photo?.url ?? null);
  const busy = status !== "idle";

  useEffect(() => {
    if (photo?.kind !== "new") return;
    return () => URL.revokeObjectURL(photo.previewUrl);
  }, [photo]);

  async function handlePick(file: File) {
    setStatus("compressing");
    setErrors((current) => ({ ...current, photoPath: undefined }));
    try {
      const compressed = await compressPhoto(file);
      setPhoto({ kind: "new", compressed, previewUrl: URL.createObjectURL(compressed.blob) });
    } catch {
      setErrors((current) => ({ ...current, photoPath: "Cette image ne peut pas être lue. Essayez-en une autre." }));
    } finally {
      setStatus("idle");
    }
  }

  function buildInput(path: string): GarmentInput {
    return {
      id: garment?.id ?? null,
      name,
      category: category as Category,
      colors,
      seasons,
      occasionIds,
      warmth,
      rainOk,
      photoPath: path,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setFormError(null);

    // Validate before uploading anything; the real path is only known after upload.
    const draftPath = photo?.kind === "existing" ? photo.path : photo ? "pending" : "";
    const draft = garmentInputSchema.safeParse(buildInput(draftPath));
    if (!draft.success) {
      setErrors(fieldErrors(draft.error));
      setFormError("Vérifiez les champs signalés.");
      // Errors may sit far above the sticky submit button on a phone.
      requestAnimationFrame(() =>
        form.querySelector("[aria-invalid='true'], [data-invalid]")?.scrollIntoView?.({ block: "center" }),
      );
      return;
    }
    setErrors({});
    setStatus("saving");

    const storage = createClient().storage.from(GARMENT_PHOTOS_BUCKET);
    let path = draftPath;
    let uploadedPath: string | null = null;

    try {
      if (photo?.kind === "new") {
        path = photoPath(userId, photo.compressed.type);
        const { error } = await storage.upload(path, photo.compressed.blob, {
          contentType: photo.compressed.type,
          cacheControl: "31536000",
          upsert: false,
        });
        if (error) {
          setFormError("Envoi de la photo impossible. Vérifiez la connexion et réessayez.");
          setStatus("idle");
          return;
        }
        uploadedPath = path;
      }

      const result = await saveGarment(buildInput(path));
      if (!result.ok) {
        if (uploadedPath) await storage.remove([uploadedPath]);
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        setStatus("idle");
        return;
      }

      router.push(`/wardrobe?category=${category}`);
    } catch {
      if (uploadedPath) await storage.remove([uploadedPath]).catch(() => undefined);
      setFormError("Enregistrement impossible. Vérifiez la connexion et réessayez.");
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10" noValidate>
      <PhotoPicker
        previewUrl={previewUrl}
        alt={name || "Photo du vêtement"}
        busy={status === "compressing"}
        disabled={busy}
        error={errors.photoPath}
        onPick={(file) => void handlePick(file)}
      />

      <Field invalid={Boolean(errors.name)}>
        <FieldLabel>Nom</FieldLabel>
        <Input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Chemise en lin blanche"
          maxLength={60}
          autoComplete="off"
          disabled={busy}
        />
        <FieldError match={Boolean(errors.name)}>{errors.name}</FieldError>
      </Field>

      <ChoiceFieldset legend="Catégorie" error={errors.category}>
        <SegmentedControl options={CATEGORY_OPTIONS} value={category} onValueChange={setCategory} disabled={busy} />
      </ChoiceFieldset>

      <ChoiceFieldset legend="Couleurs" hint={`${colors.length}/${MAX_COLORS}`} error={errors.colors}>
        <ChipGroup value={colors} onValueChange={setColors} disabled={busy} className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {PALETTE.map((color) => (
            <Chip
              key={color.key}
              value={color.key}
              disabled={!colors.includes(color.key) && colors.length >= MAX_COLORS}
              className="flex-col justify-center gap-1.5 px-1 py-2 text-[0.6875rem]"
            >
              <ColorSwatch color={color.key} className="size-6" />
              {color.label}
            </Chip>
          ))}
        </ChipGroup>
      </ChoiceFieldset>

      <ChoiceFieldset
        legend="Saisons"
        hint={seasons.length === 0 ? "Toutes saisons" : undefined}
        error={errors.seasons}
      >
        <ChipGroup value={seasons} onValueChange={setSeasons} disabled={busy}>
          {SEASONS.map((season) => (
            <Chip key={season} value={season}>
              {SEASON_LABELS[season]}
            </Chip>
          ))}
        </ChipGroup>
      </ChoiceFieldset>

      <ChoiceFieldset legend="Occasions" error={errors.occasionIds}>
        <ChipGroup value={occasionIds} onValueChange={setOccasionIds} disabled={busy}>
          {occasions.map((occasion) => (
            <Chip key={occasion.id} value={occasion.id}>
              {occasion.name}
            </Chip>
          ))}
        </ChipGroup>
      </ChoiceFieldset>

      <ChoiceFieldset legend="Chaleur" error={errors.warmth}>
        <SegmentedControl options={WARMTH_OPTIONS} value={warmth} onValueChange={setWarmth} disabled={busy} />
      </ChoiceFieldset>

      <Field className="flex-row items-center justify-between gap-4 border-y py-4">
        <div className="flex flex-col gap-1">
          <FieldLabel>Adapté à la pluie</FieldLabel>
          <p className="text-sm text-muted-foreground">Surtout pour les chaussures et les manteaux.</p>
        </div>
        <Switch checked={rainOk} onCheckedChange={setRainOk} disabled={busy} />
      </Field>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-3 border-t bg-background px-4 py-4">
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {status === "saving" ? "Enregistrement…" : garment ? "Enregistrer" : "Ajouter à la garde-robe"}
        </Button>
      </div>
    </form>
  );
}
