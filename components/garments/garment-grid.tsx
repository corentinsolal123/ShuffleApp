import Link from "next/link";
import type { GarmentWithPhoto } from "@/lib/garments/model";

export function GarmentGrid({ garments }: { garments: GarmentWithPhoto[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3">
      {garments.map((garment) => (
        <li key={garment.id}>
          <Link href={`/wardrobe/${garment.id}`} className="group flex flex-col gap-2">
            <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
              {garment.photoUrl ? (
                // Signed Supabase URL: next/image optimisation does not apply.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={garment.photoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-opacity group-active:opacity-80"
                />
              ) : (
                <div className="flex size-full items-center justify-center label-caps text-muted-foreground">
                  Photo indisponible
                </div>
              )}
            </div>
            <span className="truncate text-xs">{garment.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
