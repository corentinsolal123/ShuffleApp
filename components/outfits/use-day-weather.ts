"use client";

import { useEffect, useState } from "react";
import { useOnResume } from "@/components/layout/use-on-resume";
import { getDevicePosition, type GeolocationFailure } from "@/lib/geolocation";
import type { City } from "@/lib/profile/model";
import { WeatherError, fetchDayWeather, type Coordinates, type DayWeather } from "@/lib/weather";

export type WeatherState =
  | { status: "off" }
  | { status: "loading" }
  | { status: "ready"; weather: DayWeather; place: string }
  | { status: "unavailable" | "error"; message: string };

type Settled = Exclude<WeatherState, { status: "off" | "loading" }>;

const NO_LOCATION: Record<GeolocationFailure, string> = {
  denied: "Localisation refusée.",
  unavailable: "Position introuvable.",
  unsupported: "Localisation non disponible sur cet appareil.",
};

async function resolveLocation(
  fallbackCity: City | null,
): Promise<{ coordinates: Coordinates; place: string } | { failure: GeolocationFailure }> {
  try {
    return { coordinates: await getDevicePosition(), place: "Position actuelle" };
  } catch (failure) {
    if (fallbackCity) return { coordinates: fallbackCity, place: fallbackCity.name };
    return { failure: failure as GeolocationFailure };
  }
}

/**
 * Today's weather: device location first, then the default city from the
 * settings. Each (enabled, attempt) pair is one request; until it settles the
 * state reads as "loading".
 */
export function useDayWeather(enabled: boolean, fallbackCity: City | null) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ attempt: number; state: Settled } | null>(null);
  const retry = () => setAttempt((current) => current + 1);

  // Resumed the next morning: yesterday's forecast no longer applies.
  useOnResume(retry);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const settle = (state: Settled) => {
      if (!controller.signal.aborted) setSettled({ attempt, state });
    };

    void (async () => {
      const location = await resolveLocation(fallbackCity);
      if ("failure" in location) {
        settle({
          status: "unavailable",
          message: `${NO_LOCATION[location.failure]} Définissez une ville par défaut dans les réglages.`,
        });
        return;
      }
      try {
        const weather = await fetchDayWeather(location.coordinates, { signal: controller.signal });
        settle({ status: "ready", weather, place: location.place });
      } catch (error) {
        settle({
          status: "error",
          message: error instanceof WeatherError ? error.message : "Météo indisponible pour le moment.",
        });
      }
    })();

    return () => controller.abort();
  }, [enabled, attempt, fallbackCity]);

  const state: WeatherState = !enabled
    ? { status: "off" }
    : settled?.attempt === attempt
      ? settled.state
      : { status: "loading" };

  return { state, retry };
}
