import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

function Input({ className, ...props }: BaseInput.Props) {
  return (
    <BaseInput
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 border-0 border-b border-input bg-transparent px-0 text-base outline-none placeholder:text-muted-foreground focus-visible:border-b-2 focus-visible:outline-none disabled:opacity-40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
