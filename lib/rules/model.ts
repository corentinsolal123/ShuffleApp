import type { ColorKey } from "@/lib/palette";
import type { GarmentWithPhoto } from "@/lib/garments/model";

/** "These two garments never go together." Stored as an unordered pair. */
export type GarmentExclusion = {
  id: string;
  garmentIds: readonly [string, string];
};

/** "These two colours never go together" (possibly the same colour twice). */
export type ColorExclusion = {
  id: string;
  colors: readonly [ColorKey, ColorKey];
};

/** Orders a pair the way the database stores it, so (a, b) and (b, a) compare equal. */
export function normalizePair<T extends string>(a: T, b: T): readonly [T, T] {
  return a <= b ? [a, b] : [b, a];
}

export function pairKey(a: string, b: string): string {
  return normalizePair(a, b).join("|");
}

/** Garment exclusions involving `garmentId`, resolved to the other garment of each pair. */
export function exclusionsForGarment(
  garmentId: string,
  exclusions: readonly GarmentExclusion[],
  garments: readonly GarmentWithPhoto[],
): { ruleId: string; garment: GarmentWithPhoto }[] {
  const byId = new Map(garments.map((garment) => [garment.id, garment]));
  return exclusions.flatMap(({ id, garmentIds: [a, b] }) => {
    if (a !== garmentId && b !== garmentId) return [];
    const other = byId.get(a === garmentId ? b : a);
    return other ? [{ ruleId: id, garment: other }] : [];
  });
}
