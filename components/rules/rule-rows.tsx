import type { ReactNode } from "react";
import { ColorSwatch } from "@/components/garments/color-swatch";
import { GarmentPhoto } from "@/components/garments/garment-photo";
import type { GarmentWithPhoto } from "@/lib/garments/model";
import { colorLabel, type ColorKey } from "@/lib/palette";

/** One "A × B" rule line with its delete control. */
export function RuleRow({ left, right, action }: { left: ReactNode; right: ReactNode; action: ReactNode }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-3 border-b py-3">
      {left}
      <span aria-hidden className="text-muted-foreground">
        ×
      </span>
      {right}
      {action}
    </li>
  );
}

export function GarmentRuleSide({ garment }: { garment: GarmentWithPhoto }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <GarmentPhoto url={garment.photoUrl} className="w-10 shrink-0" />
      <span className="truncate text-xs">{garment.name}</span>
    </span>
  );
}

export function ColorRuleSide({ color }: { color: ColorKey }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <ColorSwatch color={color} className="size-6" />
      <span className="truncate text-sm">{colorLabel(color)}</span>
    </span>
  );
}
