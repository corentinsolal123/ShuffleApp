import { z } from "zod";

export type Invitation = {
  email: string;
  createdAt: string;
  /** When the invited person created their account, null while pending. */
  acceptedAt: string | null;
};

export const invitationEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Adresse email invalide.").max(254, "Adresse email invalide."));
