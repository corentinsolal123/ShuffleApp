/**
 * Outfit engine: pure functions, no I/O. Given a wardrobe, exclusion rules and
 * the day's filters, it lists every valid (top, bottom, shoes) combination and
 * draws distinct outfits at random, or explains what blocks.
 */
import { CATEGORIES, type Category, type Garment, type Season } from "@/lib/garments/model";
import { pairKey, type ColorExclusion, type GarmentExclusion } from "@/lib/rules/model";
import {
  DEFAULT_WEATHER_RULES,
  weatherConstraints,
  type WeatherConditions,
  type WeatherConstraints,
  type WeatherRuleConfig,
} from "@/lib/weather-rules";

export const MIN_OUTFITS = 1;
export const MAX_OUTFITS = 3;

/** Returns a float in [0, 1), like Math.random. Injected so draws are reproducible in tests. */
export type Random = () => number;

export type Outfit<G extends Garment = Garment> = { top: G; bottom: G; shoes: G };

export type OutfitFilters = {
  season: Season;
  occasionId?: string | null;
  weather?: WeatherConditions | null;
};

export type OutfitRules = {
  garmentExclusions: readonly GarmentExclusion[];
  colorExclusions: readonly ColorExclusion[];
};

export type EngineInput<G extends Garment = Garment> = {
  garments: readonly G[];
  rules: OutfitRules;
  filters: OutfitFilters;
  weatherRules?: WeatherRuleConfig;
};

export type BlockingFilter = "season" | "occasion" | "warmth" | "rain";

export type BlockReason =
  /** The wardrobe has no garment at all in this category. */
  | { kind: "missing_category"; category: Category }
  /** This filter (applied in the order season → occasion → warmth → rain) left the category empty. */
  | { kind: "filter"; category: Category; filter: BlockingFilter }
  /** Every category has candidates, but the exclusion rules rule out every combination. */
  | { kind: "rules"; blockedBy: "garments" | "colors" | "combined" };

export type EngineNote =
  /** It is hot but light pieces could not form an outfit: other warmth levels were used. */
  | { kind: "light_preference_relaxed" }
  | { kind: "fewer_than_requested"; requested: number; available: number };

export type GenerateResult<G extends Garment = Garment> =
  | { ok: true; outfits: Outfit<G>[]; notes: EngineNote[] }
  | { ok: false; reason: BlockReason };

export type RerollResult<G extends Garment = Garment> =
  | { ok: true; outfits: Outfit<G>[]; notes: EngineNote[] }
  | { ok: false; reason: BlockReason | { kind: "no_alternative" } };

export type Analysis<G extends Garment = Garment> =
  | { ok: true; outfits: Outfit<G>[]; notes: EngineNote[] }
  | { ok: false; reason: BlockReason };

type Candidates<G> = Record<Category, G[]>;

type Exclusions = { garmentPairs: ReadonlySet<string>; colorPairs: ReadonlySet<string> };

const NO_PAIRS: ReadonlySet<string> = new Set();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Every valid outfit for these filters and rules (unordered), or why there is none. */
export function analyzeOutfits<G extends Garment>(input: EngineInput<G>): Analysis<G> {
  const constraints = weatherConstraints(input.filters.weather, input.weatherRules ?? DEFAULT_WEATHER_RULES);
  const filtered = filterCandidates(input.garments, input.filters, constraints);
  if (!filtered.ok) return filtered;

  const exclusions = toExclusions(input.rules);
  const notes: EngineNote[] = [];

  const preferred = applyPreferences(filtered.candidates, constraints);
  if (preferred) {
    const outfits = validOutfits(preferred.candidates, exclusions);
    if (outfits.length > 0 && !preferred.relaxed) {
      return { ok: true, outfits, notes };
    }
    notes.push({ kind: "light_preference_relaxed" });
    if (outfits.length > 0) {
      return { ok: true, outfits, notes };
    }
  }

  const outfits = validOutfits(filtered.candidates, exclusions);
  if (outfits.length === 0) {
    return { ok: false, reason: { kind: "rules", blockedBy: blockingRules(filtered.candidates, exclusions) } };
  }
  return { ok: true, outfits, notes };
}

