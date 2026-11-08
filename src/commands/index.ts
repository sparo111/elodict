import { enCommands } from "./en";
import { esCommands } from "./es";
import { frCommands } from "./fr";
import { itCommands } from "./it";
import type { CommandDef, Lang } from "./types";

export type { Lang } from "./types";

export const LANGS: Lang[] = ["it", "en", "fr", "es"];

export const LANG_NAME: Record<Lang, string> = {
  it: "Italiano",
  en: "English",
  fr: "Français",
  es: "Español",
};

/** Codice che il riconoscimento vocale del browser si aspetta. */
export const VOICE_CODE: Record<Lang, string> = {
  it: "it-IT",
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
};

export const COMMANDS: Record<Lang, CommandDef[]> = {
  it: itCommands,
  en: enCommands,
  fr: frCommands,
  es: esCommands,
};
