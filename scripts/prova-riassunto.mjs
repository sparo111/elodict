// Legge i JSON di prova-parakeet/risultati/ e scrive le tabelle in Markdown (per AUDIT_T013b.md).
//   node scripts/prova-riassunto.mjs > prova-parakeet/risultati/tabelle.md
import fs from "node:fs";
import path from "node:path";

const dir = "prova-parakeet/risultati";
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const f0 = (n) => (n === null || n === undefined || Number.isNaN(n) ? "n/d" : Math.round(n).toString());
const f1 = (n) => (n === null || n === undefined || Number.isNaN(n) ? "n/d" : n.toFixed(1));
const f2 = (n) => (n === null || n === undefined || Number.isNaN(n) ? "n/d" : n.toFixed(2));

const out = [];
const P = (s = "") => out.push(s);

/* ---------- pagina di prova: una riga per browser × configurazione ---------- */
const pages = files.filter((f) => /^pagina-/.test(f)).map((f) => ({ f, d: read(f) }));
if (pages.length) {
  P("### Tabella 1 — pagina di prova: tempi, memoria, scarico, precisione (5 frasi italiane, voce di sintesi)");
  P();
  P("| Browser | Motore · pesi | Thread | Backend | MB scaricati | Caricamento s | Memoria max (SO) MB | A freddo ms | Tempo medio ms | RTF | Encoder ms (medio) | Generazione ms (medio) | WER % | Punteggiatura % | Esito |");
  P("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  // MB scaricati: la prima volta che un browser vede un motore (nelle righe dopo i file sono già nella memoria del browser)
  for (const { f, d } of pages) {
    const bname = d.browser + (f.includes("-coi") ? " + coi-serviceworker" : "") + (d.browser === "webkit" && !f.includes("-coi") ? " (senza isolamento)" : "");
    // MB scaricati per il modello: il massimo visto meno quello che passa ogni volta (Whisper: il motore .wasm di 21 MB che la pagina
    // serve a ogni caricamento; Parakeet: 0, perché i suoi file di modello passano dalla memoria del browser)
    const dl = {};
    const floor = {};
    for (const r of d.rows) {
      const k = r.engine + "/" + r.backend;
      dl[k] = Math.max(dl[k] ?? 0, r.networkMB ?? 0);
      floor[k] = Math.min(floor[k] ?? Infinity, r.networkMB ?? 0);
    }
    for (const r of d.rows) {
      const c = r.clips ?? [];
      const secs = c.reduce((s, x) => s + x.seconds, 0);
      const tot = c.reduce((s, x) => s + x.timings.totalMs, 0);
      const words = c.reduce((s, x) => s + x.score.words, 0);
      const errs = c.reduce((s, x) => s + x.score.errors, 0);
      const pe = c.reduce((s, x) => s + x.score.punctExpected, 0);
      const pc = c.reduce((s, x) => s + x.score.punctCorrect, 0);
      P(`| ${bname} | ${r.engine} | ${r.threads} | ${r.backend} | ${f0(dl[r.engine + "/" + r.backend] - (floor[r.engine + "/" + r.backend] > 0 && floor[r.engine + "/" + r.backend] < dl[r.engine + "/" + r.backend] ? floor[r.engine + "/" + r.backend] : 0))} | ${f1((r.loadMs ?? 0) / 1000)} | ${f0(r.osPeakMB)} | ${f0(r.coldMs)} | ${r.ok ? f0(mean(c.map((x) => x.timings.totalMs))) : "—"} | ${r.ok ? f2(tot / 1000 / secs) : "—"} | ${r.ok ? f0(mean(c.map((x) => x.timings.encMs))) : "—"} | ${r.ok ? f0(mean(c.map((x) => x.timings.decMs))) : "—"} | ${r.ok ? f1((errs / words) * 100) : "—"} | ${r.ok ? f1(pe ? (pc / pe) * 100 : 0) : "—"} | ${r.ok ? "ok" : (r.error ?? "errore").replace(/\|/g, "/").slice(0, 110)} |`);
    }
  }
  P();
  P("### Tabella 2 — per frase (ms), configurazioni riuscite");
  P();
  P("| Browser | Motore | Thread | Backend | Frase | Audio s | Preparazione | Encoder | Generazione | Totale |");
  P("|---|---|---|---|---|---|---|---|---|---|");
  for (const { d } of pages)
    for (const r of d.rows.filter((r) => r.ok))
      for (const c of r.clips) P(`| ${d.browser} | ${r.engine} | ${r.threads} | ${r.backend} | ${c.id} | ${f1(c.seconds)} | ${f0(c.timings.preMs)} | ${f0(c.timings.encMs)} | ${f0(c.timings.decMs)} | ${f0(c.timings.totalMs)} |`);
  P();
  P("### Tabella 3 — testo prodotto (primo browser che ha finito la configurazione, 1 thread)");
  P();
  const seen = new Set();
  P("| Motore · pesi | Frase | Testo riconosciuto | WER % |");
  P("|---|---|---|---|");
  for (const { d } of pages)
    for (const r of d.rows.filter((r) => r.ok && r.threads === 1 && r.backend === "wasm" && !seen.has(r.engine)))
      for (const c of r.clips) {
        P(`| ${r.engine} | ${c.id} | ${c.text.replace(/\|/g, "/")} | ${f1(c.score.wer * 100)} |`);
        if (c.id === 5) seen.add(r.engine);
      }
  P();
  P("### Dispositivi e browser provati");
  P();
  for (const { d } of pages) P(`- **${d.browser}**: ${Object.entries(d.device ?? {}).map(([k, v]) => `${k}=${v}`).join(" · ")}`);
  P();
  P("### Tabella 6 — pausa che chiude la frase, solo il segmentatore (audio con 6 pause interne: 350, 450, 500, 600, 650, 800 ms)");
  P();
  P("| silenceMs | Frasi emesse / volute | Tagliate a metà | Ritardo medio ms |");
  P("|---|---|---|---|");
  const sw = pages[0]?.d.sweeps ?? [];
  for (const s of sw) P(`| ${s.silenceMs} | ${s.emitted} / ${s.expected} | ${s.splits} | ${f0(s.meanDelayMs)} |`);
  P();
}

/* ---------- app: catena di Whisper base ---------- */
const apps = files.filter((f) => /^app-/.test(f)).map((f) => ({ f, d: read(f) }));
if (apps.length) {
  P("### Tabella 4 — dentro l'app (build di prova, Whisper base, microfono finto con le 5 frasi di fila): dove va il tempo, in ms");
  P();
  P("| Prova | Frasi | Isolata | Attesa pausa | Preparazione | Coda | Log-mel | Encoder | Generazione | Ritorno | Schermo | **Totale (fine voce → schermo)** |");
  P("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const { f, d } of apps.filter(({ f }) => !/pause/.test(f))) {
    const r = d.rows;
    if (!r.length) {
      P(`| ${f.replace(".json", "")} | 0 | ${d.isolated} | — | — | — | — | — | — | — | — | ${d.fatal ?? "nessuna frase"} |`);
      continue;
    }
    const m = (k) => f0(mean(r.map((x) => x[k])));
    P(`| ${f.replace(".json", "")} | ${r.length} | ${d.isolated} | ${m("silenceMs")} | ${m("prepMs")} | ${m("queueMs")} | ${m("featureMs")} | ${m("encoderMs")} | ${m("decoderMs")} | ${m("returnMs")} | ${m("screenMs")} | **${m("totalMs")}** |`);
  }
  P();
  P("### Tabella 5 — pausa che chiude la frase (silenceMs) nell'app, con Whisper vero (audio con 6 pause interne di 350–800 ms)");
  P();
  P("| silenceMs | Frasi in uscita (6 volute) | Tagliate a metà | Attesa pausa media ms | Totale medio ms | Testo in uscita (una frase per ¦) |");
  P("|---|---|---|---|---|---|");
  for (const { f, d } of apps.filter(({ f }) => /pause/.test(f))) {
    const r = d.rows;
    P(`| ${d.silenceMs} | ${r.length} | ${Math.max(0, r.length - 6)} | ${f0(mean(r.map((x) => x.silenceMs)))} | ${f0(mean(r.map((x) => x.totalMs)))} | ${r.map((x) => x.text).join(" ¦ ").replace(/\|/g, "/").slice(0, 700)} |`);
  }
  P();
}
console.log(out.join("\n"));
