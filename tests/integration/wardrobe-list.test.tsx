import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryTabs } from "@/components/garments/category-tabs";
import { GarmentGrid } from "@/components/garments/garment-grid";
import type { GarmentWithPhoto } from "@/lib/garments/model";

const garment = (patch: Partial<GarmentWithPhoto>): GarmentWithPhoto => ({
  id: "g1",
  name: "Chemise",
  category: "top",
  colors: ["white"],
  seasons: [],
  occasionIds: ["o1"],
  warmth: 1,
  rainOk: false,
  photoPath: "u/g1.webp",
  photoUrl: "https://example.test/g1.webp",
  ...patch,
});

describe("CategoryTabs", () => {
  it("marks the active category and shows the counts", () => {
    render(<CategoryTabs active="shoes" counts={{ top: 4, bottom: 2, shoes: 1, outerwear: 3 }} />);

    const current = screen.getByRole("link", { current: "page" });
    expect(current).toHaveTextContent("Chaussures1");
    expect(current).toHaveAttribute("href", "/wardrobe?category=shoes");
    expect(screen.getByRole("link", { name: "Tout" })).toHaveAttribute("href", "/wardrobe");
  });
});

describe("GarmentGrid", () => {
  it("links each garment to its edit page, with a placeholder when the photo is missing", () => {
    render(
      <GarmentGrid
        garments={[garment({}), garment({ id: "g2", name: "Jean brut", category: "bottom", photoUrl: null })]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]!).getByRole("link")).toHaveAttribute("href", "/wardrobe/g1");
    expect(within(items[1]!).getByText("Photo indisponible")).toBeInTheDocument();
    expect(within(items[1]!).getByText("Jean brut")).toBeInTheDocument();
  });
});
