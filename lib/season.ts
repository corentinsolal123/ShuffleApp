import type { Season } from "@/lib/garments/model";

// Meteorological seasons (northern hemisphere), indexed by month 0-11.
const SEASON_BY_MONTH: readonly Season[] = [
  "winter", "winter",
  "spring", "spring", "spring",
  "summer", "summer", "summer",
  "autumn", "autumn", "autumn",
  "winter",
];

/** Default season filter for a given day. */
export function seasonForDate(date: Date): Season {
  return SEASON_BY_MONTH[date.getMonth()] ?? "winter";
}
