import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PageHeader } from "@/components/layout/page-header";
import { CitySetting } from "@/components/settings/city-setting";
import { InstallHint } from "@/components/settings/install-hint";
import { OccasionsManager } from "@/components/settings/occasions-manager";
import { getSessionEmail } from "@/lib/auth/session";
import { listOccasionsWithUsage } from "@/lib/occasions/queries";
import { getProfile } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const [profile, occasions, email] = await Promise.all([getProfile(), listOccasionsWithUsage(), getSessionEmail()]);

  return (
    <>
      <PageHeader title="Réglages" />
      <div className="flex flex-col gap-12">
        <SettingsSection title="Ville par défaut">
          <CitySetting city={profile.defaultCity} />
        </SettingsSection>

        <SettingsSection title="Occasions">
          <OccasionsManager occasions={occasions} />
        </SettingsSection>

        <InstallHint />

        <SettingsSection title="Compte">
          <div className="flex flex-col gap-4">
            {email && <p className="truncate text-sm text-muted-foreground">Connecté avec {email}</p>}
            <SignOutButton />
          </div>
        </SettingsSection>
      </div>
    </>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <h2 className="label-caps">{title}</h2>
      {children}
    </section>
  );
}
