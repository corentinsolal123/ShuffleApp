import { colorSwatch, type ColorKey } from "@/lib/palette";
import { cn } from "@/lib/utils";

/** Square colour sample; the outline keeps white visible on white and black on black. */
export function ColorSwatch({ color, className }: { color: ColorKey; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-4 shrink-0 outline outline-1 -outline-offset-1 outline-current/40", className)}
      style={{ background: colorSwatch(color) }}
    />
  );
}
