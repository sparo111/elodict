import { useCallback, useState } from "react";

/** Un messaggio breve in basso, che sparisce da solo (dopo 4 secondi, o il tempo indicato). */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const flash = useCallback((msg: string, ms = 4000) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  }, []);
  return { toast, flash };
}
