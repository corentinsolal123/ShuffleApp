import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Garde-robe" };

export default function WardrobePage() {
  return (
    <>
      <PageHeader title="Garde-robe" />
      <ComingSoon>La gestion des vêtements arrive à l&apos;étape 2.</ComingSoon>
    </>
  );
}
