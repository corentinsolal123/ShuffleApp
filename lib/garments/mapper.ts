import { COLOR_KEYS, type ColorKey } from "@/lib/palette";
import type { Tables } from "@/lib/db/types";
import type { Garment, Warmth } from "./model";

export const GARMENT_COLUMNS =
  "id, name, category, colors, seasons, warmth, rain_ok, photo_path, garment_occasions(occasion_id)" as const;

export type GarmentRow = Pick<
  Tables<"garments">,
  "id" | "name" | "category" | "colors" | "seasons" | "warmth" | "rain_ok" | "photo_path"
> & { garment_occasions: { occasion_id: string }[] };

const KNOWN_COLORS = new Set<string>(COLOR_KEYS);

function isColorKey(value: string): value is ColorKey {
  return KNOWN_COLORS.has(value);
}

function toWarmth(value: number): Warmth {
  return value <= 1 ? 1 : value >= 3 ? 3 : 2;
}

export function toGarment(row: GarmentRow): Garment {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    colors: row.colors.filter(isColorKey),
    seasons: row.seasons,
    occasionIds: row.garment_occasions.map((link) => link.occasion_id),
    warmth: toWarmth(row.warmth),
    rainOk: row.rain_ok,
    photoPath: row.photo_path,
  };
}
