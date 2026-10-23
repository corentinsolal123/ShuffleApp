import { describe, expect, it } from "vitest";
import { blockReasonMessage, noteMessage } from "@/lib/outfit-messages";

const context = { season: "winter" as const, occasionName: "Travail", feelsLike: 1.6 };

describe("blockReasonMessage", () => {
  it.each([
    [{ kind: "missing_category", category: "shoes" }, "Ajoutez au moins une paire de chaussures à votre garde-robe."],
    [{ kind: "filter", category: "shoes", filter: "rain" }, "Aucune chaussure adaptée à la pluie."],
    [{ kind: "filter", category: "top", filter: "season" }, "Aucun haut pour l'hiver."],
    [{ kind: "filter", category: "bottom", filter: "occasion" }, "Aucun bas pour l'occasion « Travail »."],
    [{ kind: "filter", category: "top", filter: "warmth" }, "Aucun haut assez chaud pour 2 °C ressentis."],
    [{ kind: "rules", blockedBy: "colors" }, "Vos règles de couleurs excluent toutes les tenues possibles."],
    [{ kind: "rules", blockedBy: "garments" }, "Vos règles entre vêtements excluent toutes les tenues possibles."],
    [
      { kind: "rules", blockedBy: "combined" },
      "Ensemble, vos règles de vêtements et de couleurs excluent toutes les tenues possibles.",
    ],
    [{ kind: "no_alternative" }, "Pas d'autre tenue possible avec ces filtres."],
  ] as const)("explains %o", (reason, message) => {
    expect(blockReasonMessage(reason, context)).toBe(message);
  });

  it("stays meaningful without optional context", () => {
    expect(blockReasonMessage({ kind: "filter", category: "top", filter: "occasion" }, { season: "summer" })).toBe(
      "Aucun haut pour cette occasion.",
    );
    expect(blockReasonMessage({ kind: "filter", category: "shoes", filter: "warmth" }, { season: "summer" })).toBe(
      "Aucune chaussure assez chaude pour la température du jour.",
    );
  });
});

describe("noteMessage", () => {
  it("explains the relaxed light-pieces preference", () => {
    expect(noteMessage({ kind: "light_preference_relaxed" })).toContain("pas assez de pièces légères");
  });

  it("handles singular and plural", () => {
    expect(noteMessage({ kind: "fewer_than_requested", requested: 3, available: 1 })).toBe(
      "Une seule tenue possible avec ces filtres.",
    );
    expect(noteMessage({ kind: "fewer_than_requested", requested: 3, available: 2 })).toBe(
      "Seulement 2 tenues possibles avec ces filtres.",
    );
  });
});
