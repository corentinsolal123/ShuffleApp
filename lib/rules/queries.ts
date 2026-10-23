import "server-only";
import { isColorKey } from "@/lib/palette";
import { createClient } from "@/lib/supabase/server";
import type { ColorExclusion, GarmentExclusion } from "./model";

export async function listGarmentExclusions(): Promise<GarmentExclusion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("garment_exclusions")
    .select("id, garment_a_id, garment_b_id")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load garment rules: ${error.message}`);

  return data.map((row) => ({ id: row.id, garmentIds: [row.garment_a_id, row.garment_b_id] as const }));
}

export async function listColorExclusions(): Promise<ColorExclusion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("color_exclusions")
    .select("id, color_a, color_b")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load colour rules: ${error.message}`);

  return data.flatMap((row) =>
    isColorKey(row.color_a) && isColorKey(row.color_b)
      ? [{ id: row.id, colors: [row.color_a, row.color_b] as const }]
      : [],
  );
}
