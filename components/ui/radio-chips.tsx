"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "@/lib/utils";

/** Single choice rendered as wrapping chips (radio semantics). */
export function RadioChips<Value extends string>({
  options,
  value,
  onValueChange,
  disabled,
  className,
}: {
  options: readonly { value: Value; label: string }[];
  value: Value;
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <RadioGroup<Value>
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          className="inline-flex min-h-11 cursor-pointer items-center border px-4 text-sm data-checked:bg-primary data-checked:text-primary-foreground data-disabled:opacity-40"
        >
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
