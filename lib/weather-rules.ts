import type { Category, Warmth } from "@/lib/garments/model";

/** Weather of the day as the outfit engine needs it. */
export type WeatherConditions = {
  /** Mean feels-like temperature over the day window, in °C. */
  feelsLike: number;
  /** Whether meaningful rain is expected during the day window. */
  rain: boolean;
};

/**
 * Tunable weather rules. Temperatures are feels-like °C; a threshold applies
 * strictly below / above its value.
 */
export type WeatherRuleConfig = {
  /** Hard minimum warmth per category when it is cold. Checked from coldest to mildest. */
  cold: readonly { below: number; minWarmth: Partial<Record<Category, Warmth>> }[];
  /** Soft preference when it is hot: these levels are favoured, others kept as a fallback. */
  hot: { above: number; preferredWarmth: Partial<Record<Category, Warmth>> };
  /** Categories that must be rain-proof when rain is expected. */
  rainProofCategories: readonly Category[];
  /**
   * When an outerwear piece is added, and which warmth levels suit it.
   * Checked from coldest to mildest; above the mildest threshold, no outerwear.
   */
  outerwear: readonly ({ below: number } & WarmthRange)[];
};

/** Inclusive range of acceptable warmth levels. */
export type WarmthRange = { minWarmth: Warmth; maxWarmth: Warmth };

export const DEFAULT_WEATHER_RULES: WeatherRuleConfig = {
  cold: [
    { below: 3, minWarmth: { top: 3, bottom: 2 } },
    { below: 10, minWarmth: { top: 2, bottom: 2 } },
  ],
  hot: { above: 22, preferredWarmth: { top: 1, bottom: 1 } },
  rainProofCategories: ["shoes", "outerwear"],
  outerwear: [
    { below: 3, minWarmth: 3, maxWarmth: 3 },
    { below: 10, minWarmth: 2, maxWarmth: 3 },
    { below: 17, minWarmth: 1, maxWarmth: 2 },
  ],
};

export type WeatherConstraints = {
  minWarmth: Partial<Record<Category, Warmth>>;
  preferredWarmth: Partial<Record<Category, Warmth>>;
  rainProof: readonly Category[];
  /** Outerwear to add to the outfit, or null when it is not cold enough (or no weather). */
  outerwear: WarmthRange | null;
};

const NO_CONSTRAINTS: WeatherConstraints = { minWarmth: {}, preferredWarmth: {}, rainProof: [], outerwear: null };

/** Turns the day's weather into garment constraints. No weather means no constraint. */
export function weatherConstraints(
  weather: WeatherConditions | null | undefined,
  rules: WeatherRuleConfig = DEFAULT_WEATHER_RULES,
): WeatherConstraints {
  if (!weather) return NO_CONSTRAINTS;

  const coldest = <T extends { below: number }>(thresholds: readonly T[]) =>
    [...thresholds].sort((a, b) => a.below - b.below).find((rule) => weather.feelsLike < rule.below);
  const cold = coldest(rules.cold);
  const outerwear = coldest(rules.outerwear);
  const hot = weather.feelsLike > rules.hot.above;

  return {
    minWarmth: cold?.minWarmth ?? {},
    preferredWarmth: hot ? rules.hot.preferredWarmth : {},
    rainProof: weather.rain ? rules.rainProofCategories : [],
    outerwear: outerwear ? { minWarmth: outerwear.minWarmth, maxWarmth: outerwear.maxWarmth } : null,
  };
}
