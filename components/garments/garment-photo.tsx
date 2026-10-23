import { cn } from "@/lib/utils";

/** 3:4 garment photo from a signed URL, with a placeholder when it is unavailable. */
export function GarmentPhoto({
  url,
  alt = "",
  className,
}: {
  url: string | null;
  alt?: string;
  className?: string;
}) {
  return (
    <div className={cn("aspect-[3/4] w-full overflow-hidden bg-muted", className)}>
      {url ? (
        // Signed Supabase URL: next/image optimisation does not apply.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <div
          aria-hidden
          className="flex size-full items-center justify-center p-1 text-center text-[0.625rem] tracking-widest text-muted-foreground uppercase"
        >
          Photo indisponible
        </div>
      )}
    </div>
  );
}
