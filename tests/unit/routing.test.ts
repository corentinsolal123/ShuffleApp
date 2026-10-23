import { describe, expect, it } from "vitest";
import { isActive } from "@/components/layout/bottom-nav";
import { isPublicPath } from "@/lib/supabase/proxy";

describe("isPublicPath", () => {
  it.each(["/login", "/~offline"])("lets %s through without a session", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(["/", "/wardrobe", "/settings", "/login-admin"])("protects %s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});

describe("bottom nav isActive", () => {
  it("only matches the home tab on /", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/wardrobe", "/")).toBe(false);
  });

  it("matches nested pages of a section", () => {
    expect(isActive("/wardrobe/123", "/wardrobe")).toBe(true);
    expect(isActive("/wardrobe-x", "/wardrobe")).toBe(false);
  });
});
