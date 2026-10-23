import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, createTestUser, deleteTestUser, localSupabase, type TestUser } from "./helpers";

describe.skipIf(!localSupabase)("RLS: profiles & occasions", () => {
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

  it("bootstraps a profile and the default occasions for a new user", async () => {
    const { data: profiles } = await alice.client.from("profiles").select("id");
    expect(profiles).toEqual([{ id: alice.id }]);

    const { data: occasions } = await alice.client.from("occasions").select("name").order("position");
    expect(occasions?.map((o) => o.name)).toEqual(["Quotidien", "Travail", "Sport", "Soirée"]);
  });

  it("only exposes the user's own rows", async () => {
    const { data: occasions } = await alice.client.from("occasions").select("user_id");
    expect(occasions?.every((o) => o.user_id === alice.id)).toBe(true);

    const { data: bobProfile } = await alice.client.from("profiles").select("id").eq("id", bob.id);
    expect(bobProfile).toEqual([]);
  });

  it("defaults user_id to the caller and refuses inserts for someone else", async () => {
    const { data: own, error } = await alice.client.from("occasions").insert({ name: "Plage" }).select().single();
    expect(error).toBeNull();
    expect(own?.user_id).toBe(alice.id);

    const { error: forged } = await alice.client.from("occasions").insert({ name: "Pirate", user_id: bob.id });
    expect(forged?.code).toBe("42501");
  });

  it("cannot update or delete another user's rows", async () => {
    const { data: updated } = await alice.client
      .from("occasions")
      .update({ name: "Piraté" })
      .eq("user_id", bob.id)
      .select();
    expect(updated).toEqual([]);

    const { data: deleted } = await alice.client.from("occasions").delete().eq("user_id", bob.id).select();
    expect(deleted).toEqual([]);

    const { count } = await bob.client.from("occasions").select("*", { count: "exact", head: true });
    expect(count).toBe(4);
  });

  it("rejects duplicate occasion names, case-insensitively", async () => {
    const { error } = await alice.client.from("occasions").insert({ name: "quotidien" });
    expect(error?.code).toBe("23505");
  });

  it("shows nothing to anonymous visitors", async () => {
    const anon = anonClient();
    const occasions = await anon.from("occasions").select("id");
    const profiles = await anon.from("profiles").select("id");
    expect(occasions.data ?? []).toEqual([]);
    expect(profiles.data ?? []).toEqual([]);
  });
});
