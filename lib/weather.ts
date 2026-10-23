/**
 * Day weather from Open-Meteo (free, no API key, called from the browser).
 * Raw forecasts are summarised into what the outfit engine needs.
 */
import { z } from "zod";
import type { WeatherConditions } from "@/lib/weather-rules";

export type Coordinates = { latitude: number; longitude: number };

/** How the day is summarised. Hours are local to the forecast location. */
export const WEATHER_SUMMARY_CONFIG = {
  /** Daytime window used for the feels-like mean and the rain check: [startHour, endHour). */
  startHour: 8,
  endHour: 18,
  /** A 15-minute slot counts as rainy from this amount (≈ 10 minutes of light rain). */
  rainMmPer15Min: 0.2,
} as const;

export type WeatherSummaryConfig = typeof WEATHER_SUMMARY_CONFIG;

const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

const nullableNumbers = z.array(z.number().nullable());

export const forecastSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: nullableNumbers,
    apparent_temperature: nullableNumbers,
    precipitation: nullableNumbers,
    precipitation_probability: nullableNumbers,
    weather_code: nullableNumbers,
  }),
  minutely_15: z
    .object({
      time: z.array(z.string()),
      precipitation: nullableNumbers,
    })
    .optional(),
});

export type Forecast = z.infer<typeof forecastSchema>;

export type HourlyWeather = {
  /** "08:00" */
  time: string;
  hour: number;
  temperature: number | null;
  feelsLike: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
};

export type DayWeather = {
  /** Mean feels-like temperature over the daytime window, °C. */
  feelsLike: number;
  temperatureMin: number;
  temperatureMax: number;
  rain: boolean;
  /** Number of 15-minute slots above the rain threshold during the window. */
  rainySlots: number;
  /** Most significant WMO weather code during the window. */
  weatherCode: number | null;
  /** Every hour of the day, for the detailed view. */
  hourly: HourlyWeather[];
};

export function forecastUrl({ latitude, longitude }: Coordinates): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    hourly: "temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code",
    minutely_15: "precipitation",
    timezone: "auto",
    forecast_days: "1",
  });
  return `${FORECAST_ENDPOINT}?${params}`;
}

/** "2026-10-23T08:15" → 8 (local time of the forecast, no timezone conversion). */
function hourOf(isoLocal: string): number {
  return Number(isoLocal.slice(11, 13));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isPresent(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Summarises today's forecast. Rain uses the 15-minute series when available,
 * otherwise the hourly one (an hour above the threshold counts as one slot).
 * Returns null when the daytime window has no temperature at all.
 */
export function summarizeDay(forecast: Forecast, config: WeatherSummaryConfig = WEATHER_SUMMARY_CONFIG): DayWeather | null {
  const inWindow = (time: string) => {
    const hour = hourOf(time);
    return hour >= config.startHour && hour < config.endHour;
  };

  const { hourly } = forecast;
  const hours: HourlyWeather[] = hourly.time.map((time, index) => ({
    time: time.slice(11, 16),
    hour: hourOf(time),
    temperature: hourly.temperature_2m[index] ?? null,
    feelsLike: hourly.apparent_temperature[index] ?? null,
    precipitation: hourly.precipitation[index] ?? null,
    precipitationProbability: hourly.precipitation_probability[index] ?? null,
    weatherCode: hourly.weather_code[index] ?? null,
  }));

  const daytime = hours.filter((hour) => hour.hour >= config.startHour && hour.hour < config.endHour);
  const feelsLike = daytime.map((hour) => hour.feelsLike).filter(isPresent);
  const temperatures = daytime.map((hour) => hour.temperature).filter(isPresent);
  if (feelsLike.length === 0 || temperatures.length === 0) return null;

  const quarterHours = forecast.minutely_15;
  const quarterHourRain = quarterHours
    ? quarterHours.time.flatMap((time, index) => {
        const amount = quarterHours.precipitation[index];
        return inWindow(time) && isPresent(amount) ? [amount] : [];
      })
    : [];
  const rainSeries =
    quarterHourRain.length > 0 ? quarterHourRain : daytime.map((hour) => hour.precipitation).filter(isPresent);
  const rainySlots = rainSeries.filter((amount) => amount >= config.rainMmPer15Min).length;

  const codes = daytime.map((hour) => hour.weatherCode).filter(isPresent);

  return {
    feelsLike: Math.round(mean(feelsLike) * 10) / 10,
    temperatureMin: Math.min(...temperatures),
    temperatureMax: Math.max(...temperatures),
    rain: rainySlots > 0,
    rainySlots,
    weatherCode: codes.length > 0 ? Math.max(...codes) : null,
    hourly: hours,
  };
}

export function toConditions(day: DayWeather): WeatherConditions {
  return { feelsLike: day.feelsLike, rain: day.rain };
}

export class WeatherError extends Error {}

export async function fetchDayWeather(
  coordinates: Coordinates,
  { fetchFn = fetch, signal }: { fetchFn?: typeof fetch; signal?: AbortSignal } = {},
): Promise<DayWeather> {
  let response: Response;
  try {
    response = await fetchFn(forecastUrl(coordinates), { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new WeatherError("Météo injoignable. Vérifiez la connexion.");
  }
  if (!response.ok) {
    throw new WeatherError("Le service météo ne répond pas. Réessayez plus tard.");
  }

  const parsed = forecastSchema.safeParse(await response.json().catch(() => null));
  const day = parsed.success ? summarizeDay(parsed.data) : null;
  if (!day) {
    throw new WeatherError("Prévisions météo incomplètes.");
  }
  return day;
}

// WMO weather interpretation codes, as used by Open-Meteo.
const WEATHER_LABELS: [maxCode: number, label: string][] = [
  [0, "Ensoleillé"],
  [1, "Plutôt dégagé"],
  [2, "Partiellement nuageux"],
  [3, "Couvert"],
  [48, "Brouillard"],
  [57, "Bruine"],
  [67, "Pluie"],
  [77, "Neige"],
  [82, "Averses"],
  [86, "Averses de neige"],
  [99, "Orage"],
];

export function weatherLabel(code: number | null): string {
  if (code === null) return "Conditions inconnues";
  return WEATHER_LABELS.find(([maxCode]) => code <= maxCode)?.[1] ?? "Conditions inconnues";
}

export function formatDegrees(value: number | null): string {
  return value === null ? "–" : `${Math.round(value)}°`;
}
