import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveGarment } from "@/app/(app)/wardrobe/actions";
import { GarmentForm } from "@/components/garments/garment-form";
import type { GarmentWithPhoto } from "@/lib/garments/model";
import { routerMock } from "@/tests/mocks/router";
import { SUPABASE_URL, server } from "@/tests/msw/server";

vi.mock("@/app/(app)/wardrobe/actions", () => ({
  saveGarment: vi.fn(),
  deleteGarment: vi.fn(),
}));

vi.mock("@/lib/image/compress", () => ({
  compressPhoto: vi.fn(async () => ({
    blob: new Blob(["webp"], { type: "image/webp" }),
    type: "image/webp",
    width: 750,
    height: 1000,
  })),
}));

const USER_ID = "8f0c1a52-3f0e-4c1e-9a43-0e7d2b8a4c11";
const OCCASIONS = [
  { id: "3b9d6f2e-7a1c-4e58-b0d4-5f6a7c8e9d01", name: "Quotidien" },
  { id: "5c2e8a41-9b3d-4f67-a1e2-6d7f8a9b0c12", name: "Travail" },
];

const saveGarmentMock = vi.mocked(saveGarment);

function storageHandlers() {
  const uploads: string[] = [];
  const removals: unknown[] = [];
  server.use(
    http.post(`${SUPABASE_URL}/storage/v1/object/garments/*`, ({ request }) => {
      const path = new URL(request.url).pathname.replace("/storage/v1/object/garments/", "");
      uploads.push(path);
      return HttpResponse.json({ Key: `garments/${path}`, Id: crypto.randomUUID() });
    }),
    http.delete(`${SUPABASE_URL}/storage/v1/object/garments`, async ({ request }) => {
      removals.push(await request.json());
      return HttpResponse.json([]);
    }),
  );
  return { uploads, removals };
}

async function fillNewGarment(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(
    screen.getByLabelText("Choisir une photo dans la galerie"),
    new File(["jpeg"], "IMG_0001.jpg", { type: "image/jpeg" }),
  );
  await user.type(screen.getByLabelText("Nom"), "Chemise blanche");
  await user.click(screen.getByRole("radio", { name: "Haut" }));
  await user.click(screen.getByRole("checkbox", { name: "Blanc" }));
  await user.click(screen.getByRole("checkbox", { name: "Travail" }));
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  saveGarmentMock.mockReset();
});

describe("GarmentForm", () => {
  it("lists every missing field and saves nothing", async () => {
    const user = userEvent.setup();
    render(<GarmentForm userId={USER_ID} occasions={OCCASIONS} />);

    await user.click(screen.getByRole("button", { name: "Ajouter à la garde-robe" }));

    expect(screen.getByText("Ajoutez une photo.")).toBeInTheDocument();
    expect(screen.getByText("Donnez un nom au vêtement.")).toBeInTheDocument();
    expect(screen.getByText("Choisissez une catégorie.")).toBeInTheDocument();
    expect(screen.getByText("Choisissez au moins une couleur.")).toBeInTheDocument();
    expect(screen.getByText("Choisissez au moins une occasion.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Vérifiez les champs signalés.");
    expect(saveGarmentMock).not.toHaveBeenCalled();
  });

  it("uploads the compressed photo to the user's folder, then saves the garment", async () => {
    const { uploads } = storageHandlers();
    saveGarmentMock.mockResolvedValue({ ok: true, id: "new-id" });
    const user = userEvent.setup();
    render(<GarmentForm userId={USER_ID} occasions={OCCASIONS} />);

    await fillNewGarment(user);
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Ajouter à la garde-robe" }));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/wardrobe?category=top"));
    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toMatch(new RegExp(`^${USER_ID}/[0-9a-f-]{36}\\.webp$`));
    expect(saveGarmentMock).toHaveBeenCalledWith({
      id: null,
      name: "Chemise blanche",
      category: "top",
      colors: ["white"],
      seasons: [],
      occasionIds: [OCCASIONS[1]!.id],
      warmth: 2,
      rainOk: true,
      photoPath: uploads[0],
    });
  });

  it("removes the uploaded photo and shows the error when saving fails", async () => {
    const { uploads, removals } = storageHandlers();
    saveGarmentMock.mockResolvedValue({ ok: false, error: "Enregistrement impossible. Réessayez." });
    const user = userEvent.setup();
    render(<GarmentForm userId={USER_ID} occasions={OCCASIONS} />);

    await fillNewGarment(user);
    await user.click(screen.getByRole("button", { name: "Ajouter à la garde-robe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enregistrement impossible. Réessayez.");
    expect(removals).toEqual([{ prefixes: [uploads[0]] }]);
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("explains when the photo upload fails", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/storage/v1/object/garments/*`, () =>
        HttpResponse.json({ statusCode: "500", error: "Internal", message: "boom" }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    render(<GarmentForm userId={USER_ID} occasions={OCCASIONS} />);

    await fillNewGarment(user);
    await user.click(screen.getByRole("button", { name: "Ajouter à la garde-robe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Envoi de la photo impossible");
    expect(saveGarmentMock).not.toHaveBeenCalled();
  });

  it("limits the selection to three colours", async () => {
    const user = userEvent.setup();
    render(<GarmentForm userId={USER_ID} occasions={OCCASIONS} />);

    for (const name of ["Noir", "Blanc", "Gris"]) {
      await user.click(screen.getByRole("checkbox", { name }));
    }

    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Rouge" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("checkbox", { name: "Noir" })).not.toHaveAttribute("aria-disabled", "true");
  });

  it("edits an existing garment without re-uploading its photo", async () => {
    const { uploads } = storageHandlers();
    saveGarmentMock.mockResolvedValue({ ok: true, id: "g1" });
    const garment: GarmentWithPhoto = {
      id: "2a7f4c1e-8b3d-4e6f-9a01-b2c3d4e5f607",
      name: "Bottines",
      category: "shoes",
      colors: ["brown"],
      seasons: ["autumn", "winter"],
      occasionIds: [OCCASIONS[0]!.id],
      warmth: 3,
      rainOk: true,
      photoPath: `${USER_ID}/bottines.webp`,
      photoUrl: "https://example.test/signed/bottines.webp",
    };
    const user = userEvent.setup();
    render(<GarmentForm userId={USER_ID} occasions={OCCASIONS} garment={garment} />);

    expect(screen.getByRole("img", { name: "Bottines" })).toHaveAttribute("src", garment.photoUrl);
    await user.clear(screen.getByLabelText("Nom"));
    await user.type(screen.getByLabelText("Nom"), "Bottines en cuir");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/wardrobe?category=shoes"));
    expect(uploads).toEqual([]);
    expect(saveGarmentMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: garment.id, name: "Bottines en cuir", photoPath: garment.photoPath }),
    );
  });
});
