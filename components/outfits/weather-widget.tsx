"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { WEATHER_SUMMARY_CONFIG, formatDegrees, weatherLabel, type DayWeather } from "@/lib/weather";
import { cn } from "@/lib/utils";
import type { WeatherState } from "./use-day-weather";

/** One-line weather summary; tapping it opens the full day, hour by hour. */
export function WeatherWidget({ state, onRetry }: { state: WeatherState; onRetry: () => void }) {
  if (state.status === "off") {
    return <WidgetFrame>Météo non prise en compte.</WidgetFrame>;
  }
  if (state.status === "loading") {
    return (
      <WidgetFrame>
        <span role="status" className="animate-pulse">
          Météo du jour…
        </span>
      </WidgetFrame>
    );
  }
  if (state.status !== "ready") {
    return (
      <WidgetFrame className="justify-between">
        <span role="alert">{state.message}</span>
        {state.status === "error" && (
          <Button variant="link" size="sm" className="px-0" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </WidgetFrame>
    );
  }

  const { weather, place } = state;
  return (
    <Drawer>
      <DrawerTrigger
        aria-label={`Météo : ${summaryText(weather)}. Voir le détail de la journée`}
        className="flex min-h-14 w-full cursor-pointer items-center gap-4 border px-4 py-2 text-left active:bg-muted"
      >
        <span className="font-display text-3xl tabular-nums">{formatDegrees(weather.feelsLike)}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">{conditionsText(weather)}</span>
          <span className="truncate text-xs text-muted-foreground">
            Ressenti {WEATHER_SUMMARY_CONFIG.startHour} h – {WEATHER_SUMMARY_CONFIG.endHour} h · {place}
          </span>
        </span>
        <span aria-hidden className="label-caps text-muted-foreground">
          Détail
        </span>
      </DrawerTrigger>
      <DrawerContent title="Météo du jour">
        <HourlyTable weather={weather} />
      </DrawerContent>
    </Drawer>
  );
}

const MENTIONS_RAIN = /pluie|averse|bruine|orage/i;

/** "Couvert · pluie prévue", without repeating rain when the label already says it. */
function conditionsText(weather: DayWeather): string {
  const label = weatherLabel(weather.weatherCode);
  return weather.rain && !MENTIONS_RAIN.test(label) ? `${label} · pluie prévue` : label;
}

function summaryText(weather: DayWeather): string {
  return `${formatDegrees(weather.feelsLike)} ressentis, ${conditionsText(weather).toLowerCase()}`;
}

function WidgetFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-h-14 items-center gap-4 border px-4 py-2 text-sm text-muted-foreground", className)}>
      {children}
    </div>
  );
}

function HourlyTable({ weather }: { weather: DayWeather }) {
  const { startHour, endHour } = WEATHER_SUMMARY_CONFIG;
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Ressenti" value={formatDegrees(weather.feelsLike)} />
        <Stat label="Min / max" value={`${formatDegrees(weather.temperatureMin)} / ${formatDegrees(weather.temperatureMax)}`} />
        <Stat label="Pluie" value={weather.rain ? `${weather.rainySlots * 15} min` : "Non"} />
      </dl>
      <p className="text-xs text-muted-foreground">
        Les tenues tiennent compte de {startHour} h à {endHour} h. Pluie : au moins un quart d&apos;heure de pluie
        significative.
      </p>
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">Prévisions heure par heure</caption>
        <thead>
          <tr className="border-b text-left label-caps text-muted-foreground">
            <th scope="col" className="py-2 font-medium">
              Heure
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Temp.
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Ressenti
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Pluie
            </th>
          </tr>
        </thead>
        <tbody>
          {weather.hourly.map((hour) => {
            const inWindow = hour.hour >= startHour && hour.hour < endHour;
            return (
              <tr key={hour.time} className={cn("border-b", !inWindow && "text-muted-foreground")}>
                <th scope="row" className="py-2 text-left font-normal">
                  {hour.time}
                </th>
                <td className="py-2 text-right">{formatDegrees(hour.temperature)}</td>
                <td className="py-2 text-right">{formatDegrees(hour.feelsLike)}</td>
                <td className="py-2 text-right">{formatRain(hour.precipitation, hour.precipitationProbability)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const MILLIMETRES = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function formatRain(precipitation: number | null, probability: number | null): string {
  const parts = [
    precipitation && precipitation > 0 ? `${MILLIMETRES.format(precipitation)} mm` : null,
    probability != null && probability > 0 ? `${probability} %` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "–";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border py-3">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="text-lg tabular-nums">{value}</dd>
    </div>
  );
}
