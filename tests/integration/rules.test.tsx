import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createColorExclusion, createGarmentExclusions } from "@/app/(app)/rules/actions";
import { DeleteRuleButton } from "@/components/rules/delete-rule-button";
import { ColorExclusionForm } from "@/components/rules/color-exclusion-form";
import { GarmentExclusionPicker } from "@/components/rules/garment-exclusion-picker";
import type { GarmentWithPhoto } from "@/lib/garments/model";
import { routerMock } from "@/tests/mocks/router";

vi.mock("@/app/(app)/rules/actions", () => ({
  createGarmentExclusions: vi.fn(),
  createColorExclusion: vi.fn(),
  deleteGarmentExclusion: vi.fn(),
  deleteColorExclusion: vi.fn(),
}));

const createGarmentExclusionsMock = vi.mocked(createGarmentExclusions);
const createColorExclusionMock = vi.mocked(createColorExclusion);

const garment = (id: string, name: string, category: GarmentWithPhoto["category"]): GarmentWithPhoto => ({
  id,
  name,
  category,
  colors: ["black"],
  seasons: [],
  occasionIds: ["o"],
  warmth: 2,
  rainOk: false,
  photoPath: `u/${id}.webp`,
  photoUrl: null,
});

const GARMENTS = [
  garment("shirt", "Chemise blanche", "top"),
  garment("sweater", "Pull beige", "top"),
  garment("jeans", "Jean brut", "bottom"),
  garment("chinos", "Chino marine", "bottom"),
  garment("boots", "Bottines", "shoes"),
];

afterEach(() => {
  createGarmentExclusionsMock.mockReset();
  createColorExclusionMock.mockReset();
});

describe("GarmentExclusionPicker", () => {
  it("only offers garments from the other categories and skips existing rules", () => {
    render(
      <GarmentExclusionPicker
        garments={GARMENTS}
        exclusions={[{ id: "r1", garmentIds: ["jeans", "shirt"] }]}
        initialGarmentId="shirt"
        returnTo="/wardrobe/shirt"
      />,
    );

    expect(screen.queryByRole("checkbox", { name: "Pull beige" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Jean brut/ })).not.toBeInTheDocument();
    expect(screen.getByText("Déjà exclu")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Chino marine" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Bottines" })).toBeInTheDocument();
  });

  it("creates one rule per ticked garment and returns to the garment", async () => {
    createGarmentExclusionsMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(
      <GarmentExclusionPicker garments={GARMENTS} exclusions={[]} initialGarmentId="shirt" returnTo="/wardrobe/shirt" />,
    );
    const submit = screen.getByRole("button", { name: "Ajouter la règle" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Chino marine" }));
    await user.click(screen.getByRole("checkbox", { name: "Bottines" }));
    await user.click(screen.getByRole("button", { name: "Ajouter 2 règles" }));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/wardrobe/shirt"));
    expect(createGarmentExclusionsMock).toHaveBeenCalledWith("shirt", ["chinos", "boots"]);
  });

  it("lets the user pick the first garment when none is given, filtered by category", async () => {
    const user = userEvent.setup();
    render(<GarmentExclusionPicker garments={GARMENTS} exclusions={[]} returnTo="/rules" />);

    await user.click(screen.getByRole("button", { name: "Chaussures", pressed: false }));
    expect(screen.queryByRole("button", { name: "Chemise blanche" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bottines" }));

    expect(screen.getByText("Ne va jamais avec")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Chemise blanche" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Jean brut" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Changer" }));
    expect(screen.getByText("Choisissez le vêtement concerné.")).toBeInTheDocument();
  });

  it("shows the server error and stays on the page", async () => {
    createGarmentExclusionsMock.mockResolvedValue({ ok: false, error: "Enregistrement impossible. Réessayez." });
    const user = userEvent.setup();
    render(<GarmentExclusionPicker garments={GARMENTS} exclusions={[]} initialGarmentId="shirt" returnTo="/rules" />);

    await user.click(screen.getByRole("checkbox", { name: "Bottines" }));
    await user.click(screen.getByRole("button", { name: "Ajouter la règle" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enregistrement impossible");
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});

describe("ColorExclusionForm", () => {
  it("creates a colour rule, including a colour with itself", async () => {
    createColorExclusionMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ColorExclusionForm exclusions={[]} />);

    const [first, second] = screen.getAllByRole("radiogroup");
    await user.click(within(first!).getByRole("radio", { name: "Noir" }));
    await user.click(within(second!).getByRole("radio", { name: "Noir" }));
    expect(screen.getByText("Jamais noir avec noir.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ajouter la règle" }));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/rules"));
    expect(createColorExclusionMock).toHaveBeenCalledWith("black", "black");
  });

  it("prevents adding a rule that already exists, whatever the order", async () => {
    const user = userEvent.setup();
    render(<ColorExclusionForm exclusions={[{ id: "r1", colors: ["black", "brown"] }]} />);

    const [first, second] = screen.getAllByRole("radiogroup");
    await user.click(within(first!).getByRole("radio", { name: "Marron" }));
    await user.click(within(second!).getByRole("radio", { name: "Noir" }));

    expect(screen.getByText(/Cette règle existe déjà/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter la règle" })).toBeDisabled();
  });
});

describe("DeleteRuleButton", () => {
  it("calls the bound action and reports failures", async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, error: "Suppression impossible. Réessayez." });
    const user = userEvent.setup();
    render(<DeleteRuleButton label="Supprimer la règle Marron × Noir" action={action} />);

    await user.click(screen.getByRole("button", { name: "Supprimer la règle Marron × Noir" }));

    expect(action).toHaveBeenCalledOnce();
    expect(await screen.findByRole("alert")).toHaveTextContent("Suppression impossible");
  });
});
