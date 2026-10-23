import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DeleteRuleButton } from "@/components/rules/delete-rule-button";
import { ColorRuleSide, GarmentRuleSide, RuleRow } from "@/components/rules/rule-rows";
import { Button } from "@/components/ui/button";
import { listGarments } from "@/lib/garments/queries";
import { colorLabel } from "@/lib/palette";
import { listColorExclusions, listGarmentExclusions } from "@/lib/rules/queries";
import { deleteColorExclusion, deleteGarmentExclusion } from "./actions";

export const metadata: Metadata = { title: "Règles" };

export default async function RulesPage() {
  const [garments, garmentRules, colorRules] = await Promise.all([
    listGarments(),
    listGarmentExclusions(),
    listColorExclusions(),
  ]);
  const garmentsById = new Map(garments.map((garment) => [garment.id, garment]));

  return (
    <>
      <PageHeader title="Règles" />
      <p className="mb-10 text-sm text-muted-foreground">
        Par défaut, tout va avec tout. Ajoutez ici ce qui ne doit jamais être porté ensemble.
      </p>

      <RuleSection
        title="Vêtements incompatibles"
        addHref="/rules/garments/new"
        addLabel="Ajouter une règle vêtement"
        empty="Aucune règle. Exemple : cette chemise ne va jamais avec ce pantalon."
      >
        {garmentRules.flatMap(({ id, garmentIds: [a, b] }) => {
          const left = garmentsById.get(a);
          const right = garmentsById.get(b);
          if (!left || !right) return [];
          return (
            <RuleRow
              key={id}
              left={<GarmentRuleSide garment={left} />}
              right={<GarmentRuleSide garment={right} />}
              action={
                <DeleteRuleButton
                  label={`Supprimer la règle ${left.name} × ${right.name}`}
                  action={deleteGarmentExclusion.bind(null, id)}
                />
              }
            />
          );
        })}
      </RuleSection>

      <RuleSection
        title="Couleurs incompatibles"
        addHref="/rules/colors/new"
        addLabel="Ajouter une règle couleur"
        empty="Aucune règle. Exemple : jamais de marron avec du noir."
      >
        {colorRules.map(({ id, colors: [a, b] }) => (
          <RuleRow
            key={id}
            left={<ColorRuleSide color={a} />}
            right={<ColorRuleSide color={b} />}
            action={
              <DeleteRuleButton
                label={`Supprimer la règle ${colorLabel(a)} × ${colorLabel(b)}`}
                action={deleteColorExclusion.bind(null, id)}
              />
            }
          />
        ))}
      </RuleSection>
    </>
  );
}

function RuleSection({
  title,
  addHref,
  addLabel,
  empty,
  children,
}: {
  title: string;
  addHref: string;
  addLabel: string;
  empty: string;
  children: ReactNode[];
}) {
  return (
    <section className="mb-12" aria-label={title}>
      <div className="flex min-h-11 items-center justify-between gap-4 border-b">
        <h2 className="label-caps">{title}</h2>
        <Button
          variant="link"
          size="sm"
          className="px-0"
          render={<Link href={addHref} aria-label={addLabel} />}
          nativeButton={false}
        >
          Ajouter
        </Button>
      </div>
      {children.length > 0 ? <ul>{children}</ul> : <p className="py-4 text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}
