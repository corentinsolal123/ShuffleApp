"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "@/lib/utils";

type Option<Value> = { value: Value; label: string };

/** Single choice rendered as adjoining square segments (radio semantics). */
export function SegmentedControl<Value extends string | number>({
  options,
  value,
  onValueChange,
  disabled,
  className,
}: {
  options: readonly Option<Value>[];
  value: Value | null;
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <RadioGroup<Value | null>
      value={value}
      onValueChange={(next) => next !== null && onValueChange(next)}
      disabled={disabled}
      className={cn("grid auto-cols-fr grid-flow-col border", className)}
    >
      {options.map((option) => (
        <Radio.Root
          key={String(option.value)}
          value={option.value}
          className="flex h-12 cursor-pointer items-center justify-center border-l px-2 label-caps first:border-l-0 data-checked:bg-primary data-checked:text-primary-foreground data-disabled:opacity-40"
        >
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
