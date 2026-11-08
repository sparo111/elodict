// Chi ascolta: il microfono (del browser o offline), il suo stato, la pausa e le scorciatoie da tastiera.
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Lang } from "../commands/types";
import { createEngine, isEngineSupported, type Engine, type EngineKind } from "../speech/engine";
import type { RecognizerError, RecognizerNotice, RecognizerState } from "../speech/recognizer";
import type { WhisperModelId } from "../speech/whisper";

interface Options {
  engine: EngineKind;
  dictLang: Lang;
  whisperModel: WhisperModelId;
  /** microfono scelto (vuoto = predefinito) */
  micId: string;
  /** chi riceve il testo riconosciuto; è un riferimento perché cambia a ogni modifica delle impostazioni */
  onTextRef: MutableRefObject<(text: string) => void>;
}

export function useDictation({ engine, dictLang, whisperModel, micId, onTextRef }: Options) {
  const supported = isEngineSupported(engine);
  const [state, setState] = useState<RecognizerState>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<RecognizerError | null>(null);
  const [notice, setNotice] = useState<RecognizerNotice | null>(null);
  const [loadPct, setLoadPct] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [activity, setActivity] = useState(0);
  const [noText, setNoText] = useState(false);
  const pausedRef = useRef(false);
  const stateRef = useRef<RecognizerState>("idle");
  stateRef.current = state;
  const resumeAfterSwitch = useRef(false);
  const recRef = useRef<Engine | null>(null);

  const setPausedBoth = (v: boolean) => {
    pausedRef.current = v;
    setPaused(v);
  };

  // Il microfono si ricrea quando cambia la lingua o chi ascolta (browser / offline).
  useEffect(() => {
    if (!supported) return;
    // Se la lingua cambia mentre si sta ascoltando, il vecchio microfono si spegne e quello nuovo riparte.
    let alive = true;
    const rec = createEngine(engine, dictLang, whisperModel, {
      onInterim: (t) => {
        if (!alive) return;
        setInterim(pausedRef.current ? "" : t);
        if (t) setActivity((n) => n + 1);
      },
      onFinal: (text) => {
        if (!alive) return;
        if (text.trim()) setActivity((n) => n + 1);
        onTextRef.current(text);
      },
      onState: (st) => {
        if (!alive) return;
        setState(st);
        if (st !== "starting") setLoadPct(null);
        if (st === "idle") setPausedBoth(false);
      },
      onProgress: (pct) => {
        if (alive) setLoadPct(pct);
      },
      onError: (e) => {
        if (alive) setError(e);
      },
      onNotice: (n) => {
        if (alive) setNotice(n);
      },
    }, micId);
    recRef.current = rec;
    if (resumeAfterSwitch.current) {
      resumeAfterSwitch.current = false;
      rec.start();
    }
    return () => {
      alive = false;
      resumeAfterSwitch.current = stateRef.current !== "idle";
      rec.stop();
      if (recRef.current === rec) recRef.current = null;
    };
  }, [supported, dictLang, engine, whisperModel, micId, onTextRef]);

  const toggle = () => {
    if (state === "idle") {
      setError(null);
      setNotice(null);
      recRef.current?.start();
    } else {
      recRef.current?.stop();
    }
  };
  const stop = () => recRef.current?.stop();

  // Ascolta ma non arriva testo da un po': avvisa e dice cosa controllare.
  useEffect(() => {
    setNoText(false);
    if (state !== "listening" || paused) return;
    const id = window.setTimeout(() => setNoText(true), 10000);
    return () => window.clearTimeout(id);
  }, [state, paused, activity]);

  // Scorciatoie: Alt+Maiusc+D avvia/ferma, Esc ferma.
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === "KeyD") {
        e.preventDefault();
        toggleRef.current();
      } else if (e.key === "Escape" && state !== "idle" && !document.querySelector("dialog[open]")) {
        recRef.current?.stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  return {
    supported,
    state,
    active: state !== "idle",
    interim,
    error,
    notice,
    loadPct,
    paused,
    pausedRef,
    setPaused: setPausedBoth,
    noText,
    toggle,
    stop,
  };
}