/**
 * Draws `count` (1–3) distinct outfits at random among the valid ones,
 * avoiding shared pieces between them whenever possible.
 */
export function generateOutfits<G extends Garment>(
  input: EngineInput<G>,
  count: number,
  random: Random = Math.random,
): GenerateResult<G> {
  const analysis = analyzeOutfits(input);
  if (!analysis.ok) return analysis;

  const requested = clampCount(count);
  const outfits = drawOutfits(analysis.outfits, requested, random);
  const notes = [...analysis.notes];
  if (outfits.length < requested) {
    notes.push({ kind: "fewer_than_requested", requested, available: outfits.length });
  }
  return { ok: true, outfits, notes };
}

/**
 * Replaces only `current[index]` with another valid outfit: different from all
 * current ones, sharing as few pieces as possible with the others, then with
 * the outfit it replaces.
 */
export function rerollOutfit<G extends Garment>(
  input: EngineInput<G>,
  current: readonly Outfit<G>[],
  index: number,
  random: Random = Math.random,
): RerollResult<G> {
  const analysis = analyzeOutfits(input);
  if (!analysis.ok) return analysis;

  const replaced = current[index];
  if (!replaced) return { ok: false, reason: { kind: "no_alternative" } };

  const others = current.filter((_, position) => position !== index);
  const weights = new Map<string, number>();
  addPieces(weights, [replaced], 1);
  addPieces(weights, others, OTHER_OUTFIT_WEIGHT);

  const [next] = drawOutfits(analysis.outfits, 1, random, current, weights);
  if (!next) return { ok: false, reason: { kind: "no_alternative" } };

  const outfits = [...current];
  outfits[index] = next;
  return { ok: true, outfits, notes: analysis.notes };
}

