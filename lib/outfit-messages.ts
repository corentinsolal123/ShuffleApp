import type { Category, Season } from "@/lib/garments/model";
import type { BlockReason, BlockingFilter, EngineNote } from "@/lib/outfit-engine";

const NONE: Record<Category, string> = {
  top: "Aucun haut",
  bottom: "Aucun bas",
  shoes: "Aucune chaussure",
  outerwear: "Aucun manteau",
};

const WARM_ENOUGH: Record<Category, string> = {
  top: "assez chaud",
  bottom: "assez chaud",
  shoes: "assez chaude",
  // Outerwear can be too warm as well as too light.
  outerwear: "adapté",
};

const RAIN_PROOF: Record<Category, string> = {
  top: "adapté à la pluie",
  bottom: "adapté à la pluie",
  shoes: "adaptée à la pluie",
  outerwear: "imperméable",
};

const ADD_ONE: Record<Category, string> = {
  top: "un haut",
  bottom: "un bas",
  shoes: "une paire de chaussures",
  outerwear: "une veste ou un manteau",
};

const FOR_SEASON: Record<Season, string> = {
  spring: "pour le printemps",
  summer: "pour l'été",
  autumn: "pour l'automne",
  winter: "pour l'hiver",
};

export type MessageContext = {
  season: Season;
  occasionName?: string | null;
  feelsLike?: number | null;
};

function formatTemperature(value: number): string {
  return `${Math.round(value)} °C`;
}

/** Explains, in one sentence, why no outfit can be proposed. */
export function blockReasonMessage(reason: BlockReason | { kind: "no_alternative" }, context: MessageContext): string {
  switch (reason.kind) {
    case "missing_category":
      return `Ajoutez au moins ${ADD_ONE[reason.category]} à votre garde-robe.`;
    case "filter":
      return filterMessage(reason.category, reason.filter, context);
    case "rules":
      return RULES_MESSAGES[reason.blockedBy];
    case "no_alternative":
      return "Pas d'autre tenue possible avec ces filtres.";
  }
}

const RULES_MESSAGES: Record<Extract<BlockReason, { kind: "rules" }>["blockedBy"], string> = {
  garments: "Vos règles entre vêtements excluent toutes les tenues possibles.",
  colors: "Vos règles de couleurs excluent toutes les tenues possibles.",
  combined: "Ensemble, vos règles de vêtements et de couleurs excluent toutes les tenues possibles.",
};

function filterMessage(category: Category, filter: BlockingFilter, context: MessageContext): string {
  const none = NONE[category];
  switch (filter) {
    case "season":
      return `${none} ${FOR_SEASON[context.season]}.`;
    case "occasion":
      return context.occasionName
        ? `${none} pour l'occasion « ${context.occasionName} ».`
        : `${none} pour cette occasion.`;
    case "warmth":
      return context.feelsLike != null
        ? `${none} ${WARM_ENOUGH[category]} pour ${formatTemperature(context.feelsLike)} ressentis.`
        : `${none} ${WARM_ENOUGH[category]} pour la température du jour.`;
    case "rain":
      return `${none} ${RAIN_PROOF[category]}.`;
  }
}

export function noteMessage(note: EngineNote, context: MessageContext): string {
  switch (note.kind) {
    case "light_preference_relaxed":
      return "Il fait chaud, mais pas assez de pièces légères compatibles : d'autres ont été incluses.";
    case "outerwear_skipped":
      return `${outerwearSkippedMessage(note.cause, context)} Tenues proposées sans manteau.`;
    case "fewer_than_requested":
      return note.available === 1
        ? "Une seule tenue possible avec ces filtres."
        : `Seulement ${note.available} tenues possibles avec ces filtres.`;
  }
}

function outerwearSkippedMessage(
  cause: Extract<EngineNote, { kind: "outerwear_skipped" }>["cause"],
  context: MessageContext,
): string {
  switch (cause) {
    case "missing":
      return "Il fait frais, mais votre garde-robe n'a aucune veste ni aucun manteau.";
    case "rules":
      return "Vos règles excluent tous les manteaux adaptés.";
    default:
      return filterMessage("outerwear", cause, context);
  }
}
