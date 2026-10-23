import type { Metadata } from "next";
import { GarmentForm } from "@/components/garments/garment-form";
import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { requireUserId } from "@/lib/auth/session";
import { isCategory } from "@/lib/garments/model";
import { listOccasions } from "@/lib/occasions/queries";

export const metadata: Metadata = { title: "Nouveau vêtement" };

export default async function NewGarmentPage({ searchParams }: PageProps<"/wardrobe/new">) {
  const [{ category }, userId, occasions] = await Promise.all([searchParams, requireUserId(), listOccasions()]);

  return (
    <>
      <BackLink href="/wardrobe">Garde-robe</BackLink>
      <PageHeader title="Nouveau vêtement" />
      <GarmentForm
        userId={userId}
        occasions={occasions}
        defaultCategory={isCategory(category) ? category : undefined}
      />
    </>
  );
}
