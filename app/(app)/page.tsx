import { PageHeader } from "@/components/layout/page-header";
import { OutfitGenerator } from "@/components/outfits/outfit-generator";
import { listGarments } from "@/lib/garments/queries";
import { listOccasions } from "@/lib/occasions/queries";
import { getProfile } from "@/lib/profile/queries";
import { listColorExclusions, listGarmentExclusions } from "@/lib/rules/queries";

export default async function GeneratePage() {
  const [garments, garmentExclusions, colorExclusions, occasions, profile] = await Promise.all([
    listGarments(),
    listGarmentExclusions(),
    listColorExclusions(),
    listOccasions(),
    getProfile(),
  ]);

  return (
    <>
      <PageHeader title="Tenues du jour" />
      <OutfitGenerator
        garments={garments}
        rules={{ garmentExclusions, colorExclusions }}
        occasions={occasions}
        defaultCity={profile.defaultCity}
      />
    </>
  );
}
