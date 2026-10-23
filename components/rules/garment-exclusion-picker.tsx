"use client";

import { Checkbox } from "@base-ui/react/checkbox";
import { CheckboxGroup } from "@base-ui/react/checkbox-group";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createGarmentExclusions } from "@/app/(app)/rules/actions";
import { CategoryFilter } from "@/components/garments/category-filter";
import { GarmentPhoto } from "@/components/garments/garment-photo";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS, type Category, type GarmentWithPhoto } from "@/lib/garments/model";
import { pairKey, type GarmentExclusion } from "@/lib/rules/model";

/**
 * Two steps: pick a garment (skipped when one is given), then tick every
 * garment from the other categories it never goes with.
 */
export function GarmentExclusionPicker({
  garments,
  exclusions,
  initialGarmentId,
  returnTo,
}: {
  garments: GarmentWithPhoto[];
  exclusions: GarmentExclusion[];
  initialGarmentId?: string;
  returnTo: string;
}) {
  const router = useRouter();
  const [garmentId, setGarmentId] = useState<string | null>(initialGarmentId ?? null);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<Category | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const garment = garments.find((candidate) => candidate.id === garmentId) ?? null;
  const existing = useMemo(
    () => new Set(exclusions.map(({ garmentIds: [a, b] }) => pairKey(a, b))),
    [exclusions],
  );

  function choose(id: string | null) {
    setGarmentId(id);
    setSelected([]);
    setFilter(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!garment || selected.length === 0) return;
    setPending(true);
    setError(null);
    try {
      const result = await createGarmentExclusions(garment.id, selected);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      router.push(returnTo);
    } catch {
      setError("Enregistrement impossible. Vérifiez la connexion et réessayez.");
      setPending(false);
    }
  }

  if (!garment) {
    const visible = filter ? garments.filter((g) => g.category === filter) : garments;
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">Choisissez le vêtement concerné.</p>
        <CategoryFilter categories={CATEGORIES} value={filter} onValueChange={setFilter} />
        <ul className="grid grid-cols-3 gap-x-2 gap-y-4">
          {visible.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => choose(candidate.id)}
                className="flex w-full cursor-pointer flex-col gap-1.5 text-left active:opacity-80"
              >
                <GarmentPhoto url={candidate.photoUrl} />
                <span className="truncate text-xs">{candidate.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const otherCategories = CATEGORIES.filter((category) => category !== garment.category);
  const candidates = garments.filter(
    (candidate) => candidate.category !== garment.category && (!filter || candidate.category === filter),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b pb-4">
        <GarmentPhoto url={garment.photoUrl} className="w-16 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="label-caps text-muted-foreground">{CATEGORY_LABELS[garment.category]}</span>
          <span className="truncate text-sm">{garment.name}</span>
        </div>
        {!initialGarmentId && (
          <Button variant="link" size="sm" className="px-0" onClick={() => choose(null)}>
            Changer
          </Button>
        )}
      </div>

      <div>
        <p className="mb-4 label-caps">Ne va jamais avec</p>
        <CategoryFilter categories={otherCategories} value={filter} onValueChange={setFilter} />
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun vêtement dans les autres catégories.</p>
        ) : (
          <CheckboxGroup
            value={selected}
            onValueChange={setSelected}
            disabled={pending}
            className="grid grid-cols-3 gap-x-2 gap-y-4"
          >
            {candidates.map((candidate) =>
              existing.has(pairKey(garment.id, candidate.id)) ? (
                <div key={candidate.id} className="flex flex-col gap-1.5">
                  <GarmentPhoto url={candidate.photoUrl} className="opacity-40" />
                  <span className="truncate text-xs text-muted-foreground">{candidate.name}</span>
                  <span className="text-[0.625rem] text-muted-foreground">Déjà exclu</span>
                </div>
              ) : (
                <Checkbox.Root
                  key={candidate.id}
                  value={candidate.id}
                  className="group flex cursor-pointer flex-col gap-1.5 text-left"
                >
                  <span className="relative block outline-offset-2 group-data-checked:outline-2 group-data-checked:outline-foreground">
                    <GarmentPhoto url={candidate.photoUrl} />
                    <span
                      aria-hidden
                      className="absolute top-1 right-1 hidden size-6 items-center justify-center bg-primary text-xs text-primary-foreground group-data-checked:flex"
                    >
                      ✓
                    </span>
                  </span>
                  <span className="truncate text-xs">{candidate.name}</span>
                </Checkbox.Root>
              ),
            )}
          </CheckboxGroup>
        )}
      </div>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-3 border-t bg-background px-4 py-4">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button onClick={() => void handleSubmit()} disabled={pending || selected.length === 0}>
          {pending
            ? "Enregistrement…"
            : selected.length > 1
              ? `Ajouter ${selected.length} règles`
              : "Ajouter la règle"}
        </Button>
      </div>
    </div>
  );
}
