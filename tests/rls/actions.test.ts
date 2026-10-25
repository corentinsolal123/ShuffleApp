import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db/types";
import { GARMENT_PHOTOS_BUCKET, photoPath } from "@/lib/garments/photo";
import type { GarmentInput } from "@/lib/garments/schema";
import { adminClient, anonClient, createTestUser, deleteTestUser, localSupabase, type TestUser } from "./helpers";

// The server actions run for real against the local Supabase: only the cookie-based
// client is swapped for the client of the user the test acts as.
const acting = vi.hoisted(() => ({ client: null as SupabaseClient<Database> | null }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    if (!acting.client) throw new Error("No acting user");
    return acting.client;
  },
}));

const { deleteGarment, saveGarment } = await import("@/app/(app)/wardrobe/actions");
const { createColorExclusion, createGarmentExclusions, deleteColorExclusion } = await import(
  "@/app/(app)/rules/actions"
);
const { createOccasion, deleteOccasion, inviteEmail, renameOccasion, revokeInvitation, saveDefaultCity } =
  await import("@/app/(app)/settings/actions");

const PHOTO = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: "image/webp" });

function actAs(user: TestUser | null) {
  acting.client = user ? user.client : anonClient();
}

async function occasionId(user: TestUser, name: string): Promise<string> {
  const { data } = await user.client.from("occasions").select("id").eq("name", name).single();
  return data!.id;
}

async function uploadPhoto(user: TestUser): Promise<string> {
  const path = photoPath(user.id, "image/webp");
  const { error } = await user.client.storage.from(GARMENT_PHOTOS_BUCKET).upload(path, PHOTO, {
    contentType: "image/webp",
  });
  if (error) throw error;
  return path;
}

async function photoExists(user: TestUser, path: string): Promise<boolean> {
  const { data } = await user.client.storage.from(GARMENT_PHOTOS_BUCKET).exists(path);
  return data;
}

async function garmentInput(user: TestUser, overrides: Partial<GarmentInput> = {}): Promise<GarmentInput> {
  return {
    id: null,
    name: "Chemise",
    category: "top",
    colors: ["white"],
    seasons: [],
    occasionIds: [await occasionId(user, "Travail")],
    warmth: 1,
    rainOk: false,
    photoPath: await uploadPhoto(user),
    ...overrides,
  };
}

async function createGarment(user: TestUser, overrides: Partial<GarmentInput> = {}): Promise<string> {
  actAs(user);
  const result = await saveGarment(await garmentInput(user, overrides));
  if (!result.ok) throw new Error(result.error);
  return result.id;
}

