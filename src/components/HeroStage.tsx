import { lazy, Suspense } from "react";
import { EditMedia, T, useEditableList, useEditor, ItemControls, AddItem } from "@/lib/editor";
import heroImg from "@/assets/hero.jpg";
import logoOriginal from "@/assets/logo-original.png";

const HeroScene = lazy(() => import("@/components/HeroScene"));

export type HeroSettings = {
  style: "still" | "zoom" | "drift" | "pulse" | "video" | "logo3d";
  media_image: string;
  media_video: string;
  speed: number; // seconds per loop
  zoom_from: number;
  zoom_to: number;
  overlay: number; // 0-100 darkness
  grain: boolean;
  align: "left" | "center";
};

export const HERO_DEFAULTS: HeroSettings = {
  style: "zoom",
  media_image: heroImg,
  media_video: "",
  speed: 18,
  zoom_from: 1.05,
  zoom_to: 1.22,
  overlay: 45,
  grain: true,
  align: "left",
};

/** Reads hero animation settings from site content. */
export function useHeroSettings(): HeroSettings {
  const { get } = useEditor();
  let s: Partial<HeroSettings> = {};
  try {
    s = JSON.parse(get("hero_settings_json", "")) || {};
  } catch {
    /* ignore */
  }
  return { ...HERO_DEFAULTS, ...s };
}

export function HeroStage({ s }: { s: HeroSettings }) {
  const { editing, get, set } = useEditor();
  const cur = s;

  function upd(p: Partial<HeroSettings>) {
    set("hero_settings_json", JSON.stringify({ ...cur, ...p }));
  }

  const dur = Math.max(4, cur.speed);
  const animName = `heroAnim${cur.style}${dur}`;

  return (
    <>
      {/* ---------- animated background layer ---------- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {cur.style === "logo3d" ? (
          <div className="absolute inset-0 bg-black">
            <Suspense fallback={null}>
              <HeroScene />
            </Suspense>
          </div>
        ) : cur.style === "video" ? (
          <EditMedia
            k="hero_video_url"
            fallback={cur.media_video}
            video
            accept="video/*"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              animation: `${animName} ${dur}s ease-in-out infinite alternate`,
            }}
          >
            <EditMedia
              k="hero_image_url"
              fallback={cur.media_image}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        )}

        {/* overlays */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,${
              cur.overlay / 100
            }), rgba(0,0,0,${(cur.overlay / 100) * 0.8}), rgba(0,0,0,${
              (cur.overlay / 100) * 1.8
            }))`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_85%)]" />
        {cur.grain && <div className="pointer-events-none absolute inset-0 grain" />}
      </div>

      <style>{`
        @keyframes ${animName} {
          from { transform: scale(${cur.zoom_from}) translate(0, 0); }
          to   { transform: scale(${cur.zoom_to}) translate(-1.5%, 1%); }
        }
      `}</style>

      {/* ---------- admin animation panel ---------- */}
      {editing && (
        <div className="absolute right-6 top-24 z-40 w-72 rounded-xl border border-gold/40 bg-black/85 p-4 text-[11px] text-white backdrop-blur">
          <p className="mb-3 font-mono uppercase tracking-[0.25em] text-gold">
            Hero animation
          </p>
          <label className="mb-2 block">Style</label>
          <div className="mb-3 flex flex-wrap gap-1">
            {(["still", "zoom", "drift", "pulse", "video", "logo3d"] as const).map((st) => (
              <button
                key={st}
                onClick={() => upd({ style: st })}
                className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-wider ${
                  cur.style === st
                    ? "border-gold bg-gold text-black"
                    : "border-white/25 text-white/70"
                }`}
              >
                {st === "logo3d" ? "3D logo" : st}
              </button>
            ))}
          </div>
          {cur.style === "video" && (
            <p className="mb-2 text-white/60">
              Use the "Replace video" button on the background to upload your MP4.
            </p>
          )}
          <label className="block">Speed — {dur}s per loop</label>
          <input
            type="range"
            min={4}
            max={60}
            value={dur}
            onChange={(e) => upd({ speed: Number(e.target.value) })}
            className="mb-3 w-full accent-[gold]"
          />
          <label className="block">Zoom amount — {Math.round((cur.zoom_to - cur.zoom_from) * 100)}%</label>
          <input
            type="range"
            min={0}
            max={40}
            value={Math.round((cur.zoom_to - cur.zoom_from) * 100)}
            onChange={(e) =>
              upd({ zoom_to: cur.zoom_from + Number(e.target.value) / 100 })
            }
            className="mb-3 w-full accent-[gold]"
          />
          <label className="block">Overlay darkness — {cur.overlay}%</label>
          <input
            type="range"
            min={0}
            max={80}
            value={cur.overlay}
            onChange={(e) => upd({ overlay: Number(e.target.value) })}
            className="mb-3 w-full accent-[gold]"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cur.grain}
                onChange={(e) => upd({ grain: e.target.checked })}
              />
              Film grain
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cur.align === "center"}
                onChange={(e) => upd({ align: e.target.checked ? "center" : "left" })}
              />
              Center text
            </label>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ nav */

export function Nav({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const { editing, get, set } = useEditor();
  const items = useEditableList<{ label: string; href: string }>(
    "nav_links_json",
    sections.map((s) => ({ label: s.label, href: `#${s.id}` })),
    { label: "New link", href: "#" },
  );
  const logo = get("logo_url", logoOriginal);
  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-6 md:px-12">
        <a href="#top" className="flex items-center gap-3 mix-blend-difference">
          <img src={logo} alt="Logo" className="h-9 w-9 object-contain" />
          <T k="brand_name" className="font-display text-xl font-bold tracking-[0.25em] text-white">
            BLACK PIXAL
          </T>
        </a>
        <nav className="hidden gap-10 text-[11px] uppercase tracking-[0.3em] text-white md:flex mix-blend-difference">
          {items.items.map((l, i) =>
            items.editing ? (
              <span key={i} className="relative flex items-center gap-1">
                <input
                  value={l.label}
                  onChange={(e) => items.patch(i, "label", e.target.value)}
                  className="w-20 rounded border border-gold/50 bg-black/60 px-1 py-0.5 text-[10px] text-white"
                />
                <ItemControls
                  onUp={() => items.move(i, -1)}
                  onDown={() => items.move(i, 1)}
                  onRemove={() => items.remove(i)}
                />
              </span>
            ) : (
              <a key={i} href={l.href} className="hover:opacity-60">
                {l.label}
              </a>
            ),
          )}
          {items.editing && <AddItem label="link" onClick={items.add} />}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={get("nav_cta_href", "#contact")}
            className="hidden rounded-full border border-white/40 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-white transition hover:bg-white hover:text-black sm:inline-flex mix-blend-difference"
          >
            <T k="nav_cta_label">Get Quote</T>
          </a>
        </div>
      </div>
    </header>
  );
}
