// Scarica un file (con la memoria «Cache» del browser), contando i byte che passano davvero dalla rete.
// Se il file c'è già nella memoria del browser non si scarica niente: i byte scaricati sono 0.

/** Una risposta uguale a quella data, che dice quanti byte passano mentre viene letta. */
export function counted(res: Response, onBytes: (n: number) => void): Response {
  if (!res.body) return res;
  const ts = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctl) {
      onBytes(chunk.byteLength);
      ctl.enqueue(chunk);
    },
  });
  return new Response(res.body.pipeThrough(ts), { status: res.status, statusText: res.statusText, headers: res.headers });
}

export interface FetchStats {
  networkBytes: number;
  cachedBytes: number;
}

/** Il file come Blob (appoggiato al disco dalla Cache, non tutto in memoria). `onProgress(byteArrivati, totale)`. */
export async function fetchCached(
  url: string,
  cacheName: string,
  stats: FetchStats,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Blob> {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(url);
  if (hit) {
    const blob = await hit.blob();
    stats.cachedBytes += blob.size;
    onProgress?.(blob.size, blob.size);
    return blob;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download non riuscito (${res.status}) ${url}`);
  const total = Number(res.headers.get("content-length") ?? 0);
  let loaded = 0;
  await cache.put(
    url,
    counted(res, (n) => {
      loaded += n;
      stats.networkBytes += n;
      onProgress?.(loaded, total || loaded);
    }),
  );
  const saved = await cache.match(url);
  if (!saved) throw new Error(`file non salvato nella memoria del browser: ${url}`);
  return saved.blob();
}
