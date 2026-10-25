import type { Garment } from "@/lib/garments/model";
import type { Random } from "@/lib/outfit-engine";

/** Small deterministic PRNG (mulberry32) so draws are reproducible. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const OCCASION = { daily: "occ-daily", work: "occ-work", sport: "occ-sport" } as const;

/** A garment that fits every filter unless overridden. */
function garment(id: string, category: Garment["category"], patch: Partial<Garment> = {}): Garment {
  return {
    id,
    name: id,
    category,
    colors: ["grey"],
    seasons: [],
    occasionIds: [OCCASION.daily],
    warmth: 2,
    rainOk: true,
    photoPath: `user/${id}.webp`,
    ...patch,
  };
}

export const top = (id: string, patch?: Partial<Garment>) => garment(id, "top", patch);
export const bottom = (id: string, patch?: Partial<Garment>) => garment(id, "bottom", patch);
export const shoes = (id: string, patch?: Partial<Garment>) => garment(id, "shoes", patch);
export const outerwear = (id: string, patch?: Partial<Garment>) => garment(id, "outerwear", patch);

export const NO_RULES = { garmentExclusions: [], colorExclusions: [] } as const;
