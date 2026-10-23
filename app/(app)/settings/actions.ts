"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/session";
import { OCCASION_NAME_MAX_LENGTH } from "@/lib/occasions/model";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionResult = { ok: true } | { ok: false; error: string };

const citySchema = z.object({
  name: z.string().trim().min(1).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const occasionNameSchema = z
  .string()
  .trim()
  .min(1, "Donnez un nom à l'occasion.")
  .max(OCCASION_NAME_MAX_LENGTH, `${OCCASION_NAME_MAX_LENGTH} caractères maximum.`);

const DUPLICATE_OCCASION = "Cette occasion existe déjà.";
const GENERIC_ERROR = "Enregistrement impossible. Réessayez.";

function revalidateEverything() {
  // Occasions and the default city feed the generator, the wardrobe and the settings.
  revalidatePath("/", "layout");
}

export async function saveDefaultCity(
  city: { name: string; latitude: number; longitude: number } | null,
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = city === null ? null : citySchema.safeParse(city);
  if (parsed && !parsed.success) {
    return { ok: false, error: "Ville invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      default_city: parsed?.data.name ?? null,
      default_latitude: parsed?.data.latitude ?? null,
      default_longitude: parsed?.data.longitude ?? null,
    })
    .eq("id", userId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateEverything();
  return { ok: true };
}

export async function createOccasion(name: string): Promise<SettingsActionResult> {
  await requireUserId();
  const parsed = occasionNameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("occasions")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("occasions").insert({ name: parsed.data, position: (last?.position ?? -1) + 1 });
  if (error) return { ok: false, error: error.code === "23505" ? DUPLICATE_OCCASION : GENERIC_ERROR };

  revalidateEverything();
  return { ok: true };
}

export async function renameOccasion(id: string, name: string): Promise<SettingsActionResult> {
  await requireUserId();
  const parsedName = occasionNameSchema.safeParse(name);
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Occasion introuvable." };
  if (!parsedName.success) return { ok: false, error: parsedName.error.issues[0]?.message ?? GENERIC_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("occasions")
    .update({ name: parsedName.data })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.code === "23505" ? DUPLICATE_OCCASION : GENERIC_ERROR };
  if (data.length === 0) return { ok: false, error: "Occasion introuvable." };

  revalidateEverything();
  return { ok: true };
}

/** Deletes an occasion; garments that only had it move to `replacementId`. */
export async function deleteOccasion(id: string, replacementId: string | null): Promise<SettingsActionResult> {
  await requireUserId();
  const ids = z.object({ id: z.uuid(), replacementId: z.uuid().nullable() }).safeParse({ id, replacementId });
  if (!ids.success) return { ok: false, error: "Occasion introuvable." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_occasion", {
    p_id: ids.data.id,
    p_replacement_id: ids.data.replacementId,
  });
  if (error) {
    return {
      ok: false,
      error:
        error.hint === "last_occasion"
          ? "Gardez au moins une occasion."
          : error.hint === "sole_occasion"
            ? "Des vêtements n'ont que cette occasion : choisissez celle qui la remplace."
            : error.code === "P0002"
              ? "Cette occasion n'existe plus."
              : "Suppression impossible. Réessayez.",
    };
  }

  revalidateEverything();
  return { ok: true };
}
