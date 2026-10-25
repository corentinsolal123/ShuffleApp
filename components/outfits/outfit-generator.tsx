"use client";

import { useRef, useState } from "react";
import { useOnResume } from "@/components/layout/use-on-resume";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { ChoiceFieldset } from "@/components/ui/choice-fieldset";
import { Field, FieldLabel } from "@/components/ui/field";
import { RadioChips } from "@/components/ui/radio-chips";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { SEASONS, SEASON_LABELS, type GarmentWithPhoto, type Season } from "@/lib/garments/model";
import type { Occasion } from "@/lib/occasions/model";
import {
  MAX_OUTFITS,
  generateOutfits,
  outfitKey,
  rerollOutfit,
  type BlockReason,
  type EngineInput,
  type EngineNote,
  type Outfit,
  type OutfitRules,
} from "@/lib/outfit-engine";
import { blockReasonMessage, noteMessage } from "@/lib/outfit-messages";
import type { City } from "@/lib/profile/model";
import { seasonForDate } from "@/lib/season";
import { toConditions } from "@/lib/weather";
import { OutfitCard } from "./outfit-card";
import { useDayWeather } from "./use-day-weather";
import { WeatherWidget } from "./weather-widget";

const ANY_OCCASION = "any";

const COUNT_OPTIONS = Array.from({ length: MAX_OUTFITS }, (_, index) => ({
  value: index + 1,
  label: String(index + 1),
}));

const SEASON_OPTIONS = SEASONS.map((value) => ({ value, label: SEASON_LABELS[value] }));

type Result =
  | { kind: "outfits"; outfits: Outfit<GarmentWithPhoto>[]; notes: EngineNote[] }
  | { kind: "blocked"; reason: BlockReason };

export function OutfitGenerator({
  garments,
  rules,
  occasions,
  defaultCity,
}: {
  garments: GarmentWithPhoto[];
  rules: OutfitRules;
  occasions: Occasion[];
  defaultCity: City | null;
}) {
  const [count, setCount] = useState(MAX_OUTFITS);
  const [season, setSeason] = useState<Season>(() => seasonForDate(new Date()));
  const [occasionId, setOccasionId] = useState<string>(ANY_OCCASION);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [rerollNotice, setRerollNotice] = useState<{ index: number; message: string } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const weather = useDayWeather(weatherEnabled, defaultCity);

  // After a long absence the shown outfits hold expired photo URLs and an old forecast.
  useOnResume(() => {
    setResult(null);
    setRerollNotice(null);
    setSeason(seasonForDate(new Date()));
  });
  const day = weather.state.status === "ready" ? weather.state.weather : null;
  const waitingForWeather = weather.state.status === "loading";
  const occasion = occasions.find((candidate) => candidate.id === occasionId) ?? null;

  function engineInput(): EngineInput<GarmentWithPhoto> {
    return {
      garments,
      rules,
      filters: { season, occasionId: occasion?.id ?? null, weather: day ? toConditions(day) : null },
    };
  }

  function handleGenerate() {
    const generated = generateOutfits(engineInput(), count);
    setRerollNotice(null);
    setResult(
      generated.ok
        ? { kind: "outfits", outfits: generated.outfits, notes: generated.notes }
        : { kind: "blocked", reason: generated.reason },
    );
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
  }

  function handleReroll(index: number) {
    if (result?.kind !== "outfits") return;
    const rerolled = rerollOutfit(engineInput(), result.outfits, index);
    if (rerolled.ok) {
      setRerollNotice(null);
      setResult({ kind: "outfits", outfits: rerolled.outfits, notes: rerolled.notes });
    } else {
      setRerollNotice({ index, message: blockReasonMessage(rerolled.reason, messageContext()) });
    }
  }

  function messageContext() {
    return { season, occasionName: occasion?.name, feelsLike: day?.feelsLike };
  }

  return (
    <div className="flex flex-col gap-8">
      <WeatherWidget state={weather.state} onRetry={weather.retry} />

      <div className="flex flex-col gap-6">
        <ChoiceFieldset legend="Nombre de tenues">
          <SegmentedControl options={COUNT_OPTIONS} value={count} onValueChange={setCount} />
        </ChoiceFieldset>
        <ChoiceFieldset legend="Saison">
          <SegmentedControl options={SEASON_OPTIONS} value={season} onValueChange={setSeason} className="[&>*]:text-[0.625rem]" />
        </ChoiceFieldset>
        <ChoiceFieldset legend="Occasion">
          <RadioChips
            options={[{ value: ANY_OCCASION, label: "Toutes" }, ...occasions.map((o) => ({ value: o.id, label: o.name }))]}
            value={occasionId}
            onValueChange={setOccasionId}
          />
        </ChoiceFieldset>
        <Field className="flex-row items-center justify-between gap-4 border-y py-3">
          <FieldLabel>Tenir compte de la météo</FieldLabel>
          <Switch checked={weatherEnabled} onCheckedChange={setWeatherEnabled} />
        </Field>
      </div>

      <Button size="lg" className="h-16 text-sm" onClick={handleGenerate} disabled={waitingForWeather}>
        {waitingForWeather ? "Météo en cours…" : result ? "Générer à nouveau" : "Générer"}
      </Button>

      <div ref={resultsRef} aria-live="polite" className="scroll-mt-20">
        {result?.kind === "blocked" && (
          <div role="alert" className="flex flex-col items-start gap-4 border p-6">
            <p className="text-sm">{blockReasonMessage(result.reason, messageContext())}</p>
            <BlockedAction reason={result.reason} />
          </div>
        )}

        {result?.kind === "outfits" && (
          <div className="flex flex-col gap-4">
            {result.notes.map((note) => (
              <p key={note.kind} className="text-sm text-muted-foreground">
                {noteMessage(note, messageContext())}
              </p>
            ))}
            <ol
              className={
                result.outfits.length > 1
                  ? "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]"
                  : "flex flex-col"
              }
            >
              {result.outfits.map((outfit, index) => (
                <li
                  key={outfitKey(outfit)}
                  className={result.outfits.length > 1 ? "w-[85%] shrink-0 snap-center" : undefined}
                >
                  <OutfitCard
                    outfit={outfit}
                    label={`Tenue ${index + 1}`}
                    onReroll={() => handleReroll(index)}
                  />
                  {rerollNotice?.index === index && (
                    <p role="status" className="mt-2 text-sm text-muted-foreground">
                      {rerollNotice.message}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

/** Points to the screen where the blocking cause can be fixed. */
function BlockedAction({ reason }: { reason: BlockReason }) {
  const target =
    reason.kind === "rules"
      ? { href: "/rules", label: "Voir mes règles" }
      : { href: "/wardrobe/new", label: "Ajouter un vêtement" };
  return (
    <ButtonLink href={target.href} variant="outline" size="sm">
      {target.label}
    </ButtonLink>
  );
}
