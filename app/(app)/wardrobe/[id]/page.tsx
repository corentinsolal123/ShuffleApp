import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DeleteGarmentButton } from "@/components/garments/delete-garment-button";
import { GarmentForm } from "@/components/garments/garment-form";
import { GarmentRulesSection } from "@/components/rules/garment-rules-section";
import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { requireUserId } from "@/lib/auth/session";
import { listGarments } from "@/lib/garments/queries";
import { listOccasions } from "@/lib/occasions/queries";
import { exclusionsForGarment } from "@/lib/rules/model";
import { listGarmentExclusions } from "@/lib/rules/queries";

export const metadata: Metadata = { title: "Modifier un vêtement" };

export default async function EditGarmentPage({ params }: PageProps<"/wardrobe/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [userId, garments, occasions, exclusions] = await Promise.all([
    requireUserId(),
    listGarments(),
    listOccasions(),
    listGarmentExclusions(),
  ]);
  const garment = garments.find((candidate) => candidate.id === id);
  if (!garment) notFound();

  return (
    <>
      <BackLink href={`/wardrobe?category=${garment.category}`}>Garde-robe</BackLink>
      <PageHeader title="Modifier" />
      <div className="flex flex-col gap-6">
        <GarmentForm key={garment.id} userId={userId} occasions={occasions} garment={garment} />
        <GarmentRulesSection garment={garment} excluded={exclusionsForGarment(garment.id, exclusions, garments)} />
        <DeleteGarmentButton garmentId={garment.id} garmentName={garment.name} />
      </div>
    </>
  );
}
