import { useEffect, useState } from "react";

export type ThemeId = "chrome" | "mono" | "glass" | "noir-gold" | "ivory-gold" | "prism";

export const themes: { id: ThemeId; name: string; swatch: string[] }[] = [
  { id: "chrome", name: "Liquid Chrome", swatch: ["#0a0a0f", "#cfe0ff", "#8a9bb4"] },
  { id: "mono", name: "Mono", swatch: ["#ffffff", "#1a1a1a", "#9ca3af"] },
  { id: "glass", name: "Glass Noir", swatch: ["#0b0b0d", "#ffffff", "#6b7280"] },
  { id: "noir-gold", name: "Noir Gold", swatch: ["#0d0d0d", "#c9a84c", "#f5f0e0"] },
  { id: "ivory-gold", name: "Ivory Gold", swatch: ["#faf8f3", "#c9a84c", "#0d0d0d"] },
  { id: "prism", name: "Prism", swatch: ["#0b0220", "#ff6b6b", "#67e8f9", "#a78bfa"] },
];

const STORAGE_KEY = "bp-theme";

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

export function getInitialTheme(): ThemeId {
  if (typeof window === "undefined") return "chrome";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && themes.some((t) => t.id === stored)) return stored;
  } catch {}
  return "chrome";
}

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ThemeId>("chrome");

  useEffect(() => {
    const initial = getInitialTheme();
    setActive(initial);
    applyTheme(initial);
  }, []);

  const pick = (id: ThemeId) => {
    setActive(id);
    applyTheme(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch theme"
        className="flex h-10 items-center gap-2 rounded-full border border-white/30 bg-black/30 px-3 backdrop-blur transition hover:border-white/60"
      >
        <span className="flex -space-x-1">
          {themes.find((t) => t.id === active)?.swatch.slice(0, 3).map((c, i) => (
            <span
              key={i}
              className="h-4 w-4 rounded-full border border-white/40"
              style={{ background: c }}
            />
          ))}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white">
          Theme
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-60 rounded-xl border border-white/15 bg-black/85 p-2 shadow-2xl backdrop-blur-xl animate-fade-in">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/10 ${
                active === t.id ? "bg-white/10" : ""
              }`}
            >
              <span className="flex -space-x-1">
                {t.swatch.map((c, i) => (
                  <span
                    key={i}
                    className="h-5 w-5 rounded-full border border-white/30"
                    style={{ background: c }}
                  />
                ))}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white">
                {t.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemeSwitcher;
