import { describe, expect, it } from "vitest";
import type { Garment } from "@/lib/garments/model";
import {
  analyzeOutfits,
  generateOutfits,
  outfitKey,
  rerollOutfit,
  type EngineInput,
  type Outfit,
  type OutfitFilters,
  type OutfitRules,
} from "@/lib/outfit-engine";
import { pairKey } from "@/lib/rules/model";
import { DEFAULT_WEATHER_RULES, weatherConstraints } from "@/lib/weather-rules";
import { NO_RULES, OCCASION, bottom, outerwear, seededRandom, shoes, top } from "./helpers/fixtures";

/** Mild enough for no outerwear, so the core tests are not about it. */
const MILD: OutfitFilters = { season: "spring", weather: { feelsLike: 18, rain: false } };

function input(garments: Garment[], filters: Partial<OutfitFilters> = {}, rules: OutfitRules = NO_RULES): EngineInput {
  return { garments, rules, filters: { ...MILD, ...filters } };
}

function ids(outfit: Outfit) {
  return [outfit.top.id, outfit.bottom.id, outfit.shoes.id];
}

function allOutfitKeys(engineInput: EngineInput): string[] {
  const analysis = analyzeOutfits(engineInput);
  return analysis.ok ? analysis.outfits.map(outfitKey).sort() : [];
}

const basicWardrobe = [top("t1"), top("t2"), bottom("b1"), bottom("b2"), shoes("s1"), shoes("s2")];

describe("generateOutfits — basics", () => {
  it("builds outfits made of one top, one bottom and one pair of shoes", () => {
    const result = generateOutfits(input(basicWardrobe), 2, seededRandom(1));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outfits).toHaveLength(2);
    for (const outfit of result.outfits) {
      expect([outfit.top.category, outfit.bottom.category, outfit.shoes.category]).toEqual(["top", "bottom", "shoes"]);
    }
  });

  it("is reproducible with the same random source", () => {
    const a = generateOutfits(input(basicWardrobe), 3, seededRandom(42));
    const b = generateOutfits(input(basicWardrobe), 3, seededRandom(42));
    expect(a).toEqual(b);
  });

  it("clamps the requested count between 1 and 3", () => {
    const wardrobe = [...basicWardrobe, top("t3"), bottom("b3"), shoes("s3"), top("t4"), bottom("b4"), shoes("s4")];
    const many = generateOutfits(input(wardrobe), 10, seededRandom(1));
    const none = generateOutfits(input(wardrobe), 0, seededRandom(1));

    expect(many.ok && many.outfits).toHaveLength(3);
    expect(none.ok && none.outfits).toHaveLength(1);
    expect(generateOutfits(input(wardrobe), Number.NaN).ok && generateOutfits(input(wardrobe), Number.NaN)).toMatchObject({
      outfits: [expect.anything()],
    });
  });

  it("returns the outfits with the caller's garment objects (e.g. with photo URLs)", () => {
    const withPhotos = basicWardrobe.map((g) => ({ ...g, photoUrl: `https://cdn/${g.id}` }));
    const result = generateOutfits({ garments: withPhotos, rules: NO_RULES, filters: MILD }, 1, seededRandom(3));

    expect(result.ok && result.outfits[0]!.top.photoUrl).toMatch(/^https:\/\/cdn\//);
  });
});

