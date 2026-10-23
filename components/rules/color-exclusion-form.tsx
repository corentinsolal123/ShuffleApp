"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createColorExclusion } from "@/app/(app)/rules/actions";
import { ColorSwatch } from "@/components/garments/color-swatch";
import { Button } from "@/components/ui/button";
import { ChoiceFieldset } from "@/components/ui/choice-fieldset";
import { PALETTE, colorLabel, type ColorKey } from "@/lib/palette";
import { pairKey, type ColorExclusion } from "@/lib/rules/model";

function SwatchRadioGroup({
  value,
  onValueChange,
  disabled,
}: {
  value: ColorKey | null;
  onValueChange: (value: ColorKey) => void;
  disabled?: boolean;
}) {
  return (
    <RadioGroup<ColorKey | null>
      value={value}
      onValueChange={(next) => next && onValueChange(next)}
      disabled={disabled}
      className="grid grid-cols-4 gap-2 sm:grid-cols-7"
    >
      {PALETTE.map((color) => (
        <Radio.Root
          key={color.key}
          value={color.key}
          className="flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1.5 border px-1 py-2 text-[0.6875rem] data-checked:bg-primary data-checked:text-primary-foreground data-disabled:opacity-40"
        >
          <ColorSwatch color={color.key} className="size-6" />
          {color.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

export function ColorExclusionForm({ exclusions }: { exclusions: ColorExclusion[] }) {
  const router = useRouter();
  const [colorA, setColorA] = useState<ColorKey | null>(null);
  const [colorB, setColorB] = useState<ColorKey | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyExists =
    colorA !== null &&
    colorB !== null &&
    exclusions.some(({ colors: [a, b] }) => pairKey(a, b) === pairKey(colorA, colorB));
  const canSubmit = colorA !== null && colorB !== null && !alreadyExists && !pending;

  async function handleSubmit() {
    if (!colorA || !colorB) return;
    setPending(true);
    setError(null);
    try {
      const result = await createColorExclusion(colorA, colorB);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      router.push("/rules");
    } catch {
      setError("Enregistrement impossible. Vérifiez la connexion et réessayez.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <ChoiceFieldset legend="Couleur">
        <SwatchRadioGroup value={colorA} onValueChange={setColorA} disabled={pending} />
      </ChoiceFieldset>
      <ChoiceFieldset legend="Ne va jamais avec" hint="Peut être la même couleur">
        <SwatchRadioGroup value={colorB} onValueChange={setColorB} disabled={pending} />
      </ChoiceFieldset>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 flex flex-col gap-3 border-t bg-background px-4 py-4">
        {colorA && colorB && (
          <p className="text-sm" aria-live="polite">
            Jamais {colorLabel(colorA).toLowerCase()} avec {colorLabel(colorB).toLowerCase()}.
            {alreadyExists && <span className="text-muted-foreground"> Cette règle existe déjà.</span>}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
          {pending ? "Enregistrement…" : "Ajouter la règle"}
        </Button>
      </div>
    </div>
  );
}
