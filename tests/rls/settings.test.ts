import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser, localSupabase, type TestUser } from "./helpers";

async function occasionId(user: TestUser, name: string): Promise<string> {
  const { data } = await user.client.from("occasions").select("id").eq("name", name).single();
  return data!.id;
}

async function garmentWith(user: TestUser, occasionIds: string[]): Promise<string> {
  const { data, error } = await user.client.rpc("save_garment", {
    p_id: null,
    p_name: "g",
    p_category: "top",
    p_colors: ["black"],
    p_seasons: [],
    p_warmth: 2,
    p_rain_ok: false,
    p_photo_path: `${user.id}/${crypto.randomUUID()}.webp`,
    p_occasion_ids: occasionIds,
  });
  if (error) throw error;
  return data;
}

describe.skipIf(!localSupabase)("RLS: settings", () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    alice = await createTestUser("alice");
    bob = await createTestUser("bob");
  });

  afterAll(async () => {
    await deleteTestUser(alice);
    await deleteTestUser(bob);
  });

  it("lets a user update only their own profile", async () => {
    const own = await alice.client
      .from("profiles")
      .update({ default_city: "Lyon", default_latitude: 45.75, default_longitude: 4.85 })
      .eq("id", alice.id)
      .select("default_city");
    expect(own.data).toEqual([{ default_city: "Lyon" }]);

    const other = await alice.client.from("profiles").update({ default_city: "Pirate" }).eq("id", bob.id).select();
    expect(other.data).toEqual([]);
  });

  it("refuses a city with only one coordinate", async () => {
    const { error } = await alice.client
      .from("profiles")
      .update({ default_latitude: 1, default_longitude: null })
      .eq("id", alice.id);
    expect(error?.code).toBe("23514");
  });

  it("refuses to delete an occasion that some garments only have", async () => {
    const work = await occasionId(alice, "Travail");
    await garmentWith(alice, [work]);

    const { error } = await alice.client.rpc("delete_occasion", { p_id: work });
    expect(error?.hint).toBe("sole_occasion");
  });

  it("moves those garments to the replacement, then deletes", async () => {
    const work = await occasionId(alice, "Travail");
    const party = await occasionId(alice, "Soirée");

    const { error } = await alice.client.rpc("delete_occasion", { p_id: work, p_replacement_id: party });
    expect(error).toBeNull();

    const { data: links } = await alice.client.from("garment_occasions").select("occasion_id");
    expect(links?.map((link) => link.occasion_id)).toEqual([party]);
  });

  it("cannot use another user's occasion as replacement, nor delete it", async () => {
    const party = await occasionId(alice, "Soirée");
    const bobDaily = await occasionId(bob, "Quotidien");

    const replaced = await alice.client.rpc("delete_occasion", { p_id: party, p_replacement_id: bobDaily });
    expect(replaced.error).not.toBeNull();

    const stolen = await alice.client.rpc("delete_occasion", { p_id: bobDaily });
    expect(stolen.error?.code).toBe("P0002");
  });

  it("always keeps one occasion", async () => {
    const { data: remaining } = await alice.client.from("occasions").select("id, name");
    for (const occasion of remaining!.slice(1)) {
      const { error } = await alice.client.rpc("delete_occasion", {
        p_id: occasion.id,
        p_replacement_id: remaining![0]!.id,
      });
      expect(error).toBeNull();
    }

    const last = await alice.client.rpc("delete_occasion", { p_id: remaining![0]!.id });
    expect(last.error?.hint).toBe("last_occasion");
  });
});