describe("generateOutfits — distinct outfits", () => {
  it("never shares a piece when the wardrobe allows it", () => {
    const wardrobe = [top("t1"), top("t2"), top("t3"), bottom("b1"), bottom("b2"), bottom("b3"), shoes("s1"), shoes("s2"), shoes("s3")];

    for (let seed = 0; seed < 50; seed++) {
      const result = generateOutfits(input(wardrobe), 3, seededRandom(seed));
      if (!result.ok) throw new Error("expected outfits");
      const allPieces = result.outfits.flatMap(ids);
      expect(new Set(allPieces).size).toBe(9);
    }
  });

  it("shares as few pieces as possible otherwise, and outfits stay distinct", () => {
    // Only 2 tops: one top must be reused, but bottoms and shoes can all differ.
    const wardrobe = [top("t1"), top("t2"), bottom("b1"), bottom("b2"), bottom("b3"), shoes("s1"), shoes("s2"), shoes("s3")];

    for (let seed = 0; seed < 50; seed++) {
      const result = generateOutfits(input(wardrobe), 3, seededRandom(seed));
      if (!result.ok) throw new Error("expected outfits");
      expect(new Set(result.outfits.map(outfitKey)).size).toBe(3);
      expect(new Set(result.outfits.map((o) => o.bottom.id)).size).toBe(3);
      expect(new Set(result.outfits.map((o) => o.shoes.id)).size).toBe(3);
      expect(new Set(result.outfits.map((o) => o.top.id)).size).toBe(2);
    }
  });

  it("returns fewer outfits with a note when not enough combinations exist", () => {
    const wardrobe = [top("t1"), bottom("b1"), bottom("b2"), shoes("s1")];
    const result = generateOutfits(input(wardrobe), 3, seededRandom(1));

    expect(result).toMatchObject({
      ok: true,
      notes: [{ kind: "fewer_than_requested", requested: 3, available: 2 }],
    });
    if (result.ok) expect(new Set(result.outfits.map(outfitKey)).size).toBe(2);
  });

  it("draws every valid combination over many runs (no combination is starved)", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const result = generateOutfits(input(basicWardrobe), 1, seededRandom(seed));
      if (result.ok) seen.add(outfitKey(result.outfits[0]!));
    }
    expect(seen.size).toBe(8);
  });
});

describe("filters", () => {
  it("keeps garments of the selected season, and season-less garments for every season", () => {
    const wardrobe = [
      top("summer-top", { seasons: ["summer"] }),
      top("winter-top", { seasons: ["winter", "autumn"] }),
      top("any-top", { seasons: [] }),
      bottom("b"),
      shoes("s"),
    ];
    const tops = (season: OutfitFilters["season"]) =>
      new Set(allOutfitKeys(input(wardrobe, { season })).map((key) => key.split("|")[0]));

    expect(tops("winter")).toEqual(new Set(["winter-top", "any-top"]));
    expect(tops("summer")).toEqual(new Set(["summer-top", "any-top"]));
  });

  it("keeps only garments tagged with the chosen occasion", () => {
    const wardrobe = [
      top("office-shirt", { occasionIds: [OCCASION.work] }),
      top("tee", { occasionIds: [OCCASION.daily] }),
      bottom("b", { occasionIds: [OCCASION.work, OCCASION.daily] }),
      shoes("s", { occasionIds: [OCCASION.work, OCCASION.daily] }),
    ];

    expect(allOutfitKeys(input(wardrobe, { occasionId: OCCASION.work }))).toEqual(["office-shirt|b|s"]);
    expect(allOutfitKeys(input(wardrobe, { occasionId: null }))).toHaveLength(2);
  });

  it("ignores the weather when it is not provided", () => {
    const wardrobe = [top("light", { warmth: 1 }), bottom("b", { warmth: 1 }), shoes("s", { rainOk: false })];
    expect(allOutfitKeys(input(wardrobe, { weather: null }))).toEqual(["light|b|s"]);
  });
});

