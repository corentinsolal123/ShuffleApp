"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/session";
import { saveGarmentErrorMessage } from "@/lib/garments/errors";
import { GARMENT_PHOTOS_BUCKET } from "@/lib/garments/photo";
import { fieldErrors, garmentInputSchema, type GarmentFieldErrors, type GarmentInput } from "@/lib/garments/schema";
import { createClient } from "@/lib/supabase/server";

export type SaveGarmentResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: GarmentFieldErrors };

export type DeleteGarmentResult = { ok: true } | { ok: false; error: string };

/**
 * Creates or updates a garment. The photo is uploaded by the browser beforehand;
 * when it changes, the previous file is removed once the row is saved.
 */
export async function saveGarment(input: GarmentInput): Promise<SaveGarmentResult> {
  const userId = await requireUserId();

  const parsed = garmentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Vérifiez le formulaire.", fieldErrors: fieldErrors(parsed.error) };
  }
  const garment = parsed.data;
  if (!garment.photoPath.startsWith(`${userId}/`)) {
    return { ok: false, error: "Photo invalide." };
  }

  const supabase = await createClient();

  let previousPhotoPath: string | null = null;
  if (garment.id) {
    const { data: existing } = await supabase
      .from("garments")
      .select("photo_path")
      .eq("id", garment.id)
      .maybeSingle();
    if (!existing) {
      return { ok: false, error: saveGarmentErrorMessage({ code: "P0002" }) };
    }
    previousPhotoPath = existing.photo_path;
  }

  const { data: id, error } = await supabase.rpc("save_garment", {
    p_id: garment.id,
    p_name: garment.name,
    p_category: garment.category,
    p_colors: garment.colors,
    p_seasons: garment.seasons,
    p_warmth: garment.warmth,
    p_rain_ok: garment.rainOk,
    p_photo_path: garment.photoPath,
    p_occasion_ids: garment.occasionIds,
  });
  if (error) {
    return { ok: false, error: saveGarmentErrorMessage(error) };
  }

  if (previousPhotoPath && previousPhotoPath !== garment.photoPath) {
    // Best effort: an orphaned file is harmless and private.
    await supabase.storage.from(GARMENT_PHOTOS_BUCKET).remove([previousPhotoPath]);
  }

  revalidatePath("/wardrobe", "layout");
  return { ok: true, id };
}

export async function deleteGarment(id: string): Promise<DeleteGarmentResult> {
  await requireUserId();
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, error: "Vêtement introuvable." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("garments").delete().eq("id", id).select("photo_path").maybeSingle();
  if (error) {
    return { ok: false, error: "Suppression impossible. Réessayez." };
  }
  if (!data) {
    return { ok: false, error: "Vêtement introuvable." };
  }

  await supabase.storage.from(GARMENT_PHOTOS_BUCKET).remove([data.photo_path]);

  revalidatePath("/wardrobe", "layout");
  return { ok: true };
}
