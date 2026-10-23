"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Clears the service worker caches so the next user of the device sees nothing private. */
async function clearRuntimeCaches() {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setPending(false);
      setError("Déconnexion impossible. Réessayez.");
      return;
    }
    await clearRuntimeCaches().catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" onClick={() => void handleSignOut()} disabled={pending}>
        {pending ? "Déconnexion…" : "Se déconnecter"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
