import "server-only";
import { createClient } from "@/lib/supabase/server";
import { occasionUsage, type Occasion, type OccasionWithUsage } from "./model";

export async function listOccasions(): Promise<Occasion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("occasions")
    .select("id, name")
    .order("position")
    .order("name");
  if (error) throw new Error(`Failed to load occasions: ${error.message}`);
  return data;
}

export async function listOccasionsWithUsage(): Promise<OccasionWithUsage[]> {
  const supabase = await createClient();
  const [occasions, { data: links, error }] = await Promise.all([
    listOccasions(),
    supabase.from("garment_occasions").select("garment_id, occasion_id"),
  ]);
  if (error) throw new Error(`Failed to load occasion usage: ${error.message}`);
  return occasionUsage(occasions, links);
}
