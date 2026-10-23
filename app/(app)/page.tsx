import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export default function GeneratePage() {
  return (
    <>
      <PageHeader title="Tenues du jour" />
      <ComingSoon>La génération de tenues arrive à l&apos;étape 5.</ComingSoon>
    </>
  );
}
