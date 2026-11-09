// Esegue la pagina di prova T013b (prova-parakeet/) con Playwright e salva i risultati in JSON.
//   node scripts/prova-parakeet-run.mjs --browser chromium|msedge|webkit --url <indirizzo della pagina> \
//        --configs "whisper-base:1:wasm,parakeet-olicorne-w2a8:2:wasm" --out prova-parakeet/risultati/chromium.json [--gpu] [--coi 0|1]
// Per ogni browser tiene un profilo a parte (cartella in %TEMP%), così i modelli scaricati restano nella memoria del browser
// tra una configurazione e l'altra (si scaricano una volta sola). Misura anche la memoria dei processi del browser dal sistema
// operativo (picco della somma dei processi del profilo), che la pagina da sola non vede (il WebAssembly dei lavoratori).
import { chromium, webkit } from "@playwright/test";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? def : (process.argv[i + 1]?.startsWith("--") ? true : (process.argv[i + 1] ?? true));
};
const browserName = arg("browser", "chromium");
const url = arg("url");
const out = arg("out", `prova-parakeet/risultati/${browserName}.json`);
const configs = String(arg("configs", "whisper-base:1:wasm")).split(",").filter(Boolean).map((c) => {
  const [engine, threads, backend] = c.split(":");
  return { engine, threads: Number(threads || 1), backend: backend || "wasm" };
});
const coi = arg("coi", "1");
const limitMs = Number(arg("timeout", 420)) * 1000; // massimo per ogni configurazione
const gpu = arg("gpu", false) === true;
if (!url) throw new Error("serve --url");

const profile = path.join(os.tmpdir(), `prova-parakeet-profilo-${browserName}`);
fs.mkdirSync(profile, { recursive: true });
fs.mkdirSync(path.dirname(out), { recursive: true });

/** Somma (MB, «working set») della memoria dei processi del browser: la radice (che usa questo profilo) e tutti i suoi discendenti. */
function sampleMemory() {
  const root = browserName === "webkit" ? "$_.Name -like '*Playwright*' -or $_.Name -like '*WebKit*'" : `$_.CommandLine -like '*${path.basename(profile)}*' -and $_.CommandLine -notlike '*--type=*'`;
  const ps = [
    "$all = Get-CimInstance Win32_Process",
    `$roots = @($all | Where-Object { ${root} } | ForEach-Object { $_.ProcessId })`,
    "$set = New-Object 'System.Collections.Generic.HashSet[int]'",
    "foreach ($r in $roots) { [void]$set.Add([int]$r) }",
    "do { $n = $set.Count; foreach ($p in $all) { if ($set.Contains([int]$p.ParentProcessId)) { [void]$set.Add([int]$p.ProcessId) } } } while ($set.Count -ne $n)",
    "($all | Where-Object { $set.Contains([int]$_.ProcessId) } | Measure-Object -Property WorkingSetSize -Sum).Sum",
  ].join("; ");
  return new Promise((resolve) => {
    execFile("powershell", ["-NoProfile", "-Command", ps], { timeout: 20000 }, (err, stdout) => resolve(err ? null : Number(String(stdout).trim() || 0) / 1048576));
  });
}

const args = ["--use-fake-ui-for-media-stream"];
if (gpu) args.push("--enable-unsafe-webgpu", "--enable-features=Vulkan,WebGPU", "--ignore-gpu-blocklist");
const launchOpts = { headless: true, ...(browserName === "webkit" ? {} : { args }), viewport: { width: 1280, height: 900 }, locale: "it-IT", acceptDownloads: false };
const ctx =
  browserName === "webkit"
    ? await webkit.launchPersistentContext(profile, launchOpts)
    : await chromium.launchPersistentContext(profile, { ...launchOpts, channel: browserName === "msedge" ? "msedge" : undefined });
const page = ctx.pages()[0] ?? (await ctx.newPage());
const log = [];
page.on("console", (m) => ["error"].includes(m.type()) && log.push(`console.error: ${m.text().slice(0, 300)}`));
page.on("pageerror", (e) => log.push(`pageerror: ${e.message.slice(0, 300)}`));
page.on("requestfailed", (r) => log.push(`FALLITA ${r.url().slice(0, 150)} ${r.failure()?.errorText}`));

const result = { browser: browserName, version: ctx.browser()?.version?.() ?? null, url, startedAt: new Date().toISOString(), device: null, sweeps: null, rows: [], log };
try {
  const target = new URL(url);
  if (coi !== "1") target.searchParams.set("coi", "0");
  await page.goto(target.toString(), { waitUntil: "load" });
  // con l'isolamento la pagina si ricarica da sola una volta
  await page.waitForFunction(() => window.__bench?.ready === true, null, { timeout: 120_000 });
  if (coi === "1") {
    // il service worker può aver ricaricato la pagina: ricontrolla l'isolamento
    await page.waitForTimeout(500);
    await page.waitForFunction(() => window.__bench?.ready === true, null, { timeout: 120_000 });
  }
  result.device = await page.evaluate(() => window.__bench.info);
  result.sweeps = await page.evaluate(() => window.__bench.runSweeps());
  for (const cfg of configs) {
    console.log(`>> ${browserName}: ${cfg.engine} ${cfg.threads} thread ${cfg.backend}`);
    let peak = 0;
    let base = (await sampleMemory()) ?? 0;
    let sampling = true;
    const sampler = (async () => {
      while (sampling) {
        const m = await sampleMemory();
        if (m) peak = Math.max(peak, m);
        await new Promise((r) => setTimeout(r, 1500));
      }
    })();
    const t0 = Date.now();
    let row;
    try {
      row = await Promise.race([
        page.evaluate((c) => window.__bench.runConfig(c), cfg),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`oltre il tempo massimo (${limitMs / 1000} s): la prova si è bloccata`)), limitMs)),
      ]);
    } catch (e) {
      row = { ...cfg, ok: false, error: `${e.name}: ${e.message}`.slice(0, 400), clips: [] };
    }
    sampling = false;
    await sampler;
    if (!row.ok && /tempo massimo/.test(row.error ?? "")) {
      // la pagina è rimasta in attesa: la si ricarica per le configurazioni dopo
      await page.reload().catch(() => undefined);
      await page.waitForFunction(() => window.__bench?.ready === true, null, { timeout: 120_000 }).catch(() => undefined);
    }
    row.osPeakMB = peak || null;
    row.osBaselineMB = base || null;
    row.wallS = (Date.now() - t0) / 1000;
    result.rows.push(row);
    console.log(`   ${row.ok ? "ok" : "ERRORE " + row.error}  picco ${peak ? peak.toFixed(0) : "n/d"} MB  ${row.wallS.toFixed(0)} s`);
    fs.writeFileSync(out, JSON.stringify(result, null, 1));
  }
} catch (e) {
  result.fatal = `${e.name}: ${e.message}`;
  console.error("FATALE:", result.fatal);
}
result.finishedAt = new Date().toISOString();
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log("salvato", out);
// chiudere il browser può durare molto (la memoria «Cache» con centinaia di MB): si aspetta un minuto, poi si esce lo stesso
await Promise.race([ctx.close().catch(() => undefined), new Promise((r) => setTimeout(r, 60_000))]);
process.exit(0);
