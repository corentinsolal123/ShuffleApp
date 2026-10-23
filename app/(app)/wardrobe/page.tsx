import type { Metadata } from "next";
import { CategoryTabs } from "@/components/garments/category-tabs";
import { GarmentGrid } from "@/components/garments/garment-grid";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button-link";
import { listGarments } from "@/lib/garments/queries";
import { CATEGORIES, CATEGORY_PLURAL_LABELS, isCategory, type Category } from "@/lib/garments/model";

export const metadata: Metadata = { title: "Garde-robe" };

export default async function WardrobePage({ searchParams }: PageProps<"/wardrobe">) {
  const { category: rawCategory } = await searchParams;
  const category = isCategory(rawCategory) ? rawCategory : null;

  // One query for the whole wardrobe: it stays small, and the tabs need every count.
  const all = await listGarments();
  const garments = category ? all.filter((garment) => garment.category === category) : all;
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c, all.filter((garment) => garment.category === c).length]),
  ) as Record<Category, number>;
  const newHref = category ? `/wardrobe/new?category=${category}` : "/wardrobe/new";

  return (
    <>
      <PageHeader
        title="Garde-robe"
        action={
          <ButtonLink href={newHref} size="sm">
            Ajouter
          </ButtonLink>
        }
      />
      <CategoryTabs active={category} counts={counts} />

      {garments.length > 0 ? (
        <GarmentGrid garments={garments} />
      ) : (
        <div className="flex flex-col items-start gap-4 border p-6">
          <p className="text-sm text-muted-foreground">
            {category
              ? `Aucun vêtement dans « ${CATEGORY_PLURAL_LABELS[category]} » pour l'instant.`
              : "Votre garde-robe est vide. Commencez par photographier un haut, un bas et une paire de chaussures."}
          </p>
          <ButtonLink href={newHref} variant="outline" size="sm">
            Ajouter un vêtement
          </ButtonLink>
        </div>
      )}
    </>
  );
}
