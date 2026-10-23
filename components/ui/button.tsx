import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap border label-caps transition-colors select-none disabled:cursor-not-allowed disabled:opacity-40 data-disabled:cursor-not-allowed data-disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground active:opacity-80",
        outline: "border-foreground bg-transparent text-foreground active:bg-muted",
        ghost: "border-transparent bg-transparent text-foreground active:bg-muted",
        link: "h-auto border-transparent px-0 underline underline-offset-4",
      },
      size: {
        default: "h-12 px-6",
        lg: "h-14 px-8 text-xs",
        sm: "h-11 px-4",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = BaseButton.Props & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return <BaseButton data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