describe.skipIf(!localSupabase)("Server actions against the local Supabase", () => {
  let alice: TestUser;
  let bob: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    alice = await createTestUser("alice");
    bob = await createTestUser("bob");
    admin = await createTestUser("admin", { admin: true });
  });

  afterAll(async () => {
    await deleteTestUser(alice);
    await deleteTestUser(bob);
    await deleteTestUser(admin);
  });

  beforeEach(() => {
    acting.client = null;
  });

  describe("authentication", () => {
    it("redirects anonymous visitors to /login before touching any data", async () => {
      actAs(null);
      await expect(createOccasion("Plage")).rejects.toMatchObject({ digest: expect.stringContaining("/login") });
      await expect(deleteGarment(crypto.randomUUID())).rejects.toMatchObject({
        digest: expect.stringContaining("/login"),
      });
    });
  });

  describe("wardrobe", () => {
    it("creates a garment, then replaces its photo and removes the old file", async () => {
      const input = await garmentInput(alice);
      actAs(alice);
      const created = await saveGarment(input);
      expect(created.ok).toBe(true);
      const id = created.ok ? created.id : "";

      const newPhoto = await uploadPhoto(alice);
      const updated = await saveGarment({ ...input, id, name: "Chemise blanche", photoPath: newPhoto });
      expect(updated).toEqual({ ok: true, id });

      const { data } = await alice.client.from("garments").select("name, photo_path").eq("id", id).single();
      expect(data).toEqual({ name: "Chemise blanche", photo_path: newPhoto });
      expect(await photoExists(alice, input.photoPath)).toBe(false);
      expect(await photoExists(alice, newPhoto)).toBe(true);
    });

    it("refuses a photo outside the user's own folder", async () => {
      const bobPhoto = await uploadPhoto(bob);
      const input = await garmentInput(alice);
      actAs(alice);

      for (const path of [bobPhoto, `${alice.id}/../${bobPhoto}`]) {
        expect(await saveGarment({ ...input, photoPath: path })).toEqual({ ok: false, error: "Photo invalide." });
      }
      const { data } = await alice.client.from("garments").select("id").eq("photo_path", bobPhoto);
      expect(data).toEqual([]);
    });

    it("does not let a user edit or delete someone else's garment", async () => {
      const aliceGarment = await createGarment(alice, { name: "Pull" });

      actAs(bob);
      const edit = await saveGarment(await garmentInput(bob, { id: aliceGarment, name: "Volé" }));
      expect(edit).toEqual({ ok: false, error: "Ce vêtement n'existe plus." });
      expect(await deleteGarment(aliceGarment)).toEqual({ ok: false, error: "Vêtement introuvable." });

      const { data } = await alice.client.from("garments").select("name").eq("id", aliceGarment).single();
      expect(data?.name).toBe("Pull");
    });

    it("deletes the user's own garment and its photo", async () => {
      const input = await garmentInput(alice);
      actAs(alice);
      const created = await saveGarment(input);
      const id = created.ok ? created.id : "";

      expect(await deleteGarment(id)).toEqual({ ok: true });
      const { data } = await alice.client.from("garments").select("id").eq("id", id);
      expect(data).toEqual([]);
      expect(await photoExists(alice, input.photoPath)).toBe(false);
    });

    it("rejects invalid input without calling the database", async () => {
      actAs(alice);
      expect(await deleteGarment("not-a-uuid")).toEqual({ ok: false, error: "Vêtement introuvable." });
      const invalid = await saveGarment({ ...(await garmentInput(alice)), colors: [] });
      expect(invalid).toMatchObject({ ok: false, fieldErrors: { colors: "Choisissez au moins une couleur." } });
    });
  });

  describe("rules", () => {
    it("only excludes garments of the same user, from different categories", async () => {
      const top = await createGarment(alice, { category: "top" });
      const otherTop = await createGarment(alice, { category: "top" });
      const bottom = await createGarment(alice, { category: "bottom" });
      const bobBottom = await createGarment(bob, { category: "bottom" });

      actAs(alice);
      expect(await createGarmentExclusions(top, [bottom])).toEqual({ ok: true });
      expect(await createGarmentExclusions(top, [otherTop])).toEqual({
        ok: false,
        error: "Deux vêtements de la même catégorie ne peuvent pas être exclus ensemble.",
      });
      expect(await createGarmentExclusions(top, [bobBottom])).toEqual({
        ok: false,
        error: "Un des vêtements n'existe plus. Rechargez la page.",
      });
      expect(await createGarmentExclusions(top, [top])).toEqual({ ok: false, error: "Sélection invalide." });
    });

    it("reports duplicate colour rules and keeps other users' rules out of reach", async () => {
      actAs(alice);
      expect(await createColorExclusion("red", "pink")).toEqual({ ok: true });
      expect(await createColorExclusion("pink", "red")).toEqual({ ok: false, error: "Cette règle existe déjà." });
      expect(await createColorExclusion("red", "plaid")).toEqual({ ok: false, error: "Choisissez deux couleurs." });

      const { data: rule } = await alice.client.from("color_exclusions").select("id").single();
      actAs(bob);
      await deleteColorExclusion(rule!.id);
      const { data } = await alice.client.from("color_exclusions").select("id");
      expect(data).toEqual([rule]);
    });
  });

  describe("settings", () => {
    it("updates only the acting user's default city", async () => {
      actAs(bob);
      expect(await saveDefaultCity({ name: "Lyon", latitude: 45.76, longitude: 4.84 })).toEqual({ ok: true });
      expect(await saveDefaultCity({ name: "Nulle part", latitude: 120, longitude: 0 })).toEqual({
        ok: false,
        error: "Ville invalide.",
      });

      const { data: own } = await bob.client.from("profiles").select("default_city").single();
      const { data: other } = await alice.client.from("profiles").select("default_city").single();
      expect(own?.default_city).toBe("Lyon");
      expect(other?.default_city).toBeNull();
    });

    it("creates and renames occasions, reporting duplicates", async () => {
      actAs(alice);
      expect(await createOccasion("Plage")).toEqual({ ok: true });
      expect(await createOccasion("plage")).toEqual({ ok: false, error: "Cette occasion existe déjà." });
      expect(await createOccasion("   ")).toEqual({ ok: false, error: "Donnez un nom à l'occasion." });

      const beach = await occasionId(alice, "Plage");
      expect(await renameOccasion(beach, "Sport")).toEqual({ ok: false, error: "Cette occasion existe déjà." });
      expect(await renameOccasion(beach, "Vacances")).toEqual({ ok: true });

      actAs(bob);
      expect(await renameOccasion(beach, "Volée")).toEqual({ ok: false, error: "Occasion introuvable." });
    });

    it("moves garments to the replacement when deleting their only occasion", async () => {
      const sport = await occasionId(alice, "Sport");
      const garment = await createGarment(alice, { occasionIds: [sport] });

      actAs(alice);
      expect(await deleteOccasion(sport, null)).toEqual({
        ok: false,
        error: "Des vêtements n'ont que cette occasion : choisissez celle qui la remplace.",
      });

      const everyday = await occasionId(alice, "Quotidien");
      expect(await deleteOccasion(sport, everyday)).toEqual({ ok: true });
      const { data } = await alice.client.from("garment_occasions").select("occasion_id").eq("garment_id", garment);
      expect(data).toEqual([{ occasion_id: everyday }]);

      actAs(bob);
      expect(await deleteOccasion(everyday, null)).toEqual({ ok: false, error: "Cette occasion n'existe plus." });
    });
  });

  describe("invitations", () => {
    it("lets only the admin invite, normalising the address", async () => {
      const email = `Ami-${crypto.randomUUID()}@Exemple.fr`;

      actAs(alice);
      expect(await inviteEmail(email)).toEqual({ ok: false, error: "Réservé à l'administrateur." });

      actAs(admin);
      expect(await inviteEmail(`  ${email} `)).toEqual({ ok: true });
      expect(await inviteEmail(email)).toEqual({ ok: false, error: "Cette adresse est déjà invitée." });
      expect(await inviteEmail("pas-une-adresse")).toEqual({ ok: false, error: "Adresse email invalide." });

      const { data } = await admin.client.from("invitations").select("email").eq("email", email.toLowerCase());
      expect(data).toEqual([{ email: email.toLowerCase() }]);
    });

    it("cancels pending invitations only", async () => {
      const pending = `pending-${crypto.randomUUID()}@exemple.fr`;
      const accepted = `accepted-${crypto.randomUUID()}@exemple.fr`;
      actAs(admin);
      await inviteEmail(pending);
      await inviteEmail(accepted);
      await adminClient().from("invitations").update({ accepted_at: new Date().toISOString() }).eq("email", accepted);

      actAs(bob);
      expect(await revokeInvitation(pending)).toEqual({ ok: false, error: "Réservé à l'administrateur." });

      actAs(admin);
      expect(await revokeInvitation(accepted)).toEqual({ ok: false, error: "Invitation introuvable." });
      expect(await revokeInvitation(pending)).toEqual({ ok: true });
      const { data } = await admin.client.from("invitations").select("email").in("email", [pending, accepted]);
      expect(data).toEqual([{ email: accepted }]);
    });
  });
});