describe("weather", () => {
  const layered = [
    top("t-light", { warmth: 1 }),
    top("t-mid", { warmth: 2 }),
    top("t-warm", { warmth: 3 }),
    bottom("b-light", { warmth: 1 }),
    bottom("b-mid", { warmth: 2 }),
    bottom("b-warm", { warmth: 3 }),
    shoes("s-dry", { rainOk: false }),
    shoes("s-rain", { rainOk: true }),
  ];
  const piecesAt = (feelsLike: number, rain = false) => {
    const keys = allOutfitKeys(input(layered, { weather: { feelsLike, rain } }));
    return {
      tops: new Set(keys.map((k) => k.split("|")[0])),
      bottoms: new Set(keys.map((k) => k.split("|")[1])),
      shoes: new Set(keys.map((k) => k.split("|")[2])),
    };
  };

  it("allows every warmth level on a mild day (10 °C to 22 °C included)", () => {
    for (const feelsLike of [10, 15, 22]) {
      const { tops, bottoms } = piecesAt(feelsLike);
      expect(tops.size).toBe(3);
      expect(bottoms.size).toBe(3);
    }
  });

  it("requires warmth ≥ 2 for top and bottom below 10 °C", () => {
    const { tops, bottoms } = piecesAt(9.9);
    expect(tops).toEqual(new Set(["t-mid", "t-warm"]));
    expect(bottoms).toEqual(new Set(["b-mid", "b-warm"]));
  });

  it("requires a warmth-3 top below 3 °C (bottom still ≥ 2)", () => {
    const at3 = piecesAt(3);
    expect(at3.tops).toEqual(new Set(["t-mid", "t-warm"]));

    const freezing = piecesAt(-2);
    expect(freezing.tops).toEqual(new Set(["t-warm"]));
    expect(freezing.bottoms).toEqual(new Set(["b-mid", "b-warm"]));
  });

  it("prefers light pieces above 22 °C", () => {
    const { tops, bottoms } = piecesAt(25);
    expect(tops).toEqual(new Set(["t-light"]));
    expect(bottoms).toEqual(new Set(["b-light"]));
    expect(analyzeOutfits(input(layered, { weather: { feelsLike: 25, rain: false } }))).toMatchObject({ notes: [] });
  });

  it("falls back to other levels with a note when no light outfit is possible", () => {
    const rules: OutfitRules = {
      garmentExclusions: [{ id: "r", garmentIds: ["b-light", "t-light"] }],
      colorExclusions: [],
    };
    const analysis = analyzeOutfits(input(layered, { weather: { feelsLike: 28, rain: false } }, rules));

    expect(analysis).toMatchObject({ ok: true, notes: [{ kind: "light_preference_relaxed" }] });
    if (analysis.ok) expect(analysis.outfits.length).toBeGreaterThan(0);
  });

  it("keeps light pieces where they exist when one category has none", () => {
    const wardrobe = [top("t-light", { warmth: 1 }), top("t-warm", { warmth: 3 }), bottom("b-mid", { warmth: 2 }), shoes("s")];
    const analysis = analyzeOutfits(input(wardrobe, { weather: { feelsLike: 30, rain: false } }));

    expect(analysis).toMatchObject({ ok: true, notes: [{ kind: "light_preference_relaxed" }] });
    if (analysis.ok) expect(analysis.outfits.map(outfitKey)).toEqual(["t-light|b-mid|s"]);
  });

  it("only allows rain-proof shoes when rain is expected", () => {
    expect(piecesAt(15, true).shoes).toEqual(new Set(["s-rain"]));
    expect(piecesAt(15, false).shoes).toEqual(new Set(["s-dry", "s-rain"]));
  });

  it("does not require rain-proof tops or bottoms by default", () => {
    const wardrobe = [top("t", { rainOk: false }), bottom("b", { rainOk: false }), shoes("s", { rainOk: true })];
    expect(allOutfitKeys(input(wardrobe, { weather: { feelsLike: 15, rain: true } }))).toEqual(["t|b|s"]);
  });

  it("accepts custom weather rules", () => {
    const strict = { ...DEFAULT_WEATHER_RULES, rainProofCategories: ["shoes", "top"] as const };
    const wardrobe = [top("t", { rainOk: false }), bottom("b"), shoes("s")];
    const analysis = analyzeOutfits({
      ...input(wardrobe, { weather: { feelsLike: 15, rain: true } }),
      weatherRules: strict,
    });
    expect(analysis).toEqual({ ok: false, reason: { kind: "filter", category: "top", filter: "rain" } });
  });
});

describe("weatherConstraints", () => {
  it("returns no constraint without weather", () => {
    expect(weatherConstraints(null)).toEqual({ minWarmth: {}, preferredWarmth: {}, rainProof: [], outerwear: null });
  });

  it("picks the coldest matching rule whatever the configuration order", () => {
    const config = { ...DEFAULT_WEATHER_RULES, cold: [...DEFAULT_WEATHER_RULES.cold].reverse() };
    expect(weatherConstraints({ feelsLike: 0, rain: false }, config).minWarmth).toEqual({ top: 3, bottom: 2 });
  });
});

