import type { Metadata } from "next";
import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { GarmentExclusionPicker } from "@/components/rules/garment-exclusion-picker";
import { listGarments } from "@/lib/garments/queries";
import { listGarmentExclusions } from "@/lib/rules/queries";

export const metadata: Metadata = { title: "Nouvelle règle vêtement" };

export default async function NewGarmentRulePage({ searchParams }: PageProps<"/rules/garments/new">) {
  const [{ garment: garmentParam }, garments, exclusions] = await Promise.all([
    searchParams,
    listGarments(),
    listGarmentExclusions(),
  ]);
  // Only an existing garment can be preselected; the shortcut from its page returns there.
  const initialGarment = garments.find((garment) => garment.id === garmentParam);
  const returnTo = initialGarment ? `/wardrobe/${initialGarment.id}` : "/rules";

  return (
    <>
      <BackLink href={returnTo}>{initialGarment ? initialGarment.name : "Règles"}</BackLink>
      <PageHeader title="Vêtements incompatibles" />
      {garments.length < 2 ? (
        <p className="border p-6 text-sm text-muted-foreground">
          Ajoutez d&apos;abord des vêtements de plusieurs catégories à votre garde-robe.
        </p>
      ) : (
        <GarmentExclusionPicker
          garments={garments}
          exclusions={exclusions}
          initialGarmentId={initialGarment?.id}
          returnTo={returnTo}
        />
      )}
    </>
  );
}
