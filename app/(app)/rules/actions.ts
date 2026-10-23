"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/session";
import { COLOR_KEYS } from "@/lib/palette";
import { normalizePair } from "@/lib/rules/model";
import { createClient } from "@/lib/supabase/server";

export type RuleActionResult = { ok: true } | { ok: false; error: string };

const MAX_EXCLUSIONS_PER_REQUEST = 50;

const garmentExclusionsSchema = z.object({
  garmentId: z.uuid(),
  otherIds: z.array(z.uuid()).min(1).max(MAX_EXCLUSIONS_PER_REQUEST),
});

const colorExclusionSchema = z.object({
  colorA: z.enum(COLOR_KEYS),
  colorB: z.enum(COLOR_KEYS),
});

function revalidateRules() {
  revalidatePath("/rules", "layout");
  revalidatePath("/wardrobe", "layout");
}

/** Excludes `garmentId` with each of `otherIds`. Pairs that already exist are kept as they are. */
export async function createGarmentExclusions(garmentId: string, otherIds: string[]): Promise<RuleActionResult> {
  await requireUserId();
  const parsed = garmentExclusionsSchema.safeParse({ garmentId, otherIds });
  if (!parsed.success || parsed.data.otherIds.includes(parsed.data.garmentId)) {
    return { ok: false, error: "Sélection invalide." };
  }

  const rows = parsed.data.otherIds.map((otherId) => {
    const [a, b] = normalizePair(parsed.data.garmentId, otherId);
    return { garment_a_id: a, garment_b_id: b };
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("garment_exclusions")
    .upsert(rows, { onConflict: "garment_a_id,garment_b_id", ignoreDuplicates: true });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23514"
          ? "Deux vêtements de la même catégorie ne peuvent pas être exclus ensemble."
          : error.code === "23503"
            ? "Un des vêtements n'existe plus. Rechargez la page."
            : "Enregistrement impossible. Réessayez.",
    };
  }

  revalidateRules();
  return { ok: true };
}

export async function createColorExclusion(colorA: string, colorB: string): Promise<RuleActionResult> {
  await requireUserId();
  const parsed = colorExclusionSchema.safeParse({ colorA, colorB });
  if (!parsed.success) {
    return { ok: false, error: "Choisissez deux couleurs." };
  }

  const [a, b] = normalizePair(parsed.data.colorA, parsed.data.colorB);
  const supabase = await createClient();
  const { error } = await supabase.from("color_exclusions").insert({ color_a: a, color_b: b });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Cette règle existe déjà." : "Enregistrement impossible. Réessayez.",
    };
  }

  revalidateRules();
  return { ok: true };
}

export async function deleteGarmentExclusion(id: string): Promise<RuleActionResult> {
  return deleteRule("garment_exclusions", id);
}

export async function deleteColorExclusion(id: string): Promise<RuleActionResult> {
  return deleteRule("color_exclusions", id);
}

async function deleteRule(table: "garment_exclusions" | "color_exclusions", id: string): Promise<RuleActionResult> {
  await requireUserId();
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, error: "Règle introuvable." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    return { ok: false, error: "Suppression impossible. Réessayez." };
  }

  revalidateRules();
  return { ok: true };
}
