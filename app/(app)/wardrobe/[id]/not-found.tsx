import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GarmentNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 border p-6">
      <p className="text-sm text-muted-foreground">Ce vêtement n&apos;existe pas ou a été supprimé.</p>
      <Button variant="outline" size="sm" render={<Link href="/wardrobe" />} nativeButton={false}>
        Retour à la garde-robe
      </Button>
    </div>
  );
}
