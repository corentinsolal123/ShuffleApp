import Link from "next/link";
import { deleteGarmentExclusion } from "@/app/(app)/rules/actions";
import { GarmentPhoto } from "@/components/garments/garment-photo";
import { Button } from "@/components/ui/button";
import type { GarmentWithPhoto } from "@/lib/garments/model";
import { DeleteRuleButton } from "./delete-rule-button";

/** "Never goes with" list shown on a garment's page, with a shortcut to add more. */
export function GarmentRulesSection({
  garment,
  excluded,
}: {
  garment: GarmentWithPhoto;
  excluded: { ruleId: string; garment: GarmentWithPhoto }[];
}) {
  return (
    <section aria-label="Ne va jamais avec" className="flex flex-col">
      <div className="flex min-h-11 items-center justify-between gap-4 border-b">
        <h2 className="label-caps">Ne va jamais avec</h2>
        <Button
          variant="link"
          size="sm"
          className="px-0"
          render={<Link href={`/rules/garments/new?garment=${garment.id}`} aria-label="Ajouter une incompatibilité" />}
          nativeButton={false}
        >
          Ajouter
        </Button>
      </div>
      {excluded.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Aucune incompatibilité : ce vêtement va avec tout.</p>
      ) : (
        <ul>
          {excluded.map(({ ruleId, garment: other }) => (
            <li key={ruleId} className="flex items-center gap-3 border-b py-3">
              <GarmentPhoto url={other.photoUrl} className="w-10 shrink-0" />
              <Link href={`/wardrobe/${other.id}`} className="min-w-0 flex-1 truncate text-sm">
                {other.name}
              </Link>
              <DeleteRuleButton
                label={`Retirer l'incompatibilité avec ${other.name}`}
                action={deleteGarmentExclusion.bind(null, ruleId)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
