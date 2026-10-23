"use client";

import { useState, type FormEvent } from "react";
import { createOccasion, deleteOccasion, renameOccasion } from "@/app/(app)/settings/actions";
import { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioChips } from "@/components/ui/radio-chips";
import { OCCASION_NAME_MAX_LENGTH, type OccasionWithUsage } from "@/lib/occasions/model";

function garmentsLabel(count: number): string {
  return count === 0 ? "Aucun vêtement" : count === 1 ? "1 vêtement" : `${count} vêtements`;
}

export function OccasionsManager({ occasions }: { occasions: OccasionWithUsage[] }) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await createOccasion(name);
      if (result.ok) setName("");
      else setError(result.error);
    } catch {
      setError("Enregistrement impossible. Vérifiez la connexion et réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="border-t">
        {occasions.map((occasion) => (
          <OccasionRow key={occasion.id} occasion={occasion} others={occasions.filter((o) => o.id !== occasion.id)} />
        ))}
      </ul>

      <form onSubmit={handleCreate} className="flex items-end gap-2">
        <Input
          aria-label="Nouvelle occasion"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nouvelle occasion"
          maxLength={OCCASION_NAME_MAX_LENGTH}
          disabled={pending}
        />
        <Button type="submit" variant="outline" disabled={pending || name.trim().length === 0}>
          Ajouter
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

function OccasionRow({ occasion, others }: { occasion: OccasionWithUsage; others: OccasionWithUsage[] }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(occasion.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await renameOccasion(occasion.id, name);
      if (result.ok) setEditing(false);
      else setError(result.error);
    } catch {
      setError("Enregistrement impossible. Vérifiez la connexion et réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 border-b py-3">
      {editing ? (
        <form onSubmit={handleRename} className="flex items-end gap-2">
          <Input
            aria-label={`Nouveau nom pour ${occasion.name}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={OCCASION_NAME_MAX_LENGTH}
            autoFocus
            disabled={pending}
          />
          <Button type="submit" size="sm" disabled={pending || name.trim().length === 0}>
            OK
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(false);
              setName(occasion.name);
              setError(null);
            }}
          >
            Annuler
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm">{occasion.name}</span>
            <span className="text-xs text-muted-foreground">{garmentsLabel(occasion.garmentCount)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label={`Renommer ${occasion.name}`}>
            Renommer
          </Button>
          <DeleteOccasionButton occasion={occasion} others={others} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

function DeleteOccasionButton({ occasion, others }: { occasion: OccasionWithUsage; others: OccasionWithUsage[] }) {
  const [open, setOpen] = useState(false);
  const [replacementId, setReplacementId] = useState(others[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsReplacement = occasion.soleGarmentCount > 0;

  if (others.length === 0) {
    return (
      <Button variant="ghost" size="sm" disabled title="Gardez au moins une occasion">
        Supprimer
      </Button>
    );
  }

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      const result = await deleteOccasion(occasion.id, needsReplacement ? replacementId : null);
      if (result.ok) setOpen(false);
      else setError(result.error);
    } catch {
      setError("Suppression impossible. Vérifiez la connexion et réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" aria-label={`Supprimer ${occasion.name}`} />}>
        Supprimer
      </AlertDialogTrigger>
      <AlertDialogContent
        title={`Supprimer « ${occasion.name} » ?`}
        description={
          needsReplacement
            ? `${garmentsLabel(occasion.soleGarmentCount)} n'${occasion.soleGarmentCount > 1 ? "ont" : "a"} que cette occasion. Choisissez celle qui la remplacera.`
            : "Elle sera retirée des vêtements qui l'utilisent."
        }
      >
        {needsReplacement && (
          <RadioChips
            options={others.map((other) => ({ value: other.id, label: other.name }))}
            value={replacementId}
            onValueChange={setReplacementId}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <AlertDialogClose render={<Button variant="outline" />} disabled={pending}>
            Annuler
          </AlertDialogClose>
          <Button disabled={pending} onClick={() => void handleDelete()}>
            {pending ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
