import type { ColorKey } from "@/lib/palette";

export const CATEGORIES = ["top", "bottom", "shoes"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  top: "Haut",
  bottom: "Bas",
  shoes: "Chaussures",
};

export const CATEGORY_PLURAL_LABELS: Record<Category, string> = {
  top: "Hauts",
  bottom: "Bas",
  shoes: "Chaussures",
};

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABELS: Record<Season, string> = {
  spring: "Printemps",
  summer: "Été",
  autumn: "Automne",
  winter: "Hiver",
};

export const WARMTH_LEVELS = [1, 2, 3] as const;
export type Warmth = (typeof WARMTH_LEVELS)[number];

export const WARMTH_LABELS: Record<Warmth, string> = {
  1: "Léger",
  2: "Moyen",
  3: "Chaud",
};

export const MAX_COLORS = 3;

/** A garment as the app (and the outfit engine) sees it. */
export type Garment = {
  id: string;
  name: string;
  category: Category;
  colors: ColorKey[];
  /** Empty means every season. */
  seasons: Season[];
  occasionIds: string[];
  warmth: Warmth;
  rainOk: boolean;
  photoPath: string;
};

/** A garment ready to display, with a short-lived signed photo URL. */
export type GarmentWithPhoto = Garment & { photoUrl: string | null };

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
