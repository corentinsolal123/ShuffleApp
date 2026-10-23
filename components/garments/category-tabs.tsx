import Link from "next/link";
import { CATEGORIES, CATEGORY_PLURAL_LABELS, type Category } from "@/lib/garments/model";
import { cn } from "@/lib/utils";

const TABS: { category: Category | null; label: string }[] = [
  { category: null, label: "Tout" },
  ...CATEGORIES.map((category) => ({ category, label: CATEGORY_PLURAL_LABELS[category] })),
];

/** Category filter as links, so the filtered list is server-rendered and shareable. */
export function CategoryTabs({ active, counts }: { active: Category | null; counts?: Record<Category, number> }) {
  return (
    <nav aria-label="Filtrer par catégorie" className="-mx-4 mb-6 overflow-x-auto border-b px-4">
      <ul className="flex gap-6">
        {TABS.map(({ category, label }) => {
          const current = category === active;
          return (
            <li key={label}>
              <Link
                href={category ? `/wardrobe?category=${category}` : "/wardrobe"}
                aria-current={current ? "page" : undefined}
                replace
                className={cn(
                  "-mb-px flex h-11 items-center border-b label-caps whitespace-nowrap",
                  current ? "border-foreground text-foreground" : "border-transparent text-muted-foreground",
                )}
              >
                {label}
                {category && counts && <span className="ml-1.5 tabular-nums">{counts[category]}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
