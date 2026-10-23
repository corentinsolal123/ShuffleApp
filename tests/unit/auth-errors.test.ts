import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth/errors";

describe("authErrorMessage", () => {
  it.each([
    ["otp_expired", 403, "Code invalide ou expiré."],
    ["over_email_send_rate_limit", 429, "Trop de tentatives. Réessayez dans quelques minutes."],
    ["email_address_invalid", 400, "Adresse email invalide."],
  ])("maps %s", (code, status, expected) => {
    expect(authErrorMessage({ code, status })).toBe(expected);
  });

  it("falls back on the HTTP status for unknown rate limits", () => {
    expect(authErrorMessage({ code: undefined, status: 429 })).toContain("Trop de tentatives");
  });

  it("returns a generic message otherwise", () => {
    expect(authErrorMessage({ code: "unexpected_failure", status: 500 })).toBe("Une erreur est survenue. Réessayez.");
  });
});
