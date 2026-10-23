// Predefined colour palette. Keys are stored in garments.colors and must stay
// in sync with public.palette_colors() in supabase/migrations (see tests/unit/palette.test.ts).

export const PALETTE = [
  { key: "black", label: "Noir", swatch: "#000000" },
  { key: "white", label: "Blanc", swatch: "#ffffff" },
  { key: "grey", label: "Gris", swatch: "#9e9e9e" },
  { key: "beige", label: "Beige", swatch: "#d8c3a5" },
  { key: "brown", label: "Marron", swatch: "#6b4423" },
  { key: "navy", label: "Bleu marine", swatch: "#1f2a44" },
  { key: "blue", label: "Bleu", swatch: "#3b6fb6" },
  { key: "green", label: "Vert", swatch: "#3f7d4e" },
  { key: "red", label: "Rouge", swatch: "#c62828" },
  { key: "burgundy", label: "Bordeaux", swatch: "#7b1e2b" },
  { key: "pink", label: "Rose", swatch: "#e8a0b4" },
  { key: "yellow", label: "Jaune", swatch: "#f2c94c" },
  { key: "orange", label: "Orange", swatch: "#e67e22" },
  {
    key: "pattern",
    label: "Motif",
    swatch: "repeating-linear-gradient(45deg, #000000 0 4px, #ffffff 4px 8px)",
  },
] as const;

export type ColorKey = (typeof PALETTE)[number]["key"];

export const COLOR_KEYS = PALETTE.map((color) => color.key) as [ColorKey, ...ColorKey[]];

const BY_KEY = new Map<string, (typeof PALETTE)[number]>(PALETTE.map((color) => [color.key, color]));

export function isColorKey(value: string): value is ColorKey {
  return BY_KEY.has(value);
}

export function colorLabel(key: ColorKey): string {
  return BY_KEY.get(key)?.label ?? key;
}

export function colorSwatch(key: ColorKey): string {
  return BY_KEY.get(key)?.swatch ?? "transparent";
}
