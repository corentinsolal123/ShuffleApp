import { ButtonLink } from "@/components/ui/button-link";

export default function GarmentNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 border p-6">
      <p className="text-sm text-muted-foreground">Ce vêtement n&apos;existe pas ou a été supprimé.</p>
      <ButtonLink href="/wardrobe" variant="outline" size="sm">
        Retour à la garde-robe
      </ButtonLink>
    </div>
  );
}
