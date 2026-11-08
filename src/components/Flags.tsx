import { LANGS, LANG_NAME } from "../commands";
import type { Lang } from "../commands/types";

// Bandiere disegnate a mano (le "emoji bandiera" su Windows si vedono solo come lettere).
function Flag({ lang }: { lang: Lang }) {
  const common = { width: 28, height: 20, viewBox: "0 0 30 20", "aria-hidden": true, focusable: false } as const;
  switch (lang) {
    case "it":
      return (
        <svg {...common}>
          <rect width="10" height="20" fill="#009246" />
          <rect x="10" width="10" height="20" fill="#ffffff" />
          <rect x="20" width="10" height="20" fill="#ce2b37" />
        </svg>
      );
    case "fr":
      return (
        <svg {...common}>
          <rect width="10" height="20" fill="#0055a4" />
          <rect x="10" width="10" height="20" fill="#ffffff" />
          <rect x="20" width="10" height="20" fill="#ef4135" />
        </svg>
      );
    case "es":
      return (
        <svg {...common}>
          <rect width="30" height="20" fill="#aa151b" />
          <rect y="5" width="30" height="10" fill="#f1bf00" />
        </svg>
      );
    case "en":
      return (
        <svg {...common} viewBox="0 0 60 40" preserveAspectRatio="none">
          <clipPath id="flag-uk-box"><path d="M0,0 v40 h60 v-40 z" /></clipPath>
          <clipPath id="flag-uk-cut"><path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z" /></clipPath>
          <g clipPath="url(#flag-uk-box)">
            <path d="M0,0 v40 h60 v-40 z" fill="#012169" />
            <path d="M0,0 L60,40 M60,0 L0,40" stroke="#ffffff" strokeWidth="8" />
            <path d="M0,0 L60,40 M60,0 L0,40" clipPath="url(#flag-uk-cut)" stroke="#c8102e" strokeWidth="5" />
            <path d="M30,0 v40 M0,20 h60" stroke="#ffffff" strokeWidth="13" />
            <path d="M30,0 v40 M0,20 h60" stroke="#c8102e" strokeWidth="8" />
          </g>
        </svg>
      );
  }
}

interface Props {
  value: Lang;
  label: string;
  onPick: (l: Lang) => void;
}

/** Le bandierine accanto al nome: scelgono la lingua dell'app (menu, testi) e della voce. */
export function Flags({ value, label, onPick }: Props) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      {LANGS.map((l) => {
        const active = l === value;
        return (
          <button
            key={l}
            type="button"
            title={LANG_NAME[l]}
            aria-label={LANG_NAME[l]}
            aria-pressed={active}
            onClick={() => onPick(l)}
            className={`inline-flex h-8 w-9 items-center justify-center rounded-md border-2 ${
              active ? "border-accent bg-accent-soft" : "border-transparent hover:bg-surface"
            }`}
          >
            <span className="overflow-hidden rounded-sm shadow-card" style={{ lineHeight: 0 }}>
              <Flag lang={l} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
