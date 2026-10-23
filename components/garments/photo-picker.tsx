"use client";

import { useRef, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";

/** Photo preview with two sources: the rear camera, or the photo library. */
export function PhotoPicker({
  previewUrl,
  alt,
  busy,
  disabled,
  error,
  onPick,
}: {
  previewUrl: string | null;
  alt: string;
  busy: boolean;
  disabled?: boolean;
  error?: string;
  onPick: (file: File) => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still triggers a change.
    event.target.value = "";
    if (file) onPick(file);
  }

  return (
    <div className="flex flex-col gap-3" data-invalid={error ? "" : undefined}>
      <div className="relative aspect-[3/4] w-full overflow-hidden border bg-muted">
        {previewUrl ? (
          // Signed Supabase URLs and local blob URLs: next/image optimisation does not apply.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={alt} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center label-caps text-muted-foreground">
            Aucune photo
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 label-caps" role="status">
            Traitement…
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" disabled={busy || disabled} onClick={() => cameraInput.current?.click()}>
          Prendre une photo
        </Button>
        <Button type="button" variant="outline" disabled={busy || disabled} onClick={() => libraryInput.current?.click()}>
          Galerie
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-label="Prendre une photo"
        onChange={handleChange}
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choisir une photo dans la galerie"
        onChange={handleChange}
      />
    </div>
  );
}
