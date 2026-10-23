import Link from "next/link";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

/** A navigation link that looks like a button (keeps link semantics for assistive tech). */
export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
