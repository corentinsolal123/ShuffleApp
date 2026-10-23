import type { Metadata } from "next";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Réglages" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Réglages" />
      <div className="flex flex-col gap-8">
        <ComingSoon>Ville par défaut et occasions arrivent à l&apos;étape 6.</ComingSoon>
        <SignOutButton />
      </div>
    </>
  );
}
