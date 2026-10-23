import type { PostgrestError } from "@supabase/supabase-js";

/** Maps database errors raised while saving a garment to user-facing messages. */
export function saveGarmentErrorMessage(error: Pick<PostgrestError, "code">): string {
  switch (error.code) {
    case "23514":
      return "Vérifiez le formulaire : une occasion au moins, trois couleurs au plus.";
    case "23503":
      return "Une des occasions choisies n'existe plus. Rechargez la page.";
    case "P0002":
      return "Ce vêtement n'existe plus.";
    default:
      return "Enregistrement impossible. Réessayez.";
  }
}