export function outfitKey(outfit: Outfit): string {
  return `${outfit.top.id}|${outfit.bottom.id}|${outfit.shoes.id}`;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function filterCandidates<G extends Garment>(
  garments: readonly G[],
  filters: OutfitFilters,
  constraints: WeatherConstraints,
): { ok: true; candidates: Candidates<G> } | { ok: false; reason: BlockReason } {
  const candidates = {} as Candidates<G>;

  for (const category of CATEGORIES) {
    let pool = garments.filter((garment) => garment.category === category);
    if (pool.length === 0) {
      return { ok: false, reason: { kind: "missing_category", category } };
    }

    const minWarmth = constraints.minWarmth[category] ?? 1;
    const mustBeRainProof = constraints.rainProof.includes(category);
    const steps: [BlockingFilter, (garment: G) => boolean][] = [
      ["season", (g) => g.seasons.length === 0 || g.seasons.includes(filters.season)],
      ["occasion", (g) => !filters.occasionId || g.occasionIds.includes(filters.occasionId)],
      ["warmth", (g) => g.warmth >= minWarmth],
      ["rain", (g) => !mustBeRainProof || g.rainOk],
    ];

    for (const [filter, keep] of steps) {
      pool = pool.filter(keep);
      if (pool.length === 0) {
        return { ok: false, reason: { kind: "filter", category, filter } };
      }
    }
    candidates[category] = pool;
  }

  return { ok: true, candidates };
}

/**
 * Narrows each category to its preferred warmth level (hot days). Returns null
 * when no preference applies; `relaxed` when a category had no preferred piece.
 */
function applyPreferences<G extends Garment>(
  candidates: Candidates<G>,
  constraints: WeatherConstraints,
): { candidates: Candidates<G>; relaxed: boolean } | null {
  const preferences = Object.entries(constraints.preferredWarmth) as [Category, number][];
  if (preferences.length === 0) return null;

  let relaxed = false;
  const narrowed = { ...candidates };
  for (const [category, level] of preferences) {
    const preferred = candidates[category].filter((garment) => garment.warmth === level);
    if (preferred.length > 0) {
      narrowed[category] = preferred;
    } else {
      relaxed = true;
    }
  }
  return { candidates: narrowed, relaxed };
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function toExclusions(rules: OutfitRules): Exclusions {
  return {
    garmentPairs: new Set(rules.garmentExclusions.map(({ garmentIds: [a, b] }) => pairKey(a, b))),
    colorPairs: new Set(rules.colorExclusions.map(({ colors: [a, b] }) => pairKey(a, b))),
  };
}

/** Two pieces can be worn together unless a garment rule or a colour rule says otherwise. */
function compatible(a: Garment, b: Garment, { garmentPairs, colorPairs }: Exclusions): boolean {
  if (garmentPairs.has(pairKey(a.id, b.id))) return false;
  for (const colorA of a.colors) {
    for (const colorB of b.colors) {
      if (colorPairs.has(pairKey(colorA, colorB))) return false;
    }
  }
  return true;
}

function validOutfits<G extends Garment>(candidates: Candidates<G>, exclusions: Exclusions): Outfit<G>[] {
  const outfits: Outfit<G>[] = [];
  for (const top of candidates.top) {
    const shoesForTop = candidates.shoes.filter((shoes) => compatible(top, shoes, exclusions));
    for (const bottom of candidates.bottom) {
      if (!compatible(top, bottom, exclusions)) continue;
      for (const shoes of shoesForTop) {
        if (compatible(bottom, shoes, exclusions)) {
          outfits.push({ top, bottom, shoes });
        }
      }
    }
  }
  return outfits;
}

/** Which kind of rule makes the combinations impossible, to tell the user where to look. */
function blockingRules<G extends Garment>(
  candidates: Candidates<G>,
  exclusions: Exclusions,
): "garments" | "colors" | "combined" {
  const garmentRulesOnly = validOutfits(candidates, { ...exclusions, colorPairs: NO_PAIRS }).length;
  const colorRulesOnly = validOutfits(candidates, { ...exclusions, garmentPairs: NO_PAIRS }).length;
  if (garmentRulesOnly === 0 && colorRulesOnly > 0) return "garments";
  if (colorRulesOnly === 0 && garmentRulesOnly > 0) return "colors";
  return "combined";
}

// ---------------------------------------------------------------------------
// Random draw
// ---------------------------------------------------------------------------

/** Sharing a piece with another outfit of the draw costs more than with the outfit being replaced. */
const OTHER_OUTFIT_WEIGHT = 10;

function clampCount(count: number): number {
  if (!Number.isFinite(count)) return MIN_OUTFITS;
  return Math.min(MAX_OUTFITS, Math.max(MIN_OUTFITS, Math.trunc(count)));
}

function pieces(outfit: Outfit): string[] {
  return [outfit.top.id, outfit.bottom.id, outfit.shoes.id];
}

function addPieces(weights: Map<string, number>, outfits: readonly Outfit[], weight: number) {
  for (const outfit of outfits) {
    for (const id of pieces(outfit)) {
      weights.set(id, (weights.get(id) ?? 0) + weight);
    }
  }
}

/** Fisher–Yates on a copy. */
function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Greedy draw: shuffles the valid outfits, then repeatedly takes the first one
 * with the lowest overlap cost. Ties are broken by the shuffle, so the draw
 * stays uniform among equally good outfits.
 */
function drawOutfits<G extends Garment>(
  outfits: readonly Outfit<G>[],
  count: number,
  random: Random,
  excluded: readonly Outfit<G>[] = [],
  initialWeights: ReadonlyMap<string, number> = new Map(),
): Outfit<G>[] {
  const shuffled = shuffle(outfits, random);
  const used = new Set(excluded.map(outfitKey));
  const weights = new Map(initialWeights);
  const drawn: Outfit<G>[] = [];

  while (drawn.length < count) {
    let best: Outfit<G> | null = null;
    let bestCost = Infinity;
    for (const outfit of shuffled) {
      if (used.has(outfitKey(outfit))) continue;
      const cost = pieces(outfit).reduce((sum, id) => sum + (weights.get(id) ?? 0), 0);
      if (cost < bestCost) {
        best = outfit;
        bestCost = cost;
        if (cost === 0) break;
      }
    }
    if (!best) break;

    drawn.push(best);
    used.add(outfitKey(best));
    addPieces(weights, [best], OTHER_OUTFIT_WEIGHT);
  }

  return drawn;
}
