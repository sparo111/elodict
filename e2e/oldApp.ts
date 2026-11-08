import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Aiuti per far girare la versione dell'app di PRIMA di un cambio di schema, in una cartella a parte
 * (git worktree staccato), senza toccare il ramo e i file di lavoro attuali.
 */
export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Il tag git della versione di PRIMA di T004 (elenco dei documenti): database alla versione 1, scelta del microfono già presente.
 * Un tag, e non il codice di un commit, perché i codici dei commit cambiano se la storia viene riscritta; il tag viene spostato con essa
 * (e va pubblicato insieme al resto: `git push origin v-prima-di-T004`).
 */
export const TAG_BEFORE_T004 = "v-prima-di-T004";

/**
 * Crea la cartella con la versione di prima. `node_modules` non si copia: ogni voce è un collegamento a quella vera,
 * tranne la memoria di Vite (`.vite`), che resta separata così i due server non si pestano i piedi.
 */
export function prepareOldWorktree(ref = TAG_BEFORE_T004): string {
  execFileSync("git", ["worktree", "prune"], { cwd: REPO });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "elodict-prima-"));
  fs.rmSync(dir, { recursive: true });
  execFileSync("git", ["worktree", "add", "--detach", dir, ref], { cwd: REPO, stdio: "ignore" });
  const nm = path.join(dir, "node_modules");
  fs.mkdirSync(nm);
  for (const entry of fs.readdirSync(path.join(REPO, "node_modules"), { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === ".vite" || entry.name === ".cache" || entry.name === ".vite-temp") continue;
    fs.symlinkSync(path.join(REPO, "node_modules", entry.name), path.join(nm, entry.name), "junction");
  }
  return dir;
}

export function removeWorktree(dir: string): void {
  try {
    fs.rmSync(path.join(dir, "node_modules"), { recursive: true, force: true }); // toglie solo i collegamenti
  } catch (e) {
    console.warn("non riesco a togliere i collegamenti di node_modules", e);
  }
  try {
    execFileSync("git", ["worktree", "remove", "--force", dir], { cwd: REPO, stdio: "ignore" });
  } catch (e) {
    console.warn("non riesco a togliere il worktree", e);
  }
}

export interface RunningServer {
  stop(): Promise<void>;
}

/** Avvia il server di sviluppo di Vite nella cartella indicata e aspetta che risponda. */
export async function startVite(cwd: string, port: number): Promise<RunningServer> {
  const vite = path.join(REPO, "node_modules", "vite", "bin", "vite.js");
  const child: ChildProcess = spawn(process.execPath, [vite, "--port", String(port), "--strictPort", "--host", "localhost"], { cwd, stdio: "ignore" });
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  const deadline = Date.now() + 120_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`il server si è fermato subito (${cwd})`);
    const r = await fetch(`http://localhost:${port}/`).catch(() => null); // non ancora pronto: si riprova
    if (r?.ok) break;
    if (Date.now() > deadline) {
      child.kill();
      throw new Error(`il server su ${port} non è partito in tempo`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return {
    async stop() {
      child.kill();
      await exited;
    },
  };
}
