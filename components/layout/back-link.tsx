import Link from "next/link";

export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="-mt-2 mb-2 inline-flex h-11 items-center label-caps text-muted-foreground">
      ← {children}
    </Link>
  );
}
