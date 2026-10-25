import type { AuthError } from "@supabase/supabase-js";

export const GENERIC_AUTH_ERROR = "Une erreur est survenue. Réessayez.";

/** Maps Supabase auth errors to user-facing French messages. */
export function authErrorMessage(error: Pick<AuthError, "code" | "status" | "message">): string {
  switch (error.code) {
    case "otp_expired":
      return "Code invalide ou expiré.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Trop de tentatives. Réessayez dans quelques minutes.";
    case "email_address_invalid":
      return "Adresse email invalide.";
    case "signup_disabled":
      return "Les inscriptions sont fermées.";
  }
  // Raised by the before-user-created hook (supabase/migrations/20261028000000_invitations.sql).
  if (error.status === 403 && /not been invited/i.test(error.message)) {
    return "Cette adresse n'a pas été invitée.";
  }
  if (error.status === 429) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  return GENERIC_AUTH_ERROR;
}
