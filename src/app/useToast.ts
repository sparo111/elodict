import { useCallback, useState } from "react";

/** Un messaggio breve in basso, che sparisce da solo dopo 4 secondi. */
export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }, []);
  return { toast, flash };
}
