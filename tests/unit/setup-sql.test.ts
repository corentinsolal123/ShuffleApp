import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const supabaseDir = join(process.cwd(), "supabase");

describe("supabase/setup.sql", () => {
  it("contains every migration, in order (regenerate with `pnpm db:bundle`)", () => {
    const setup = readFileSync(join(supabaseDir, "setup.sql"), "utf-8");
    const migrations = readdirSync(join(supabaseDir, "migrations"))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    let cursor = 0;
    for (const file of migrations) {
      const content = readFileSync(join(supabaseDir, "migrations", file), "utf-8").trim();
      const position = setup.indexOf(content, cursor);
      expect(position, `${file} is missing or out of order`).toBeGreaterThanOrEqual(0);
      cursor = position + content.length;
    }
    expect(setup.trimEnd().endsWith("commit;")).toBe(true);
  });
});
