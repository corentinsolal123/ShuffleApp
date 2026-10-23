import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Labels a group of choices (radios, chips) with a legend, an optional hint and an error. */
export function ChoiceFieldset({
  legend,
  hint,
  error,
  className,
  children,
}: {
  legend: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-3", className)} aria-invalid={error ? true : undefined}>
      <legend className="mb-3 flex w-full items-baseline justify-between gap-2 label-caps">
        <span>{legend}</span>
        {hint && <span className="text-muted-foreground normal-case tracking-normal">{hint}</span>}
      </legend>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}
