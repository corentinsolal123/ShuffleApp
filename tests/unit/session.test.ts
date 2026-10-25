import { beforeEach, describe, expect, it, vi } from "vitest";

const claims = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims: async () => ({ data: claims.value && { claims: claims.value } }) } }),
}));

const { getSessionEmail, isAdmin, requireUserId } = await import("@/lib/auth/session");

beforeEach(() => {
  claims.value = null;
});

describe("session helpers", () => {
  it("returns the signed-in user's id and email", async () => {
    claims.value = { sub: "user-1", email: "moi@exemple.fr", app_metadata: {} };
    expect(await requireUserId()).toBe("user-1");
    expect(await getSessionEmail()).toBe("moi@exemple.fr");
  });

  it("sends anonymous visitors to /login", async () => {
    await expect(requireUserId()).rejects.toThrow("redirect:/login");
    expect(await getSessionEmail()).toBeNull();
  });

  it("only treats app_metadata.admin === true as admin", async () => {
    expect(await isAdmin()).toBe(false);

    claims.value = { sub: "user-1", app_metadata: { admin: "true" }, user_metadata: { admin: true } };
    expect(await isAdmin()).toBe(false);

    claims.value = { sub: "user-1", app_metadata: { admin: true } };
    expect(await isAdmin()).toBe(true);
  });
});
