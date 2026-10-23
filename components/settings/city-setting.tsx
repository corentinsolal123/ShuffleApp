"use client";

import { useState, type FormEvent } from "react";
import { saveDefaultCity } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GeocodingError, searchCities, type CityResult } from "@/lib/geocoding";
import type { City } from "@/lib/profile/model";

type Search =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "done"; results: CityResult[] }
  | { status: "error"; message: string };

/** Default city: weather fallback when the device location is unavailable. */
export function CitySetting({ city }: { city: City | null }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setSearch({ status: "searching" });
    try {
      setSearch({ status: "done", results: await searchCities(query) });
    } catch (cause) {
      setSearch({
        status: "error",
        message: cause instanceof GeocodingError ? cause.message : "Recherche impossible. Réessayez.",
      });
    }
  }

  async function save(next: City | null) {
    setSaving(true);
    setError(null);
    try {
      const result = await saveDefaultCity(next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQuery("");
      setSearch({ status: "idle" });
    } catch {
      setError("Enregistrement impossible. Vérifiez la connexion et réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <p className="text-sm">
          {city ? (
            <>
              <span className="sr-only">Ville par défaut : </span>
              {city.name}
            </>
          ) : (
            <span className="text-muted-foreground">Aucune ville définie.</span>
          )}
        </p>
        {city && (
          <Button variant="link" size="sm" className="px-0" onClick={() => void save(null)} disabled={saving}>
            Retirer
          </Button>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex items-end gap-2" role="search">
        <Field className="flex-1">
          <FieldLabel>{city ? "Changer de ville" : "Rechercher une ville"}</FieldLabel>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex. Bordeaux"
            autoComplete="address-level2"
            enterKeyHint="search"
          />
        </Field>
        <Button type="submit" variant="outline" disabled={query.trim().length < 2 || search.status === "searching"}>
          {search.status === "searching" ? "…" : "Rechercher"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Utilisée pour la météo quand la localisation n&apos;est pas disponible.
      </p>

      {search.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {search.message}
        </p>
      )}
      {search.status === "done" &&
        (search.results.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            Aucune ville trouvée.
          </p>
        ) : (
          <ul aria-label="Résultats" className="border-t">
            {search.results.map((result) => (
              <li key={result.id} className="border-b">
                <button
                  type="button"
                  onClick={() => void save(result)}
                  disabled={saving}
                  className="flex min-h-12 w-full cursor-pointer flex-col justify-center py-2 text-left active:bg-muted disabled:opacity-40"
                >
                  <span className="text-sm">{result.name}</span>
                  {result.region && <span className="text-xs text-muted-foreground">{result.region}</span>}
                </button>
              </li>
            ))}
          </ul>
        ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
