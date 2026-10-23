import Link from "next/link";
import type { GarmentWithPhoto } from "@/lib/garments/model";
import { GarmentPhoto } from "./garment-photo";

export function GarmentGrid({ garments }: { garments: GarmentWithPhoto[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3">
      {garments.map((garment) => (
        <li key={garment.id}>
          <Link href={`/wardrobe/${garment.id}`} className="flex flex-col gap-2 active:opacity-80">
            <GarmentPhoto url={garment.photoUrl} />
            <span className="truncate text-xs">{garment.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
