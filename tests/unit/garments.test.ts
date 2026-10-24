import { describe, expect, it } from "vitest";
import { saveGarmentErrorMessage } from "@/lib/garments/errors";
import { toGarment, type GarmentRow } from "@/lib/garments/mapper";
import { isCategory } from "@/lib/garments/model";
import { isOwnPhotoPath, photoPath } from "@/lib/garments/photo";
import { fieldErrors, garmentInputSchema, type GarmentInput } from "@/lib/garments/schema";

const USER_ID = "8f0c1a52-3f0e-4c1e-9a43-0e7d2b8a4c11";
const OCCASION_ID = "3b9d6f2e-7a1c-4e58-b0d4-5f6a7c8e9d01";

const validInput: GarmentInput = {
  id: null,
  name: "  Chemise en lin  ",
  category: "top",
  colors: ["white", "navy"],
  seasons: ["spring", "summer"],
  occasionIds: [OCCASION_ID],
  warmth: 1,
  rainOk: false,
  photoPath: `${USER_ID}/photo.webp`,
};

describe("garmentInputSchema", () => {
  it("accepts a complete garment and trims its name", () => {
    const result = garmentInputSchema.parse(validInput);
    expect(result.name).toBe("Chemise en lin");
  });

  it("accepts an empty season list (all seasons)", () => {
    expect(garmentInputSchema.safeParse({ ...validInput, seasons: [] }).success).toBe(true);
  });

  it.each([
    ["name", { name: "   " }, "Donnez un nom au vêtement."],
    ["colors", { colors: [] }, "Choisissez au moins une couleur."],
    ["colors", { colors: ["black", "white", "grey", "beige"] }, "3 couleurs maximum."],
    ["occasionIds", { occasionIds: [] }, "Choisissez au moins une occasion."],
    ["photoPath", { photoPath: "" }, "Ajoutez une photo."],
  ] as const)("reports %s errors", (field, patch, message) => {
    const result = garmentInputSchema.safeParse({ ...validInput, ...patch });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)[field]).toBe(message);
  });

  it("rejects colours outside the palette", () => {
    expect(garmentInputSchema.safeParse({ ...validInput, colors: ["kaki"] }).success).toBe(false);
  });

  it("rejects a missing category and an out-of-range warmth", () => {
    const result = garmentInputSchema.safeParse({ ...validInput, category: null, warmth: 4 });
    const errors = fieldErrors(result.error!);
    expect(errors.category).toBe("Choisissez une catégorie.");
    expect(errors.warmth).toBe("Choisissez un niveau de chaleur.");
  });
});

describe("toGarment", () => {
  const row: GarmentRow = {
    id: "g1",
    name: "Bottines",
    category: "shoes",
    colors: ["brown", "unknown-legacy-colour"],
    seasons: ["autumn", "winter"],
    warmth: 3,
    rain_ok: true,
    photo_path: `${USER_ID}/g1.jpg`,
    garment_occasions: [{ occasion_id: "o1" }, { occasion_id: "o2" }],
  };

  it("maps a database row to the domain model", () => {
    expect(toGarment(row)).toEqual({
      id: "g1",
      name: "Bottines",
      category: "shoes",
      colors: ["brown"],
      seasons: ["autumn", "winter"],
      occasionIds: ["o1", "o2"],
      warmth: 3,
      rainOk: true,
      photoPath: `${USER_ID}/g1.jpg`,
    });
  });
});

describe("photoPath", () => {
  it("stores photos in the owner's folder with the right extension", () => {
    expect(photoPath(USER_ID, "image/webp", "abc")).toBe(`${USER_ID}/abc.webp`);
    expect(photoPath(USER_ID, "image/jpeg", "abc")).toBe(`${USER_ID}/abc.jpg`);
  });

  it("rejects other formats", () => {
    expect(() => photoPath(USER_ID, "image/png")).toThrow("Unsupported photo type");
  });
});

describe("isOwnPhotoPath", () => {
  const file = "0b6d2f4e-5c1a-4b8e-9f3d-2a7c6e1b9d40.webp";

  it("accepts a path built by photoPath for this user", () => {
    expect(isOwnPhotoPath(USER_ID, photoPath(USER_ID, "image/webp"))).toBe(true);
    expect(isOwnPhotoPath(USER_ID, photoPath(USER_ID, "image/jpeg"))).toBe(true);
  });

  it.each([
    ["another user's folder", `00000000-0000-4000-8000-000000000000/${file}`],
    ["a parent folder", `${USER_ID}/../00000000-0000-4000-8000-000000000000/${file}`],
    ["a sub-folder", `${USER_ID}/sub/${file}`],
    ["an unexpected file name", `${USER_ID}/photo.webp`],
    ["another extension", `${USER_ID}/${file.replace(".webp", ".svg")}`],
    ["the bare folder", `${USER_ID}/`],
  ])("rejects %s", (_, path) => {
    expect(isOwnPhotoPath(USER_ID, path)).toBe(false);
  });
});

describe("isCategory", () => {
  it("only accepts known categories", () => {
    expect(isCategory("shoes")).toBe(true);
    expect(isCategory("hat")).toBe(false);
    expect(isCategory(undefined)).toBe(false);
  });
});

describe("saveGarmentErrorMessage", () => {
  it.each([
    ["23514", "Vérifiez le formulaire"],
    ["23503", "n'existe plus"],
    ["P0002", "Ce vêtement n'existe plus."],
    ["XX000", "Enregistrement impossible"],
  ])("maps %s", (code, expected) => {
    expect(saveGarmentErrorMessage({ code })).toContain(expected);
  });
});
