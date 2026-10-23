import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Règles" };

export default function RulesPage() {
  return (
    <>
      <PageHeader title="Règles" />
      <ComingSoon>Les règles de compatibilité arrivent à l&apos;étape 3.</ComingSoon>
    </>
  );
}
