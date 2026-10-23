"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4 border p-6">
      <p className="label-caps">Une erreur est survenue</p>
      <p className="text-sm text-muted-foreground">
        Le chargement a échoué. Vérifiez la connexion puis réessayez.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
