// Controlla che gli «agganci per le prove» siano (o non siano) nel contenuto di una cartella costruita.
//   node scripts/check-test-hooks.mjs dist absent      → deve FALLIRE se li trova (build pubblicata)
//   node scripts/check-test-hooks.mjs dist-pwa present → deve FALLIRE se NON li trova (build di prova: così si sa che il controllo funziona)
// Cerca in tutti i file della cartella (anche nascosti dentro altri file, non solo i nomi).
import fs from "node:fs";
import path from "node:path";

const [dir, expectation] = process.argv.slice(2);
if (!dir || !["absent", "present"].includes(expectation ?? "")) {
  console.error("uso: node scripts/check-test-hooks.mjs <cartella> absent|present");
  process.exit(2);
}
if (!fs.existsSync(dir)) {
  console.error(`la cartella ${dir} non esiste: costruire prima l'app`);
  process.exit(2);
}

const NEEDLES = ["__ELODICT_FAIL_MIGRATION__", "__ELODICT_TEST_HOOKS__", "migrazione interrotta apposta"];

function* files(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) yield* files(p);
    else yield p;
  }
}

const found = [];
let scanned = 0;
for (const f of files(dir)) {
  scanned++;
  const text = fs.readFileSync(f).toString("latin1"); // vale anche per i file binari: si cerca solo il testo
  for (const n of NEEDLES) if (text.includes(n)) found.push(`${f}: ${n}`);
}

if (expectation === "absent") {
  if (found.length) {
    console.error(`TROVATI agganci per le prove in ${dir}:\n  ${found.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`OK: nessun aggancio per le prove in ${dir} (${scanned} file controllati)`);
} else {
  if (!found.length) {
    console.error(`nessun aggancio trovato in ${dir}, ma era atteso (build di prova)`);
    process.exit(1);
  }
  console.log(`OK: gli agganci per le prove ci sono in ${dir}, come previsto (${found.length} corrispondenze in ${scanned} file)`);
}
