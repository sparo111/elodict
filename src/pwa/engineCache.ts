// I file del motore di riconoscimento (onnxruntime, in public/ort per Whisper e public/ort31 per Parakeet) per l'uso senza rete.
//
// Il service worker li salva da solo («elodict-motore») solo se CONTROLLA la pagina. Alla prima visita non la controlla ancora:
// se il modello si scarica allora, quei file non verrebbero salvati e, spenta la rete, la dettatura «Privata» non partirebbe
// (provato: e2e/g6-privato-senza-rete.spec.ts). Quindi, quando si sceglie un riconoscimento offline, la pagina li mette da sé nella
// stessa memoria, prima di caricare il modello. Non si scarica niente se l'utente non ha scelto un riconoscimento offline.
import { ortBaseUrl } from "./basePath";

/** Lo stesso nome che usa il service worker (vite.config.ts, runtimeCaching). */
export const ENGINE_CACHE = "elodict-motore";

/** I due file che servono davvero (verificato dalle richieste di rete di Whisper e di Parakeet). */
export const ENGINE_FILES = ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"] as const;

export interface EngineCacheDeps {
  caches: Pick<CacheStorage, "open">;
  fetch: (url: string) => Promise<Response>;
  /** la base del sito (per esempio /elodict/) e il suo indirizzo */
  base: string;
  origin: string;
}

const realDeps = (): EngineCacheDeps => ({
  caches,
  fetch: (url) => fetch(url),
  base: import.meta.env.BASE_URL,
  origin: location.origin,
});

/**
 * Mette nella memoria offline i file del motore che mancano. Restituisce quanti ne ha salvati.
 * Non lancia mai errori: senza memoria o senza rete la dettatura si prova lo stesso (con la rete, il motore si scarica quando serve).
 */
export async function warmEngineCache(folder: "ort" | "ort31", deps: EngineCacheDeps = realDeps()): Promise<number> {
  let saved = 0;
  try {
    const base = ortBaseUrl(deps.base, deps.origin, folder);
    const cache = await deps.caches.open(ENGINE_CACHE);
    for (const file of ENGINE_FILES) {
      const url = base + file;
      if (await cache.match(url)) continue;
      const res = await deps.fetch(url);
      if (!res.ok) continue; // un errore del sito non va salvato: si riproverà alla prossima volta
      await cache.put(url, res);
      saved++;
    }
  } catch (e) {
    console.warn("non sono riuscito a salvare i file del motore per l'uso senza rete", e);
  }
  return saved;
}
