import { useCallback, useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

const HOUR = 60 * 60 * 1000;

/**
 * Avviso «è pronta una nuova versione». L'aggiornamento parte solo quando l'utente preme «Aggiorna»,
 * e solo dopo aver salvato il documento: se il salvataggio non riesce, non si ricarica (niente testo perso).
 */
export function useAppUpdate(saveFirst: () => Promise<boolean>) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    updateRef.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setReady(true),
      // se l'app resta aperta a lungo, ogni ora controlla se c'è una versione nuova
      onRegisteredSW: (_url, registration) => {
        if (registration) timer = window.setInterval(() => void registration.update(), HOUR);
      },
      onRegisterError: (e) => console.warn("l'apertura senza internet non è disponibile", e),
    });
    return () => window.clearInterval(timer);
  }, []);

  const apply = useCallback(async () => {
    setBusy(true);
    setSaveFailed(false);
    const saved = await saveFirst();
    if (!saved) {
      setBusy(false);
      setSaveFailed(true);
      return;
    }
    await updateRef.current?.(true); // installa la versione nuova e ricarica la pagina
  }, [saveFirst]);

  const later = useCallback(() => {
    setReady(false);
    setSaveFailed(false);
  }, []);

  return { ready, busy, saveFailed, apply, later };
}
