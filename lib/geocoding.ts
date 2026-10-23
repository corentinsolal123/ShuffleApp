/** City search through the Open-Meteo geocoding API (free, no key). */
import { z } from "zod";
import type { City } from "@/lib/profile/model";

const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const MAX_RESULTS = 6;

const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

export type CityResult = City & { id: number; /** "Auvergne-Rhône-Alpes, France" */ region: string };

export class GeocodingError extends Error {}

export function geocodingUrl(query: string): string {
  const params = new URLSearchParams({
    name: query.trim(),
    count: String(MAX_RESULTS),
    language: "fr",
    format: "json",
  });
  return `${GEOCODING_ENDPOINT}?${params}`;
}

export async function searchCities(query: string, fetchFn: typeof fetch = fetch): Promise<CityResult[]> {
  if (query.trim().length < 2) return [];

  let response: Response;
  try {
    response = await fetchFn(geocodingUrl(query));
  } catch {
    throw new GeocodingError("Recherche impossible. Vérifiez la connexion.");
  }
  if (!response.ok) {
    throw new GeocodingError("Le service de recherche ne répond pas. Réessayez plus tard.");
  }

  const parsed = geocodingSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new GeocodingError("Réponse inattendue du service de recherche.");
  }
  return (parsed.data.results ?? []).map((result) => ({
    id: result.id,
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    region: [result.admin1, result.country].filter(Boolean).join(", "),
  }));
}
