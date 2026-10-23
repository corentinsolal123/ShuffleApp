import { describe, expect, it } from "vitest";
import type { GarmentWithPhoto } from "@/lib/garments/model";
import { exclusionsForGarment, normalizePair, pairKey } from "@/lib/rules/model";

const garment = (id: string, category: GarmentWithPhoto["category"] = "top"): GarmentWithPhoto => ({
  id,
  name: id,
  category,
  colors: ["black"],
  seasons: [],
  occasionIds: ["o"],
  warmth: 2,
  rainOk: false,
  photoPath: `u/${id}.webp`,
  photoUrl: null,
});

describe("normalizePair", () => {
  it("orders the pair like the database does", () => {
    expect(normalizePair("brown", "black")).toEqual(["black", "brown"]);
    expect(normalizePair("black", "brown")).toEqual(["black", "brown"]);
  });

  it("keeps a pair of identical values", () => {
    expect(normalizePair("black", "black")).toEqual(["black", "black"]);
  });
});

describe("pairKey", () => {
  it("is the same whatever the order", () => {
    expect(pairKey("a", "b")).toBe(pairKey("b", "a"));
    expect(pairKey("a", "b")).not.toBe(pairKey("a", "c"));
  });
});

describe("exclusionsForGarment", () => {
  const garments = [garment("shirt"), garment("jeans", "bottom"), garment("boots", "shoes"), garment("chinos", "bottom")];
  const exclusions = [
    { id: "r1", garmentIds: ["jeans", "shirt"] as const },
    { id: "r2", garmentIds: ["boots", "shirt"] as const },
    { id: "r3", garmentIds: ["boots", "chinos"] as const },
    { id: "r4", garmentIds: ["deleted", "shirt"] as const },
  ];

  it("returns the other garment of every rule involving the garment, on either side", () => {
    const result = exclusionsForGarment("shirt", exclusions, garments);
    expect(result.map(({ ruleId, garment }) => [ruleId, garment.id])).toEqual([
      ["r1", "jeans"],
      ["r2", "boots"],
    ]);
  });

  it("returns nothing for a garment without rules", () => {
    expect(exclusionsForGarment("unknown", exclusions, garments)).toEqual([]);
  });
});