describe("outerwear", () => {
  // Warm enough not to be filtered out on the coldest days.
  const core = [top("t", { warmth: 3 }), bottom("b"), shoes("s")];
  const coats = [
    outerwear("o-light", { warmth: 1 }),
    outerwear("o-mid", { warmth: 2 }),
    outerwear("o-warm", { warmth: 3 }),
  ];
  const at = (feelsLike: number, rain = false) => ({ weather: { feelsLike, rain } });
  const coatsAt = (feelsLike: number, rain = false, wardrobe = [...core, ...coats]) => {
    const analysis = analyzeOutfits(input(wardrobe, at(feelsLike, rain)));
    return analysis.ok ? new Set(analysis.outfits.map((outfit) => outfit.outerwear?.id ?? null)) : null;
  };

  it("adds no outerwear from 17 °C without rain, nor without weather", () => {
    expect(coatsAt(17)).toEqual(new Set([null]));
    expect(coatsAt(25)).toEqual(new Set([null]));
    expect(allOutfitKeys(input([...core, ...coats], { weather: null }))).toEqual(["t|b|s"]);
  });

  it("picks the outerwear warmth from the temperature", () => {
    expect(coatsAt(16.9)).toEqual(new Set(["o-light", "o-mid"]));
    expect(coatsAt(10)).toEqual(new Set(["o-light", "o-mid"]));
    expect(coatsAt(9.9)).toEqual(new Set(["o-mid", "o-warm"]));
    expect(coatsAt(2.9)).toEqual(new Set(["o-warm"]));
  });

  it("adds the outerwear to every outfit and to its key", () => {
    const result = generateOutfits(input([...core, ...coats], at(0)), 1, seededRandom(1));
    expect(result).toMatchObject({ ok: true, notes: [], outfits: [{ outerwear: { id: "o-warm" } }] });
    if (result.ok) expect(outfitKey(result.outfits[0]!)).toBe("t|b|s|o-warm");
  });

  it("requires rain-proof outerwear when rain is expected", () => {
    const wardrobe = [...core, outerwear("o-dry", { rainOk: false }), outerwear("o-rain", { rainOk: true })];
    expect(coatsAt(12, true, wardrobe)).toEqual(new Set(["o-rain"]));
  });

  it("adds a light or medium rain-proof outerwear on a mild rainy day", () => {
    const wardrobe = [...core, ...coats, outerwear("o-dry", { warmth: 1, rainOk: false })];
    expect(coatsAt(20, true, wardrobe)).toEqual(new Set(["o-light", "o-mid"]));
    expect(coatsAt(30, true, wardrobe)).toEqual(new Set(["o-light", "o-mid"]));
  });

  it("applies the season, occasion and exclusion rules to the outerwear", () => {
    const wardrobe = [
      ...core,
      outerwear("o-summer", { seasons: ["summer"] }),
      outerwear("o-work", { occasionIds: [OCCASION.work] }),
      outerwear("o-ok"),
      outerwear("o-red", { colors: ["red"] }),
    ];
    const rules: OutfitRules = { garmentExclusions: [], colorExclusions: [{ id: "c", colors: ["grey", "red"] }] };
    const analysis = analyzeOutfits(input(wardrobe, { ...at(12), occasionId: OCCASION.daily }, rules));
    expect(analysis.ok && analysis.outfits.map(outfitKey)).toEqual(["t|b|s|o-ok"]);
  });

  it("keeps the outfits without outerwear, with a note, when none fits", () => {
    const note = (wardrobe: Garment[], feelsLike: number, rules: OutfitRules = NO_RULES) => {
      const analysis = analyzeOutfits(input(wardrobe, at(feelsLike), rules));
      expect(analysis.ok && analysis.outfits.map(outfitKey)).toEqual(["t|b|s"]);
      return analysis.ok ? analysis.notes : null;
    };

    expect(note(core, 5)).toEqual([{ kind: "outerwear_skipped", cause: "missing" }]);
    expect(note([...core, outerwear("o-light", { warmth: 1 })], 0)).toEqual([
      { kind: "outerwear_skipped", cause: "warmth" },
    ]);
    expect(
      note([...core, outerwear("o")], 12, { garmentExclusions: [{ id: "g", garmentIds: ["o", "t"] }], colorExclusions: [] }),
    ).toEqual([{ kind: "outerwear_skipped", cause: "rules" }]);
  });

  it("never blocks an outfit because of a missing outerwear category", () => {
    expect(analyzeOutfits(input(core, at(-5))).ok).toBe(true);
  });
});

