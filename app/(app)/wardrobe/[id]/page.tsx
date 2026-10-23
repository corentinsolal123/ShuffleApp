import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DeleteGarmentButton } from "@/components/garments/delete-garment-button";
import { GarmentForm } from "@/components/garments/garment-form";
import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { requireUserId } from "@/lib/auth/session";
import { getGarment } from "@/lib/garments/queries";
import { listOccasions } from "@/lib/occasions/queries";

export const metadata: Metadata = { title: "Modifier un vêtement" };

export default async function EditGarmentPage({ params }: PageProps<"/wardrobe/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [userId, garment, occasions] = await Promise.all([requireUserId(), getGarment(id), listOccasions()]);
  if (!garment) notFound();

  return (
    <>
      <BackLink href={`/wardrobe?category=${garment.category}`}>Garde-robe</BackLink>
      <PageHeader title="Modifier" />
      <div className="flex flex-col gap-6">
        <GarmentForm key={garment.id} userId={userId} occasions={occasions} garment={garment} />
        <DeleteGarmentButton garmentId={garment.id} garmentName={garment.name} />
      </div>
    </>
  );
}
