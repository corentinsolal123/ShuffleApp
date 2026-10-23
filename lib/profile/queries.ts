import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "./model";

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("default_city, default_latitude, default_longitude")
    .maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);

  const name = data?.default_city;
  const latitude = data?.default_latitude;
  const longitude = data?.default_longitude;
  return {
    defaultCity: name && latitude != null && longitude != null ? { name, latitude, longitude } : null,
  };
}
