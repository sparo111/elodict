// Cose in comune ai lavoratori: segnalare alla pagina OGNI errore (anche quelli che altrimenti sparirebbero) e dire in che fase si è.
import type { FromWorker, PhaseKind } from "./protocol";

export type Post = (m: FromWorker) => void;

export const describe = (x: unknown): string => {
  if (x instanceof Error) return `${x.name}: ${x.message}`;
  if (typeof x === "string") return x;
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
};

/**
 * Dentro il lavoratore: errori non gestiti, promesse rifiutate, messaggi non leggibili, console.warn/error (onnxruntime ci scrive i suoi
 * problemi) e richieste di file .wasm/.mjs/.onnx/.json andate male. Tutto va alla pagina con il messaggio completo.
 */
export function installDiagnostics(post: Post) {
  const g = self as unknown as {
    addEventListener(t: string, f: (e: never) => void): void;
    fetch: typeof fetch;
  };
  g.addEventListener("error", ((e: ErrorEvent) => {
    post({ type: "worker-error", kind: "error", message: `${e.message} (${e.filename}:${e.lineno}:${e.colno})`, stack: (e.error as Error | undefined)?.stack });
  }) as never);
  g.addEventListener("unhandledrejection", ((e: PromiseRejectionEvent) => {
    post({ type: "worker-error", kind: "unhandledrejection", message: describe(e.reason), stack: (e.reason as Error | undefined)?.stack });
  }) as never);
  g.addEventListener("messageerror", (() => post({ type: "worker-error", kind: "messageerror", message: "messaggio non leggibile" })) as never);
  for (const level of ["warn", "error"] as const) {
    const orig = console[level].bind(console);
    console[level] = (...a: unknown[]) => {
      post({ type: "log", level, text: a.map(describe).join(" ").slice(0, 600) });
      orig(...a);
    };
  }
  const realFetch = g.fetch.bind(self);
  g.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    try {
      const res = await realFetch(input, init);
      if (!res.ok && !url.startsWith("blob:")) post({ type: "worker-error", kind: "fetch", message: `caricamento fallito: HTTP ${res.status} ${url}` });
      return res;
    } catch (e) {
      post({ type: "worker-error", kind: "fetch", message: `caricamento fallito: ${describe(e)} ${url}` });
      throw e;
    }
  };
}

export const phase = (post: Post, kind: PhaseKind, text: string) => post({ type: "phase", kind, phase: text });
