import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GARMENT_PHOTOS_BUCKET } from "@/lib/garments/photo";
import { anonClient, createTestUser, deleteTestUser, localSupabase, type TestUser } from "./helpers";

const PHOTO = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: "image/webp" });

async function firstOccasionId(user: TestUser): Promise<string> {
  const { data } = await user.client.from("occasions").select("id").order("position").limit(1).single();
  return data!.id;
}

async function uploadPhoto(user: TestUser, folder = user.id) {
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await user.client.storage.from(GARMENT_PHOTOS_BUCKET).upload(path, PHOTO, {
    contentType: "image/webp",
  });
  return { path, error };
}

describe.skipIf(!localSupabase)("RLS: garments, occasions links & photos", () => {
  let alice: TestUser;
  let bob: TestUser;
  let aliceGarmentId: string;
  let alicePhotoPath: string;

  beforeAll(async () => {
    alice = await createTestUser("alice");
    bob = await createTestUser("bob");

    const upload = await uploadPhoto(alice);
    expect(upload.error).toBeNull();
    alicePhotoPath = upload.path;

    const { data, error } = await alice.client.rpc("save_garment", {
      p_id: null,
      p_name: "Chemise",
      p_category: "top",
      p_colors: ["white"],
      p_seasons: [],
      p_warmth: 1,
      p_rain_ok: false,
      p_photo_path: alicePhotoPath,
      p_occasion_ids: [await firstOccasionId(alice)],
    });
    expect(error).toBeNull();
    aliceGarmentId = data!;
  });

  afterAll(async () => {
    await deleteTestUser(alice);
    await deleteTestUser(bob);
  });

  it("returns the garment with its occasions to its owner", async () => {
    const { data } = await alice.client
      .from("garments")
      .select("name, garment_occasions(occasion_id)")
      .eq("id", aliceGarmentId)
      .single();
    expect(data?.name).toBe("Chemise");
    expect(data?.garment_occasions).toHaveLength(1);
  });

  it("hides garments and links from other users and anonymous visitors", async () => {
    const { data: garments } = await bob.client.from("garments").select("id");
    const { data: links } = await bob.client.from("garment_occasions").select("garment_id");
    expect(garments).toEqual([]);
    expect(links).toEqual([]);

    const anon = await anonClient().from("garments").select("id");
    expect(anon.data ?? []).toEqual([]);
  });

  it("refuses to update another user's garment through save_garment", async () => {
    const { error } = await bob.client.rpc("save_garment", {
      p_id: aliceGarmentId,
      p_name: "Piratée",
      p_category: "top",
      p_colors: ["black"],
      p_seasons: [],
      p_warmth: 1,
      p_rain_ok: false,
      p_photo_path: `${bob.id}/x.webp`,
      p_occasion_ids: [await firstOccasionId(bob)],
    });
    expect(error?.code).toBe("P0002");
  });

  it("refuses to link a garment to another user's occasion", async () => {
    const { error } = await alice.client.rpc("save_garment", {
      p_id: aliceGarmentId,
      p_name: "Chemise",
      p_category: "top",
      p_colors: ["white"],
      p_seasons: [],
      p_warmth: 1,
      p_rain_ok: false,
      p_photo_path: alicePhotoPath,
      p_occasion_ids: [await firstOccasionId(bob)],
    });
    expect(error?.code).toBe("23503");
  });

  it("requires at least one occasion", async () => {
    const { error } = await alice.client.rpc("save_garment", {
      p_id: aliceGarmentId,
      p_name: "Chemise",
      p_category: "top",
      p_colors: ["white"],
      p_seasons: [],
      p_warmth: 1,
      p_rain_ok: false,
      p_photo_path: alicePhotoPath,
      p_occasion_ids: [],
    });
    expect(error?.code).toBe("23514");
  });

  it("accepts outerwear as a category", async () => {
    const { data: id, error } = await alice.client.rpc("save_garment", {
      p_id: null,
      p_name: "Doudoune",
      p_category: "outerwear",
      p_colors: ["navy"],
      p_seasons: ["winter"],
      p_warmth: 3,
      p_rain_ok: true,
      p_photo_path: alicePhotoPath,
      p_occasion_ids: [await firstOccasionId(alice)],
    });
    expect(error).toBeNull();

    const { data } = await alice.client.from("garments").select("category").eq("id", id!).single();
    expect(data?.category).toBe("outerwear");
  });

  it("keeps photos private to their owner", async () => {
    const own = await alice.client.storage.from(GARMENT_PHOTOS_BUCKET).createSignedUrl(alicePhotoPath, 60);
    expect(own.error).toBeNull();

    const other = await bob.client.storage.from(GARMENT_PHOTOS_BUCKET).createSignedUrl(alicePhotoPath, 60);
    expect(other.error).not.toBeNull();

    const intrusion = await uploadPhoto(bob, alice.id);
    expect(intrusion.error).not.toBeNull();

    const { data: removed } = await bob.client.storage.from(GARMENT_PHOTOS_BUCKET).remove([alicePhotoPath]);
    expect(removed ?? []).toEqual([]);
  });

  it("rejects files that are not WebP or JPEG", async () => {
    const { error } = await alice.client.storage
      .from(GARMENT_PHOTOS_BUCKET)
      .upload(`${alice.id}/${crypto.randomUUID()}.png`, new Blob(["png"], { type: "image/png" }), {
        contentType: "image/png",
      });
    expect(error).not.toBeNull();
  });
});