describe("rules", () => {
  it("never pairs two excluded garments, whatever the stored order", () => {
    const rules: OutfitRules = {
      garmentExclusions: [
        { id: "r1", garmentIds: ["b1", "t1"] },
        { id: "r2", garmentIds: ["s2", "t2"] },
      ],
      colorExclusions: [],
    };
    const keys = allOutfitKeys(input(basicWardrobe, {}, rules));

    expect(keys).not.toContainEqual(expect.stringMatching(/^t1\|b1\|/));
    expect(keys).not.toContainEqual(expect.stringMatching(/^t2\|.*\|s2$/));
    expect(keys).toHaveLength(8 - 2 - 2);
  });

  it("applies colour rules between any two pieces of the outfit, across all their colours", () => {
    const wardrobe = [
      top("black-white-top", { colors: ["black", "white"] }),
      top("navy-top", { colors: ["navy"] }),
      bottom("beige-bottom", { colors: ["beige"] }),
      shoes("brown-shoes", { colors: ["brown"] }),
    ];
    const rules: OutfitRules = { garmentExclusions: [], colorExclusions: [{ id: "c", colors: ["black", "brown"] }] };

    // The black (and white) top is out because of the brown shoes, even though they are not adjacent.
    expect(allOutfitKeys(input(wardrobe, {}, rules))).toEqual(["navy-top|beige-bottom|brown-shoes"]);
  });

  it("applies a same-colour rule between two pieces, not within one piece", () => {
    const wardrobe = [
      top("black-top", { colors: ["black"] }),
      top("grey-top", { colors: ["grey", "black"] }),
      bottom("black-jeans", { colors: ["black"] }),
      bottom("blue-jeans", { colors: ["blue"] }),
      shoes("white-shoes", { colors: ["white"] }),
    ];
    const rules: OutfitRules = { garmentExclusions: [], colorExclusions: [{ id: "c", colors: ["black", "black"] }] };

    expect(allOutfitKeys(input(wardrobe, {}, rules))).toEqual([
      "black-top|blue-jeans|white-shoes",
      "grey-top|blue-jeans|white-shoes",
    ]);
  });
});

describe("diagnosis", () => {
  it("reports an empty category first", () => {
    const result = generateOutfits(input([top("t"), shoes("s")]), 1);
    expect(result).toEqual({ ok: false, reason: { kind: "missing_category", category: "bottom" } });
  });

  it.each([
    ["season", [shoes("sandals", { seasons: ["summer"] })], { season: "winter" as const }],
    ["occasion", [shoes("sneakers", { occasionIds: [OCCASION.sport] })], { occasionId: OCCASION.work }],
    ["rain", [shoes("canvas", { rainOk: false })], { weather: { feelsLike: 15, rain: true } }],
  ] as const)("names the %s filter that leaves no shoes", (filter, shoeList, filters) => {
    const wardrobe = [
      top("t", { occasionIds: [OCCASION.work, OCCASION.sport] }),
      bottom("b", { occasionIds: [OCCASION.work, OCCASION.sport] }),
      ...shoeList,
    ];
    expect(analyzeOutfits(input(wardrobe, filters))).toEqual({
      ok: false,
      reason: { kind: "filter", category: "shoes", filter },
    });
  });

  it("names the warmth filter when nothing is warm enough", () => {
    const wardrobe = [top("tee", { warmth: 1 }), bottom("b", { warmth: 3 }), shoes("s")];
    expect(analyzeOutfits(input(wardrobe, { weather: { feelsLike: 5, rain: false } }))).toEqual({
      ok: false,
      reason: { kind: "filter", category: "top", filter: "warmth" },
    });
  });

  it("reports the first blocking filter in order season → occasion → warmth → rain", () => {
    const wardrobe = [top("t"), bottom("b"), shoes("s", { seasons: ["summer"], rainOk: false })];
    const reason = analyzeOutfits(input(wardrobe, { season: "winter", weather: { feelsLike: 15, rain: true } }));
    expect(reason).toMatchObject({ reason: { filter: "season" } });
  });

  it.each([
    [
      "garments",
      { garmentExclusions: [{ id: "g", garmentIds: ["b", "t"] as const }], colorExclusions: [] },
    ],
    ["colors", { garmentExclusions: [], colorExclusions: [{ id: "c", colors: ["grey", "grey"] as const }] }],
  ] as const)("tells when %s rules block every combination", (blockedBy, rules) => {
    const wardrobe = [top("t"), bottom("b"), shoes("s")];
    expect(analyzeOutfits(input(wardrobe, {}, rules))).toEqual({ ok: false, reason: { kind: "rules", blockedBy } });
  });

  it("tells when only the combination of both rule kinds blocks", () => {
    const wardrobe = [top("t1", { colors: ["black"] }), top("t2", { colors: ["white"] }), bottom("b", { colors: ["brown"] }), shoes("s", { colors: ["white"] })];
    const rules: OutfitRules = {
      garmentExclusions: [{ id: "g", garmentIds: ["b", "t2"] }],
      colorExclusions: [{ id: "c", colors: ["black", "brown"] }],
    };
    expect(analyzeOutfits(input(wardrobe, {}, rules))).toEqual({
      ok: false,
      reason: { kind: "rules", blockedBy: "combined" },
    });
  });
});

