import { useState, type ReactNode } from "react";
import { ArrowDown, MonitorSmartphone, Printer, Share } from "lucide-react";
import { Modal } from "../components/Modal";
import type { Lang } from "../commands/types";
import type { Strings } from "../i18n";
import { closeInstallDialog, dismissInstallBanner, startInstall, useInstallState } from "./store";

/* ---------- disegni grandi per i passi (nessuna foto, nessun logo di terzi) ---------- */
const ico = { width: 56, height: 56, viewBox: "0 0 56 56", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;

/** Il pulsante «Condividi»: un quadrato aperto con una freccia verso l'alto. */
const ShareIcon = () => (
  <svg {...ico}>
    <path d="M20 24h-4a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V26a2 2 0 0 0-2-2h-4" />
    <path d="M28 34V6M19 15l9-9 9 9" />
  </svg>
);
/** «Aggiungi alla schermata Home»: un quadrato con un più. */
const AddHomeIcon = () => (
  <svg {...ico}>
    <rect x="8" y="8" width="40" height="40" rx="8" />
    <path d="M28 18v20M18 28h20" />
  </svg>
);
/** Il tasto «Aggiungi» in alto a destra: una pillola con una spunta. */
const AddButtonIcon = () => (
  <svg {...ico}>
    <rect x="6" y="16" width="44" height="24" rx="12" />
    <path d="M20 28l6 6 11-12" />
  </svg>
);
/** Il menu dei tre puntini. */
const DotsIcon = () => (
  <svg {...ico}>
    <rect x="12" y="6" width="32" height="44" rx="8" />
    <circle cx="28" cy="18" r="1.5" fill="currentColor" />
    <circle cx="28" cy="28" r="1.5" fill="currentColor" />
    <circle cx="28" cy="38" r="1.5" fill="currentColor" />
  </svg>
);

/** Un passo è una riga di istruzione, non un pulsante: niente bordo, niente ombra, niente sfondo. */
function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-1">
      <span className="w-7 shrink-0 text-2xl font-bold text-accent" aria-hidden="true">{n}.</span>
      <span className="shrink-0 text-accent">{icon}</span>
      <span className="text-lg">{children}</span>
    </li>
  );
}

/** Elenco dei passi, con il titolo «Come fare» sopra. */
function Steps({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-xl font-bold">{title}</h3>
      <ol className="flex flex-col">{children}</ol>
    </section>
  );
}

/** Altezza dello spazio che la finestra lascia libero in fondo allo schermo per la freccia (freccia, scritta, margine e rimbalzo). */
const ARROW_SPACE = "7.5rem";

/**
 * Freccia grande e animata verso il pulsante Condividi di Safari (in fondo allo schermo, al centro).
 * Sta nello spazio che la finestra le riserva (ARROW_SPACE), quindi non copre mai nulla; un tocco sulla freccia non fa niente
 * (senza questo, il tocco cadrebbe sullo sfondo e chiuderebbe la finestra).
 */
function ShareArrow({ label }: { label: string }) {
  return (
    <div data-testid="share-arrow" aria-hidden="true" className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-4" onClick={(e) => e.stopPropagation()}>
      <div className="share-arrow flex flex-col items-center rounded-lg bg-accent px-4 py-1 text-on-accent">
        <span className="text-lg font-bold">{label}</span>
        <ArrowDown size={44} strokeWidth={3} aria-hidden="true" />
      </div>
    </div>
  );
}

/* ---------- pulsante nell'intestazione ---------- */
export function InstallButton({ s }: { s: Strings }) {
  const { installCase } = useInstallState();
  if (installCase === "installed") return null;
  return (
    <button
      type="button"
      onClick={() => void startInstall()}
      aria-label={s.installButton}
      className="inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold hover:bg-surface sm:px-3"
    >
      <MonitorSmartphone size={18} aria-hidden="true" />
      <span className="text-sm sm:hidden">{s.installBannerAction}</span>
      <span className="hidden sm:inline">{s.installButton}</span>
    </button>
  );
}

