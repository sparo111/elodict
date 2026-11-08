// Elenco dei microfoni e apertura del microfono scelto, con ritorno automatico a quello predefinito.

export interface MicDevice {
  /** identificativo del dispositivo; vuoto finché il browser non ha il permesso di mostrarlo */
  id: string;
  /** nome; vuoto finché non c'è il permesso */
  label: string;
}

/** Voci «virtuali» che il browser aggiunge: il predefinito lo offriamo noi con una voce a parte. */
const VIRTUAL_IDS = new Set(["default", "communications"]);

/** I microfoni collegati (solo ingressi audio, senza le voci virtuali). */
export async function listMics(md: Pick<MediaDevices, "enumerateDevices"> | undefined = navigator.mediaDevices): Promise<MicDevice[]> {
  if (!md?.enumerateDevices) return [];
  const all = await md.enumerateDevices();
  return all
    .filter((d) => d.kind === "audioinput" && !VIRTUAL_IDS.has(d.deviceId))
    .map((d) => ({ id: d.deviceId, label: d.label }));
}

/**
 * Il microfono scelto non c'è più? Si può dire solo se il browser mostra gli identificativi:
 * senza permesso sono tutti vuoti e non si può sapere (in quel caso: falso).
 */
export function isMissing(preferredId: string, devices: MicDevice[]): boolean {
  if (!preferredId) return false;
  const known = devices.filter((d) => d.id);
  return known.length > 0 && !known.some((d) => d.id === preferredId);
}

const GONE = new Set(["OverconstrainedError", "NotFoundError"]);

export interface OpenedMic {
  stream: MediaStream;
  /** vero se il microfono scelto non c'era e si è usato quello predefinito */
  fellBack: boolean;
}

/**
 * Apre il microfono scelto. Se non c'è più (scollegato) apre quello predefinito e lo segnala.
 * Gli altri errori (permesso negato, nessun microfono in assoluto) passano così come sono.
 */
export async function openMic(
  preferredId: string,
  base: MediaTrackConstraints = {},
  md: Pick<MediaDevices, "getUserMedia"> = navigator.mediaDevices,
): Promise<OpenedMic> {
  if (preferredId) {
    try {
      const stream = await md.getUserMedia({ audio: { ...base, deviceId: { exact: preferredId } } });
      return { stream, fellBack: false };
    } catch (e) {
      if (!GONE.has((e as DOMException)?.name)) throw e;
    }
    const stream = await md.getUserMedia({ audio: Object.keys(base).length ? base : true });
    return { stream, fellBack: true };
  }
  return { stream: await md.getUserMedia({ audio: Object.keys(base).length ? base : true }), fellBack: false };
}
