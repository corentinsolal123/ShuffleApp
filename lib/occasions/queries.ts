import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Occasion } from "./model";

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
