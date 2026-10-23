import type { Forecast } from "@/lib/weather";

const DATE = "2026-10-23";
const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Open-Meteo-like forecast for one day. `feelsLike` and `rainMm` give the
 * value for an hour (rain is split evenly into the four quarter-hours).
 */
export function forecast({
  feelsLike = () => 15,
  temperature = (hour: number) => feelsLike(hour) + 1,
  rainMm = () => 0,
  weatherCode = () => 2,
  withQuarterHours = true,
}: {
  feelsLike?: (hour: number) => number;
  temperature?: (hour: number) => number;
  rainMm?: (hour: number) => number;
  weatherCode?: (hour: number) => number;
  withQuarterHours?: boolean;
} = {}): Forecast {
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const quarters = hours.flatMap((hour) => [0, 15, 30, 45].map((minute) => ({ hour, minute })));
  return {
    hourly: {
      time: hours.map((hour) => `${DATE}T${pad(hour)}:00`),
      temperature_2m: hours.map(temperature),
      apparent_temperature: hours.map(feelsLike),
      precipitation: hours.map(rainMm),
      precipitation_probability: hours.map((hour) => (rainMm(hour) > 0 ? 80 : 0)),
      weather_code: hours.map(weatherCode),
    },
    ...(withQuarterHours && {
      minutely_15: {
        time: quarters.map(({ hour, minute }) => `${DATE}T${pad(hour)}:${pad(minute)}`),
        precipitation: quarters.map(({ hour }) => rainMm(hour) / 4),
      },
    }),
  };
}