/* ---------- avviso grande, la prima volta ---------- */
export function InstallBanner({ s, enabled }: { s: Strings; enabled: boolean }) {
  const { installCase, bannerDismissed } = useInstallState();
  if (!enabled || bannerDismissed || installCase === "installed") return null;
  return (
    <section aria-label={s.installBannerTitle} className="border-b border-border bg-accent-soft px-4 py-4">
      <div className="mx-auto flex max-w-editor flex-wrap items-center gap-4">
        <MonitorSmartphone size={36} aria-hidden="true" className="shrink-0 text-accent" />
        <div className="min-w-48 flex-1">
          <p className="text-lg font-bold">{s.installBannerTitle}</p>
          <p className="text-base">{s.installBannerBody}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void startInstall()}
            className="inline-flex min-h-12 items-center rounded-md bg-accent px-6 text-lg font-semibold text-on-accent"
          >
            {s.installBannerAction}
          </button>
          <button type="button" onClick={dismissInstallBanner} className="inline-flex min-h-12 items-center rounded-md px-4 text-base font-semibold text-accent underline">
            {s.installBannerLater}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- istruzioni, per i dispositivi dove un clic non basta ---------- */
export function InstallDialog({ s, lang }: { s: Strings; lang: Lang }) {
  const { dialogOpen, installCase } = useInstallState();
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
    } catch (e) {
      console.warn("non riesco a copiare l'indirizzo", e);
    }
  };

  // «Condividi» di sistema: solo se il programma lo sa fare. Se l'utente annulla (AbortError) non si mostra nulla.
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const openShare = async () => {
    try {
      await navigator.share({ title: s.appName, url: new URL(import.meta.env.BASE_URL, location.href).href });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) console.warn("non riesco ad aprire il menu Condividi", e);
    }
  };

  const base = import.meta.env.BASE_URL;
  const titles: Record<string, string> = {
    ios: s.installIosTitle,
    "ios-other": s.installIosOtherTitle,
    "safari-mac": s.installSafariMacTitle,
    firefox: s.installFirefoxTitle,
    menu: s.installMenuTitle,
  };
  const known = installCase in titles;

  return (
    <Modal
      open={dialogOpen && known}
      onClose={closeInstallDialog}
      title={titles[installCase] ?? s.installButton}
      closeLabel={s.installClose}
      reserveBottom={installCase === "ios" ? ARROW_SPACE : undefined}
    >
      <div className="flex flex-col gap-4">
        {installCase === "ios" && (
          <>
            {canShare && (
              <>
                <button
                  type="button"
                  onClick={() => void openShare()}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md bg-accent px-4 text-lg font-bold text-on-accent"
                >
                  <Share size={24} aria-hidden="true" />
                  {s.installShareButton}
                </button>
                <p className="text-lg">{s.installShareHint}</p>
              </>
            )}
            <Steps title={s.installHowTo}>
              <Step n={1} icon={<ShareIcon />}>{s.installIos1}</Step>
              <Step n={2} icon={<AddHomeIcon />}>{s.installIos2}</Step>
              <Step n={3} icon={<AddButtonIcon />}>{s.installIos3}</Step>
            </Steps>
            <ShareArrow label={s.installArrowLabel} />
          </>
        )}
        {installCase === "ios-other" && (
          <>
            <p className="text-lg">{s.installIosOtherBody}</p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-accent px-6 text-lg font-semibold text-accent"
            >
              {s.installCopyLink}
            </button>
            {copied && <p role="status" className="text-lg text-success">{s.installCopied}</p>}
            <Steps title={s.installHowTo}>
              <Step n={1} icon={<ShareIcon />}>{s.installIos1}</Step>
              <Step n={2} icon={<AddHomeIcon />}>{s.installIos2}</Step>
              <Step n={3} icon={<AddButtonIcon />}>{s.installIos3}</Step>
            </Steps>
          </>
        )}
        {installCase === "safari-mac" && <p className="text-lg">{s.installSafariMac1}</p>}
        {installCase === "firefox" && <p className="text-lg">{s.installFirefoxBody}</p>}
        {installCase === "menu" && (
          <Steps title={s.installHowTo}>
            <Step n={1} icon={<DotsIcon />}>{s.installMenu1}</Step>
            <Step n={2} icon={<AddHomeIcon />}>{s.installMenu2}</Step>
          </Steps>
        )}
        <a
          href={`${base}installa.html?lang=${lang}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border-input px-6 text-base font-semibold hover:bg-surface"
        >
          <Printer size={18} aria-hidden="true" />
          {s.installPrint}
        </a>
      </div>
    </Modal>
  );
}