describe("rerollOutfit", () => {
  const wardrobe = [top("t1"), top("t2"), top("t3"), bottom("b1"), bottom("b2"), bottom("b3"), shoes("s1"), shoes("s2"), shoes("s3")];

  it("replaces only the chosen outfit with a new, different one", () => {
    for (let seed = 0; seed < 30; seed++) {
      const first = generateOutfits(input(wardrobe), 3, seededRandom(seed));
      if (!first.ok) throw new Error("expected outfits");

      const rerolled = rerollOutfit(input(wardrobe), first.outfits, 1, seededRandom(seed + 1000));
      if (!rerolled.ok) throw new Error("expected a new outfit");

      expect(rerolled.outfits[0]).toBe(first.outfits[0]);
      expect(rerolled.outfits[2]).toBe(first.outfits[2]);
      const currentKeys = first.outfits.map(outfitKey);
      expect(currentKeys).not.toContain(outfitKey(rerolled.outfits[1]!));
    }
  });

  it("avoids the pieces of the other outfits first, then those of the replaced one", () => {
    // 4 of each: the only fully fresh outfit is made of the 4th pieces.
    const four = [...wardrobe, top("t4"), bottom("b4"), shoes("s4")];
    const current = [
      { top: four[0]!, bottom: four[3]!, shoes: four[6]! },
      { top: four[1]!, bottom: four[4]!, shoes: four[7]! },
      { top: four[2]!, bottom: four[5]!, shoes: four[8]! },
    ];
    for (let seed = 0; seed < 20; seed++) {
      const result = rerollOutfit(input(four), current, 0, seededRandom(seed));
      expect(result.ok && ids(result.outfits[0]!)).toEqual(["t4", "b4", "s4"]);
    }
  });

  it("says so when no other outfit exists", () => {
    const single = [top("t"), bottom("b"), shoes("s")];
    const first = generateOutfits(input(single), 1, seededRandom(1));
    if (!first.ok) throw new Error("expected an outfit");

    expect(rerollOutfit(input(single), first.outfits, 0)).toEqual({ ok: false, reason: { kind: "no_alternative" } });
  });

  it("rejects an index outside the current outfits", () => {
    const first = generateOutfits(input(wardrobe), 1, seededRandom(1));
    if (!first.ok) throw new Error("expected an outfit");
    expect(rerollOutfit(input(wardrobe), first.outfits, 5)).toEqual({ ok: false, reason: { kind: "no_alternative" } });
  });

  it("forwards the blocking reason when the filters no longer allow any outfit", () => {
    const first = generateOutfits(input(wardrobe), 1, seededRandom(1));
    if (!first.ok) throw new Error("expected an outfit");

    const result = rerollOutfit(input(wardrobe, { occasionId: "unknown" }), first.outfits, 0);
    expect(result).toEqual({ ok: false, reason: { kind: "filter", category: "top", filter: "occasion" } });
  });
});

