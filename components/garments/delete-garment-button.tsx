"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteGarment } from "@/app/(app)/wardrobe/actions";
import { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteGarmentButton({ garmentId, garmentName }: { garmentId: string; garmentName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      const result = await deleteGarment(garmentId);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      router.push("/wardrobe");
    } catch {
      setError("Suppression impossible. Vérifiez la connexion et réessayez.");
      setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" className="w-full text-destructive" />}>
        Supprimer ce vêtement
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Supprimer ce vêtement ?"
        description={`« ${garmentName} » et sa photo seront définitivement supprimés.`}
      >
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <AlertDialogClose render={<Button variant="outline" />} disabled={pending}>
            Annuler
          </AlertDialogClose>
          <Button onClick={() => void handleDelete()} disabled={pending}>
            {pending ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
