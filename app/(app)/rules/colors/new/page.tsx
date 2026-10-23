import type { Metadata } from "next";
import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { ColorExclusionForm } from "@/components/rules/color-exclusion-form";
import { listColorExclusions } from "@/lib/rules/queries";

export const metadata: Metadata = { title: "Nouvelle règle couleur" };

export default async function NewColorRulePage() {
  const exclusions = await listColorExclusions();

  return (
    <>
      <BackLink href="/rules">Règles</BackLink>
      <PageHeader title="Couleurs incompatibles" />
      <ColorExclusionForm exclusions={exclusions} />
    </>
  );
}
