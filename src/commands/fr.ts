// Commandes vocales en français. En français, ? ! : ; sont précédés d'une espace insécable.
import type { CommandDef } from "./types";

export const frCommands: CommandDef[] = [
  { phrases: ["point d'interrogation"], action: { type: "punct", char: "?", spaceBefore: true } },
  { phrases: ["point d'exclamation"], action: { type: "punct", char: "!", spaceBefore: true } },
  { phrases: ["point-virgule", "point virgule"], action: { type: "punct", char: ";", spaceBefore: true } },
  { phrases: ["deux points", "deux-points"], action: { type: "punct", char: ":", spaceBefore: true } },
  { phrases: ["points de suspension"], action: { type: "punct", char: "…" } },
  { phrases: ["virgule"], action: { type: "punct", char: "," } },
  { phrases: ["point"], action: { type: "punct", char: "." } },
  { phrases: ["parenthèse ouvrante", "parenthèse gauche", "ouvrir la parenthèse"], action: { type: "open", char: "(" } },
  { phrases: ["parenthèse fermante", "parenthèse droite", "fermer la parenthèse"], action: { type: "close", char: ")" } },
  { phrases: ["guillemet ouvrant", "guillemet gauche", "ouvrir les guillemets"], action: { type: "open", char: "«" } },
  { phrases: ["guillemet fermant", "guillemet droit", "fermer les guillemets"], action: { type: "close", char: "»" } },
  { phrases: ["nouveau paragraphe"], action: { type: "break", paragraph: true } },
  { phrases: ["saut de ligne", "à la ligne"], action: { type: "break", paragraph: false } },
  { phrases: ["annule", "annuler"], action: { type: "edit", op: "undo" } },
  { phrases: ["efface mot", "supprime mot"], action: { type: "edit", op: "deleteWord" } },
  { phrases: ["efface phrase", "supprime phrase"], action: { type: "edit", op: "deleteSentence" } },
];
