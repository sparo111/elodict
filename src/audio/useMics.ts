import { useCallback, useEffect, useState } from "react";
import { listMics, type MicDevice } from "./devices";

/** I microfoni collegati; l'elenco si aggiorna da solo quando se ne collega o scollega uno. */
export function useMics() {
  const [devices, setDevices] = useState<MicDevice[]>([]);
  const refresh = useCallback(async () => {
    try {
      setDevices(await listMics());
    } catch (e) {
      console.warn("non riesco a leggere l'elenco dei microfoni", e);
      setDevices([]);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const md = navigator.mediaDevices;
    md?.addEventListener?.("devicechange", refresh);
    return () => md?.removeEventListener?.("devicechange", refresh);
  }, [refresh]);
  return { devices, refresh };
}
