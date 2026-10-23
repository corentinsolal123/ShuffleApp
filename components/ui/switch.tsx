"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: BaseSwitch.Root.Props) {
  return (
    <BaseSwitch.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center border bg-background p-0.5 data-checked:bg-primary data-disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb className="block size-5 bg-foreground transition-transform data-checked:translate-x-5 data-checked:bg-primary-foreground" />
    </BaseSwitch.Root>
  );
}
