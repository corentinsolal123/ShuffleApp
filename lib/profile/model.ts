import type { Coordinates } from "@/lib/weather";

export type City = Coordinates & { name: string };

export type Profile = {
  /** Weather fallback when the device location is unavailable. */
  defaultCity: City | null;
};
