import { describe, expect, it, vi } from "vitest";
import { GeocodingError, geocodingUrl, searchCities } from "@/lib/geocoding";
import { occasionUsage } from "@/lib/occasions/model";

describe("geocoding", () => {
  it("searches in French and caps the number of results", () => {
    const url = new URL(geocodingUrl("  Lyon "));
    expect(url.origin + url.pathname).toBe("https://geocoding-api.open-meteo.com/v1/search");
    expect(url.searchParams.get("name")).toBe("Lyon");
    expect(url.searchParams.get("language")).toBe("fr");
    expect(Number(url.searchParams.get("count"))).toBeLessThanOrEqual(10);
  });

  it("maps results to cities with a readable region", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({
        results: [
          { id: 1, name: "Lyon", latitude: 45.75, longitude: 4.85, admin1: "Auvergne-Rhône-Alpes", country: "France" },
          { id: 2, name: "Lyons", latitude: 43.6, longitude: -96.5 },
        ],
      }),
    );

    expect(await searchCities("Lyon", fetchFn)).toEqual([
      { id: 1, name: "Lyon", latitude: 45.75, longitude: 4.85, region: "Auvergne-Rhône-Alpes, France" },
      { id: 2, name: "Lyons", latitude: 43.6, longitude: -96.5, region: "" },
    ]);
  });

  it("returns no result for a missing list or a too short query", async () => {
    const fetchFn = vi.fn(async () => Response.json({ generationtime_ms: 0.4 }));
    expect(await searchCities("Xyzzy", fetchFn)).toEqual([]);
    expect(await searchCities("L", fetchFn)).toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("reports network and HTTP failures", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(searchCities("Lyon", offline)).rejects.toBeInstanceOf(GeocodingError);
    await expect(searchCities("Lyon", vi.fn(async () => new Response(null, { status: 500 })))).rejects.toThrow(
      "ne répond pas",
    );
  });
});

describe("occasionUsage", () => {
  const occasions = [
    { id: "daily", name: "Quotidien" },
    { id: "work", name: "Travail" },
    { id: "party", name: "Soirée" },
  ];

  it("counts garments per occasion and those having it as their only occasion", () => {
    const links = [
      { garment_id: "shirt", occasion_id: "work" },
      { garment_id: "jeans", occasion_id: "daily" },
      { garment_id: "jeans", occasion_id: "work" },
      { garment_id: "boots", occasion_id: "work" },
    ];

    expect(occasionUsage(occasions, links)).toEqual([
      { id: "daily", name: "Quotidien", garmentCount: 1, soleGarmentCount: 0 },
      { id: "work", name: "Travail", garmentCount: 3, soleGarmentCount: 2 },
      { id: "party", name: "Soirée", garmentCount: 0, soleGarmentCount: 0 },
    ]);
  });
});
