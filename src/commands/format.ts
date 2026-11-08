import type { CommandDef, FormatMark, FormatTarget } from "./types";

/** Crea i comandi "grassetto questo / ultima parola / ultima frase" per una lingua. */
export function formatCommands(
  marks: Record<FormatMark, string[]>,
  targets: Record<FormatTarget, string[]>,
): CommandDef[] {
  const out: CommandDef[] = [];
  for (const mark of Object.keys(marks) as FormatMark[]) {
    for (const target of Object.keys(targets) as FormatTarget[]) {
      out.push({
        phrases: marks[mark].flatMap((m) => targets[target].map((t) => `${m} ${t}`)),
        action: { type: "format", mark, target },
      });
    }
  }
  return out;
}
