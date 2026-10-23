import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser, localSupabase, type TestUser } from "./helpers";

/** Inserts a garment row directly (the photo file itself is irrelevant to these rules). */
async function createGarment(user: TestUser, category: "top" | "bottom" | "shoes"): Promise<string> {
  const { data, error } = await user.client
    .from("garments")
    .insert({ name: category, category, colors: ["black"], warmth: 2, photo_path: `${user.id}/${category}.webp` })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

describe.skipIf(!localSupabase)("RLS: compatibility rules", () => {
  let alice: TestUser;
  let bob: TestUser;
  let top: string;
  let otherTop: string;
  let bottom: string;
  let bobBottom: string;

  beforeAll(async () => {
    alice = await createTestUser("alice");
    bob = await createTestUser("bob");
    [top, otherTop, bottom, bobBottom] = await Promise.all([
      createGarment(alice, "top"),
      createGarment(alice, "top"),
      createGarment(alice, "bottom"),
      createGarment(bob, "bottom"),
    ]);
  });

  afterAll(async () => {
    await deleteTestUser(alice);
    await deleteTestUser(bob);
  });

  describe("garment_exclusions", () => {
    it("stores the pair in canonical order and rejects the reversed duplicate", async () => {
      const [high, low] = top > bottom ? [top, bottom] : [bottom, top];
      const { data, error } = await alice.client
        .from("garment_exclusions")
        .insert({ garment_a_id: high, garment_b_id: low })
        .select("garment_a_id, garment_b_id")
        .single();
      expect(error).toBeNull();
      expect(data).toEqual({ garment_a_id: low, garment_b_id: high });

      const duplicate = await alice.client.from("garment_exclusions").insert({ garment_a_id: low, garment_b_id: high });
      expect(duplicate.error?.code).toBe("23505");
    });

    it("rejects two garments of the same category", async () => {
      const { error } = await alice.client.from("garment_exclusions").insert({ garment_a_id: top, garment_b_id: otherTop });
      expect(error?.code).toBe("23514");
    });

    it("cannot reference another user's garment", async () => {
      const { error } = await alice.client.from("garment_exclusions").insert({ garment_a_id: top, garment_b_id: bobBottom });
      expect(error).not.toBeNull();
    });

    it("is invisible to other users and deleted with its garment", async () => {
      const { data: seenByBob } = await bob.client.from("garment_exclusions").select("id");
      expect(seenByBob).toEqual([]);

      await alice.client.from("garments").delete().eq("id", bottom);
      const { data: remaining } = await alice.client.from("garment_exclusions").select("id");
      expect(remaining).toEqual([]);
    });
  });

  describe("color_exclusions", () => {
    it("normalises the pair, allows the same colour twice and rejects duplicates", async () => {
      const { data } = await alice.client
        .from("color_exclusions")
        .insert({ color_a: "brown", color_b: "black" })
        .select("color_a, color_b")
        .single();
      expect(data).toEqual({ color_a: "black", color_b: "brown" });

      const same = await alice.client.from("color_exclusions").insert({ color_a: "black", color_b: "black" });
      expect(same.error).toBeNull();

      const duplicate = await alice.client.from("color_exclusions").insert({ color_a: "black", color_b: "brown" });
      expect(duplicate.error?.code).toBe("23505");
    });

    it("rejects colours outside the palette", async () => {
      const { error } = await alice.client.from("color_exclusions").insert({ color_a: "kaki", color_b: "black" });
      expect(error?.code).toBe("23514");
    });

    it("keeps rules per user", async () => {
      const { data: seenByBob } = await bob.client.from("color_exclusions").select("id");
      expect(seenByBob).toEqual([]);

      // The same pair is allowed for another user.
      const { error } = await bob.client.from("color_exclusions").insert({ color_a: "black", color_b: "brown" });
      expect(error).toBeNull();
    });
  });
});
