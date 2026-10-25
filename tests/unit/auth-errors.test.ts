import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth/errors";

describe("authErrorMessage", () => {
  it.each([
    ["otp_expired", 403, "Code invalide ou expiré."],
    ["over_email_send_rate_limit", 429, "Trop de tentatives. Réessayez dans quelques minutes."],
    ["email_address_invalid", 400, "Adresse email invalide."],
  ])("maps %s", (code, status, expected) => {
    expect(authErrorMessage({ code, status, message: "" })).toBe(expected);
  });

  it("falls back on the HTTP status for unknown rate limits", () => {
    expect(authErrorMessage({ code: undefined, status: 429, message: "" })).toContain("Trop de tentatives");
  });

  it("explains that sign-ups are by invitation", () => {
    const error = { code: "unknown", status: 403, message: "This email address has not been invited." };
    expect(authErrorMessage(error)).toBe("Cette adresse n'a pas été invitée.");
  });

  it("returns a generic message otherwise", () => {
    expect(authErrorMessage({ code: "unexpected_failure", status: 500, message: "" })).toBe(
      "Une erreur est survenue. Réessayez.",
    );
    expect(authErrorMessage({ code: "unknown", status: 403, message: "Forbidden" })).toBe(
      "Une erreur est survenue. Réessayez.",
    );
  });
});
