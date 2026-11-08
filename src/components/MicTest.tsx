import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import type { Strings } from "../i18n";
import { isMissing, openMic } from "../audio/devices";
import { useMics } from "../audio/useMics";
import type { EngineKind } from "../speech/engine";

type Phase = "idle" | "starting" | "on" | "denied" | "none" | "error";

/**
 * Prova del microfono: mostra una barra che si muove quando arriva suono.
 * L'audio resta nel browser: non viene registrato né inviato.
 */
interface Props {
  s: Strings;
  /** microfono scelto (vuoto = predefinito) */
  micId: string;
  onMicId: (id: string) => void;
  /** chi ascolta: con «browser» la scelta del microfono non vale per la dettatura */
  engine: EngineKind;
}

export function MicTest({ s, micId, onMicId, engine }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(0);
  const [device, setDevice] = useState("");
  const [silent, setSilent] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const { devices, refresh } = useMics();
  const missing = isMissing(micId, devices);
  const named = devices.some((d) => d.label);

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setLevel(0);
    setSilent(false);
    setPhase((p) => (p === "on" || p === "starting" ? "idle" : p));
  };

  const start = async () => {
    setPhase("starting");
    setSilent(false);
    setFellBack(false);
    let stream: MediaStream;
    try {
      const opened = await openMic(micId);
      stream = opened.stream;
      setFellBack(opened.fellBack);
      void refresh(); // adesso c'è il permesso: compaiono i nomi
    } catch (e) {
      const name = (e as DOMException)?.name;
      setPhase(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "none" : "error");
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    setDevice(stream.getAudioTracks()[0]?.label ?? "");
    setPhase("on");

    let raf = 0;
    let alive = true;
    const startedAt = performance.now();
    let heard = false;
    const tick = () => {
      if (!alive) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) {
        const x = (v - 128) / 128;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / data.length);
      const lv = Math.min(1, rms * 6);
      if (lv > 0.03) heard = true;
      setLevel(lv);
      setSilent(!heard && performance.now() - startedAt > 3000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    stopRef.current = () => {
      alive = false;
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    };
  };

  // Se la finestra si chiude, il microfono si spegne.
  useEffect(() => () => stopRef.current?.(), []);

  const msg =
    phase === "denied" ? s.micDenied : phase === "none" ? s.micNone : phase === "error" ? s.micError : null;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="mic-choice" className="text-sm font-semibold">{s.micChoose}</label>
      <select
        id="mic-choice"
        value={micId}
        onChange={(e) => {
          stop();
          onMicId(e.target.value);
        }}
        className="h-10 w-full rounded-md border border-border-input bg-bg px-3 text-base"
      >
        <option value="">{s.micDefault}</option>
        {missing && <option value={micId}>{s.micMissingOption}</option>}
        {devices
          .filter((d) => d.id)
          .map((d, i) => (
            <option key={d.id} value={d.id}>{d.label || s.micUnnamed.replace("{n}", String(i + 1))}</option>
          ))}
      </select>
      {!named && devices.length > 0 && <p className="text-xs text-muted">{s.micNamesHint}</p>}
      {engine === "browser" && <p className="text-xs text-muted">{s.micBrowserNote}</p>}
      <p className="text-sm text-muted">{s.micHelp}</p>
      <div className="flex flex-wrap items-center gap-3">
        {phase === "on" ? (
          <button type="button" onClick={stop} className="inline-flex h-10 items-center gap-2 rounded-md border border-border-input px-4 text-sm font-semibold hover:bg-surface">
            <Square size={16} aria-hidden="true" />
            {s.micStop}
          </button>
        ) : (
          <button type="button" onClick={start} disabled={phase === "starting"} className="inline-flex h-10 items-center gap-2 rounded-md border border-border-input px-4 text-sm font-semibold hover:bg-surface disabled:opacity-50">
            <Mic size={16} aria-hidden="true" />
            {s.micStart}
          </button>
        )}
        <div
          role="meter"
          aria-label={s.micLevel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
          className="h-3 min-w-32 flex-1 overflow-hidden rounded-pill bg-surface"
        >
          <div className="h-full bg-accent" style={{ width: `${Math.round(level * 100)}%` }} />
        </div>
      </div>
      {phase === "on" && device && <p className="text-xs text-muted">{s.micDevice} {device}</p>}
      {phase === "on" && !silent && <p className="text-sm" role="status">{s.micSpeak}</p>}
      {phase === "on" && silent && <p className="text-sm text-warning" role="status">{s.micSilent}</p>}
      {fellBack && phase === "on" && <p className="text-sm text-warning" role="status">{s.micFallback}</p>}
      {msg && <p role="alert" className="text-sm text-danger">{msg}</p>}
    </div>
  );
}
