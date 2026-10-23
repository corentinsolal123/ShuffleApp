import "server-only";
import { createClient } from "@/lib/supabase/server";
import { GARMENT_COLUMNS, toGarment } from "./mapper";
import type { Garment, GarmentWithPhoto } from "./model";
import { GARMENT_PHOTOS_BUCKET, SIGNED_URL_TTL_SECONDS } from "./photo";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function withPhotoUrls(supabase: ServerClient, garments: Garment[]): Promise<GarmentWithPhoto[]> {
  if (garments.length === 0) return [];

  const { data } = await supabase.storage
    .from(GARMENT_PHOTOS_BUCKET)
    .createSignedUrls(
      garments.map((garment) => garment.photoPath),
      SIGNED_URL_TTL_SECONDS,
    );
  // A missing photo should not break the list: the card falls back to a placeholder.
  const urls = new Map((data ?? []).map((entry) => [entry.path, entry.error ? null : entry.signedUrl]));

  return garments.map((garment) => ({ ...garment, photoUrl: urls.get(garment.photoPath) ?? null }));
}

export async function listGarments(): Promise<GarmentWithPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("garments")
    .select(GARMENT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load garments: ${error.message}`);

  return withPhotoUrls(supabase, data.map(toGarment));
}

export async function getGarment(id: string): Promise<GarmentWithPhoto | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("garments").select(GARMENT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load garment: ${error.message}`);
  if (!data) return null;

  const [garment] = await withPhotoUrls(supabase, [toGarment(data)]);
  return garment ?? null;
}