describe("property: every proposed outfit satisfies the filters and the rules", () => {
  const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
  const COLORS = ["black", "white", "navy", "brown", "beige"] as const;

  function randomWardrobe(random: () => number): Garment[] {
    const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
    const garments: Garment[] = [];
    for (const category of ["top", "bottom", "shoes", "outerwear"] as const) {
      // Outerwear is optional: some wardrobes have none.
      const count = category === "outerwear" ? Math.floor(random() * 4) : 1 + Math.floor(random() * 6);
      for (let i = 0; i < count; i++) {
        garments.push({
          id: `${category}-${i}`,
          name: `${category}-${i}`,
          category,
          colors: [pick(COLORS), ...(random() < 0.3 ? [pick(COLORS)] : [])],
          seasons: SEASONS.filter(() => random() < 0.4),
          occasionIds: [pick([OCCASION.daily, OCCASION.work])],
          warmth: pick([1, 2, 3] as const),
          rainOk: random() < 0.5,
          photoPath: "",
        });
      }
    }
    return garments;
  }

  it("holds on 300 random wardrobes, rules and filters", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const random = seededRandom(seed);
      const garments = randomWardrobe(random);
      const byCategory = (c: Garment["category"]) => garments.filter((g) => g.category === c);
      const rules: OutfitRules = {
        garmentExclusions: Array.from({ length: Math.floor(random() * 4) }, (_, i) => ({
          id: `g${i}`,
          garmentIds: [
            byCategory("top")[Math.floor(random() * byCategory("top").length)]!.id,
            byCategory("bottom")[Math.floor(random() * byCategory("bottom").length)]!.id,
          ] as const,
        })),
        colorExclusions: random() < 0.5 ? [{ id: "c", colors: ["black", "brown"] }] : [],
      };
      const filters: OutfitFilters = {
        season: SEASONS[Math.floor(random() * 4)]!,
        occasionId: random() < 0.5 ? OCCASION.work : null,
        weather: { feelsLike: Math.round(random() * 40 - 5), rain: random() < 0.3 },
      };

      const result = generateOutfits({ garments, rules, filters }, 3, random);
      if (!result.ok) continue;

      const { minWarmth, outerwear: outerwearRange } = weatherConstraints(filters.weather);
      const excludedGarments = new Set(rules.garmentExclusions.map(({ garmentIds: [a, b] }) => pairKey(a, b)));
      const excludedColors = new Set(rules.colorExclusions.map(({ colors: [a, b] }) => pairKey(a, b)));

      expect(new Set(result.outfits.map(outfitKey)).size).toBe(result.outfits.length);
      for (const outfit of result.outfits) {
        const pieces = [outfit.top, outfit.bottom, outfit.shoes, ...(outfit.outerwear ? [outfit.outerwear] : [])];
        for (const piece of pieces) {
          expect(piece.seasons.length === 0 || piece.seasons.includes(filters.season)).toBe(true);
          if (filters.occasionId) expect(piece.occasionIds).toContain(filters.occasionId);
          expect(piece.warmth).toBeGreaterThanOrEqual(minWarmth[piece.category] ?? 1);
        }
        if (filters.weather?.rain) expect(outfit.shoes.rainOk).toBe(true);
        if (outfit.outerwear) {
          expect(outerwearRange).not.toBeNull();
          expect(outfit.outerwear.warmth).toBeGreaterThanOrEqual(outerwearRange!.minWarmth);
          expect(outfit.outerwear.warmth).toBeLessThanOrEqual(outerwearRange!.maxWarmth);
          if (filters.weather?.rain) expect(outfit.outerwear.rainOk).toBe(true);
        }
        const pairs = pieces.flatMap((a, i) => pieces.slice(i + 1).map((b) => [a, b] as const));
        for (const [a, b] of pairs) {
          expect(excludedGarments.has(pairKey(a.id, b.id))).toBe(false);
          for (const ca of a.colors) for (const cb of b.colors) expect(excludedColors.has(pairKey(ca, cb))).toBe(false);
        }
      }
    }
  });
});
