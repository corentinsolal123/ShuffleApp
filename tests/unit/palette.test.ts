import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR_KEYS, PALETTE, colorLabel } from "@/lib/palette";

describe("palette", () => {
  it("matches the colours allowed by the garments check constraint", () => {
    const migration = readFileSync(join(process.cwd(), "supabase/migrations/20261024000000_garments.sql"), "utf-8");
    const allowed = migration.match(/colors <@ array\[([^\]]+)\]/)?.[1];
    const sqlKeys = [...(allowed ?? "").matchAll(/'([a-z]+)'/g)].map((match) => match[1]);

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
