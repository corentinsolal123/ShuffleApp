export type Occasion = { id: string; name: string };

export type OccasionWithUsage = Occasion & {
  /** Garments tagged with this occasion. */
  garmentCount: number;
  /** Garments for which it is the only occasion: they need a replacement if it is deleted. */
  soleGarmentCount: number;
};

export const OCCASION_NAME_MAX_LENGTH = 40;

/** Counts, per occasion, the garments using it and those using only it. */
export function occasionUsage(
  occasions: readonly Occasion[],
  links: readonly { garment_id: string; occasion_id: string }[],
): OccasionWithUsage[] {
  const occasionsByGarment = new Map<string, string[]>();
  for (const { garment_id, occasion_id } of links) {
    occasionsByGarment.set(garment_id, [...(occasionsByGarment.get(garment_id) ?? []), occasion_id]);
  }

  return occasions.map((occasion) => {
    let garmentCount = 0;
    let soleGarmentCount = 0;
    for (const ids of occasionsByGarment.values()) {
      if (!ids.includes(occasion.id)) continue;
      garmentCount++;
      if (ids.length === 1) soleGarmentCount++;
    }
    return { ...occasion, garmentCount, soleGarmentCount };
  });
}
