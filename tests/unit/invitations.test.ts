import { describe, expect, it } from "vitest";
import { invitationEmailSchema } from "@/lib/invitations/model";

describe("invitationEmailSchema", () => {
  it("trims and lowercases the address, as the database requires", () => {
    expect(invitationEmailSchema.parse("  Ami@Exemple.FR ")).toBe("ami@exemple.fr");
  });

  it.each(["", "ami", "ami@", "@exemple.fr", `${"a".repeat(250)}@exemple.fr`])("rejects %j", (email) => {
    const result = invitationEmailSchema.safeParse(email);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Adresse email invalide.");
  });
});
