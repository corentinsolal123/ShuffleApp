"use client";

import { Checkbox } from "@base-ui/react/checkbox";
import { CheckboxGroup } from "@base-ui/react/checkbox-group";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Multiple choice rendered as toggleable chips (checkbox semantics). */
export function ChipGroup<Value extends string>({
  value,
  onValueChange,
  disabled,
  className,
  children,
}: {
  value: Value[];
  onValueChange: (value: Value[]) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <CheckboxGroup
      value={value}
      onValueChange={(next) => onValueChange(next as Value[])}
      disabled={disabled}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {children}
    </CheckboxGroup>
  );
}

export function Chip({
  value,
  disabled,
  className,
  children,
}: {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Checkbox.Root
      value={value}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 border px-4 text-sm data-checked:bg-primary data-checked:text-primary-foreground data-disabled:cursor-not-allowed data-disabled:opacity-40",
        className,
      )}
    >
      {children}
    </Checkbox.Root>
  );
}
