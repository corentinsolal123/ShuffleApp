"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/** Chrome/Android install prompt (not in the TS DOM lib). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeToDisplayMode(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isStandalone(): boolean {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const noopSubscribe = () => () => {};

/** Explains how to install the PWA; hidden once the app runs installed. */
export function InstallHint() {
  const standalone = useSyncExternalStore(subscribeToDisplayMode, isStandalone, () => true);
  const ios = useSyncExternalStore(noopSubscribe, isIos, () => false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  if (standalone) return null;

  return (
    <section aria-labelledby="install-title" className="flex flex-col gap-3 border p-4">
      <h2 id="install-title" className="label-caps">
        Installer l&apos;application
      </h2>
      {installPrompt ? (
        <>
          <p className="text-sm text-muted-foreground">Ajoutez Shuffle à l&apos;écran d&apos;accueil pour l&apos;ouvrir en un geste.</p>
          <Button
            variant="outline"
            onClick={async () => {
              await installPrompt.prompt();
              setInstallPrompt(null);
            }}
          >
            Installer
          </Button>
        </>
      ) : ios ? (
        <p className="text-sm text-muted-foreground">
          Dans Safari, touchez <span className="text-foreground">Partager</span> puis{" "}
          <span className="text-foreground">Sur l&apos;écran d&apos;accueil</span>.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Dans le menu du navigateur, choisissez <span className="text-foreground">Installer l&apos;application</span>{" "}
          ou <span className="text-foreground">Ajouter à l&apos;écran d&apos;accueil</span>.
        </p>
      )}
    </section>
  );
}
