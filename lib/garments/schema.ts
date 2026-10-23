import { z } from "zod";
import { COLOR_KEYS } from "@/lib/palette";
import { CATEGORIES, MAX_COLORS, SEASONS } from "./model";

/** Validates garment form data, on the client before upload and again in the server action. */
export const garmentInputSchema = z.object({
  id: z.uuid().nullable(),
  name: z
    .string()
    .trim()
    .min(1, "Donnez un nom au vêtement.")
    .max(60, "60 caractères maximum."),
  category: z.enum(CATEGORIES, { error: "Choisissez une catégorie." }),
  colors: z
    .array(z.enum(COLOR_KEYS))
    .min(1, "Choisissez au moins une couleur.")
    .max(MAX_COLORS, `${MAX_COLORS} couleurs maximum.`),
  seasons: z.array(z.enum(SEASONS)),
  occasionIds: z.array(z.uuid()).min(1, "Choisissez au moins une occasion."),
  warmth: z.union([z.literal(1), z.literal(2), z.literal(3)], { error: "Choisissez un niveau de chaleur." }),
  rainOk: z.boolean(),
  photoPath: z.string().min(1, "Ajoutez une photo."),
});

export type GarmentInput = z.infer<typeof garmentInputSchema>;

export type GarmentFieldErrors = Partial<Record<keyof GarmentInput, string>>;

/** First error message per field, for display next to each control. */
export function fieldErrors(error: z.ZodError<GarmentInput>): GarmentFieldErrors {
  const errors: GarmentFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof GarmentInput | undefined;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
