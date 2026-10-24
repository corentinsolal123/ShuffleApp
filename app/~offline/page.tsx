import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hors ligne" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-3xl">Shuffle</p>
      <p className="label-caps">Hors ligne</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Pas de connexion pour le moment. Réessayez dès que le réseau revient.
      </p>
    </main>
  );
}
