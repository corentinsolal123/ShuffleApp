import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, anonClient, createTestUser, deleteTestUser, localSupabase, type TestUser } from "./helpers";

function inviteeEmail(label: string): string {
  return `${label}-${crypto.randomUUID()}@invite.test`;
}

describe.skipIf(!localSupabase)("Invitations: RLS and the before-user-created hook", () => {
  let admin: TestUser;
  let member: TestUser;
  const created: string[] = [];

  beforeAll(async () => {
    admin = await createTestUser("admin", { admin: true });
    member = await createTestUser("member");
  });

  afterAll(async () => {
    await deleteTestUser(admin);
    await deleteTestUser(member);
    for (const email of created) {
      const { data } = await adminClient().auth.admin.listUsers();
      const user = data.users.find((candidate) => candidate.email === email);
      if (user) await adminClient().auth.admin.deleteUser(user.id);
    }
  });

  it("lets an admin list, add and remove invitations", async () => {
    const email = inviteeEmail("friend");
    expect((await admin.client.from("invitations").insert({ email })).error).toBeNull();

    const { data } = await admin.client.from("invitations").select("email, invited_by").eq("email", email).single();
    expect(data).toEqual({ email, invited_by: admin.id });

    const removed = await admin.client.from("invitations").delete().eq("email", email).select("email");
    expect(removed.data).toEqual([{ email }]);
  });

  it("hides invitations from other users and visitors, and refuses their writes", async () => {
    const email = inviteeEmail("hidden");
    await admin.client.from("invitations").insert({ email });

    expect((await member.client.from("invitations").select("email")).data).toEqual([]);
    expect((await anonClient().from("invitations").select("email")).data ?? []).toEqual([]);

    const insert = await member.client.from("invitations").insert({ email: inviteeEmail("intruder") });
    expect(insert.error?.code).toBe("42501");

    const removed = await member.client.from("invitations").delete().eq("email", email).select("email");
    expect(removed.data).toEqual([]);
  });

  it("does not let a user make themselves admin through user metadata", async () => {
    await member.client.auth.updateUser({ data: { admin: true } });
    await member.client.auth.refreshSession();

    const { data } = await member.client.rpc("is_admin");
    expect(data).toBe(false);
    expect((await member.client.from("invitations").insert({ email: inviteeEmail("self") })).error?.code).toBe(
      "42501",
    );
  });

  it("only stores normalised addresses", async () => {
    const { error } = await admin.client.from("invitations").insert({ email: "Ami@Exemple.fr" });
    expect(error?.code).toBe("23514");
  });

  it("refuses to create an account for an address that is not invited", async () => {
    const email = inviteeEmail("stranger");
    const { error } = await anonClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });

    expect(error?.status).toBe(403);
    expect(error?.message).toMatch(/not been invited/);
    const { data } = await adminClient().auth.admin.listUsers();
    expect(data.users.some((user) => user.email === email)).toBe(false);
  });

  it("creates the account of an invited address and marks the invitation accepted", async () => {
    const email = inviteeEmail("guest");
    created.push(email);
    await admin.client.from("invitations").insert({ email });

    const { error } = await anonClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    expect(error).toBeNull();

    const { data } = await admin.client.from("invitations").select("accepted_at").eq("email", email).single();
    expect(data?.accepted_at).not.toBeNull();
  });
});
