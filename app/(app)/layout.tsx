import Link from "next/link";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ResumeRefresher } from "@/components/layout/resume-refresher";
import { requireUserId } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already redirects anonymous visitors; this is the server-side guard.
  await requireUserId();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background pt-safe-top">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-center px-4">
          <Link href="/" className="font-display text-2xl tracking-wide">
            Dressing
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
      <ResumeRefresher />
    </div>
  );
}
