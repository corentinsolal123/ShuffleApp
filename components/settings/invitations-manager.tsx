"use client";

import { useState, type FormEvent } from "react";
import { inviteEmail, revokeInvitation } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Invitation } from "@/lib/invitations/model";

// Fixed time zone so the server and the browser render the same date.
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

/** Invitation-only sign-ups: emails listed here may create an account. Admins only. */
export function InvitationsManager({ invitations }: { invitations: Invitation[] }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await inviteEmail(email);
      if (result.ok) setEmail("");
      else setError(result.error);
    } catch {
      setError("Enregistrement impossible. Vérifiez la connexion et réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Seules ces adresses peuvent créer un compte. Envoyez le lien de l&apos;app : la personne se connecte avec
        son adresse et reçoit un code.
      </p>

      {invitations.length > 0 && (
        <ul className="border-t">
          {invitations.map((invitation) => (
            <InvitationRow key={invitation.email} invitation={invitation} />
          ))}
        </ul>
      )}

      <form onSubmit={handleInvite} className="flex items-end gap-2">
        <Input
          type="email"
          aria-label="Adresse à inviter"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ami@exemple.fr"
          autoComplete="off"
          inputMode="email"
          disabled={pending}
        />
        <Button type="submit" variant="outline" disabled={pending || !email.includes("@")}>
          Inviter
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function InvitationRow({ invitation }: { invitation: Invitation }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    setPending(true);
    setError(null);
    try {
      const result = await revokeInvitation(invitation.email);
      if (!result.ok) setError(result.error);
    } catch {
      setError("Suppression impossible. Vérifiez la connexion et réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 border-b py-3">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">{invitation.email}</span>
          <span className="text-xs text-muted-foreground">
            {invitation.acceptedAt
              ? `Inscrit le ${dateFormat.format(new Date(invitation.acceptedAt))}`
              : `En attente · invité le ${dateFormat.format(new Date(invitation.createdAt))}`}
          </span>
        </div>
        {!invitation.acceptedAt && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleRevoke()}
            disabled={pending}
            aria-label={`Annuler l'invitation de ${invitation.email}`}
          >
            Annuler
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
