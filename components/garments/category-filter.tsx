"use client";

import { CATEGORY_PLURAL_LABELS, type Category } from "@/lib/garments/model";
import { cn } from "@/lib/utils";

/** In-page category filter (client state), styled like the wardrobe tabs. */
export function CategoryFilter({
  categories,
  value,
  onValueChange,
}: {
  categories: readonly Category[];
  value: Category | null;
  onValueChange: (value: Category | null) => void;
}) {
  const options: { category: Category | null; label: string }[] = [
    { category: null, label: "Tout" },
    ...categories.map((category) => ({ category, label: CATEGORY_PLURAL_LABELS[category] })),
  ];

  return (
    <div role="group" aria-label="Filtrer par catégorie" className="-mx-4 mb-4 flex gap-6 overflow-x-auto border-b px-4">
      {options.map(({ category, label }) => {
        const active = category === value;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(category)}
            className={cn(
              "-mb-px flex h-11 shrink-0 cursor-pointer items-center border-b label-caps",
              active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
