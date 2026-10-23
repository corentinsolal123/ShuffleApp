import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR_KEYS, PALETTE, colorLabel } from "@/lib/palette";

describe("palette", () => {
  it("matches public.palette_colors() used by the database constraints", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20261025000000_exclusion_rules.sql"),
      "utf-8",
    );
    const body = migration.match(/function public\.palette_colors\(\)[\s\S]*?array\[([^\]]+)\]/)?.[1];
    const sqlKeys = [...(body ?? "").matchAll(/'([a-z]+)'/g)].map((match) => match[1]);

    expect(sqlKeys).toEqual(COLOR_KEYS);
  });

  it("has unique keys and labels", () => {
    expect(new Set(PALETTE.map((c) => c.key)).size).toBe(PALETTE.length);
    expect(new Set(PALETTE.map((c) => c.label)).size).toBe(PALETTE.length);
  });

  it("labels colours in French", () => {
    expect(colorLabel("navy")).toBe("Bleu marine");
    expect(colorLabel("pattern")).toBe("Motif");
  });
});
