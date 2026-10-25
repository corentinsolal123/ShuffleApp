import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type GarmentWithPhoto } from "@/lib/garments/model";
import type { Outfit } from "@/lib/outfit-engine";
import { cn } from "@/lib/utils";

/** One outfit: outerwear (if any), top, bottom and shoes stacked, with a reroll action. */
export function OutfitCard({
  outfit,
  label,
  onReroll,
  rerollDisabled,
}: {
  outfit: Outfit<GarmentWithPhoto>;
  label: string;
  onReroll: () => void;
  rerollDisabled?: boolean;
}) {
  const pieces = [outfit.outerwear, outfit.top, outfit.bottom, outfit.shoes].filter((piece) => piece !== undefined);
  return (
    <article aria-label={label} className="flex flex-col border">
      <header className="flex min-h-11 items-center justify-between border-b pl-3">
        <h2 className="label-caps">{label}</h2>
        <Button variant="ghost" size="sm" onClick={onReroll} disabled={rerollDisabled} aria-label={`Relancer la ${label.toLowerCase()}`}>
          Relancer
        </Button>
      </header>
      <ul>
        {pieces.map((garment) => (
          <li key={garment.id} className="relative border-b last:border-b-0">
            <Link href={`/wardrobe/${garment.id}`} className="block">
              <div className={cn("w-full bg-muted", pieces.length > 3 ? "h-[15dvh] min-h-28" : "h-[19dvh] min-h-32")}>
                {garment.photoUrl && (
                  // Signed Supabase URL: next/image optimisation does not apply.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={garment.photoUrl} alt="" className="size-full object-cover" />
                )}
              </div>
              <span className="absolute bottom-0 left-0 max-w-full truncate bg-background/85 px-2 py-1 text-xs">
                <span className="sr-only">{CATEGORY_LABELS[garment.category]} : </span>
                {garment.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
