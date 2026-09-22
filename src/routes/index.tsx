import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  EditorProvider,
  T,
  useEditor,
  useEditableList,
  ItemControls,
  AddItem,
} from "@/lib/editor";
import { listPortfolio, type PortfolioItem } from "@/lib/cms";
import { useQuery } from "@tanstack/react-query";
import { PortfolioPreview, PortfolioRenderer } from "@/components/portfolio/PortfolioRenderer";
import { HeroStage, Nav, useHeroSettings } from "@/components/HeroStage";
import { EditToolbar } from "@/components/EditToolbar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

import workRetouchAfter from "@/assets/work-retouch-after.jpg";
import workRetouchBefore from "@/assets/work-retouch-before.jpg";
import workAiVideo from "@/assets/work-aivideo.jpg";
import workColor from "@/assets/work-color.jpg";
import workSocial from "@/assets/work-social.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BLACK PIXAL — Creative Design & AI Studio" },
      {
        name: "description",
        content:
          "Premium creative design and AI studio. Banners, branding, retouching, AI video and editorial visuals for brands that refuse the ordinary.",
      },
      { property: "og:title", content: "BLACK PIXAL — Creative Design & AI Studio" },
      {
        property: "og:description",
        content: "Editorial. Cinematic. AI-native. Crafted in black and gold.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <EditorProvider>
      <Home />
    </EditorProvider>
  ),
});

type SectionType =
  | "hero"
  | "marquee"
  | "services"
  | "work"
  | "before_after"
  | "films"
  | "testimonials"
  | "contact";

const DEFAULT_LAYOUT: { type: SectionType; label: string; visible: boolean }[] = [
  { type: "hero", label: "Hero", visible: true },
  { type: "marquee", label: "Marquee", visible: true },
  { type: "services", label: "Services", visible: true },
  { type: "work", label: "Selected Work", visible: true },
  { type: "before_after", label: "Before / After", visible: true },
  { type: "films", label: "AI Films", visible: true },
  { type: "testimonials", label: "Testimonials", visible: true },
  { type: "contact", label: "Contact", visible: true },
];

function useLayout() {
  const { editing, get, set } = useEditor();
  let layout = DEFAULT_LAYOUT;
  try {
    const parsed = JSON.parse(get("sections_json", "")) || [];
    if (Array.isArray(parsed) && parsed.length) layout = parsed;
  } catch {
    /* ignore */
  }
  return { editing, layout, setLayout: (l: typeof layout) => set("sections_json", JSON.stringify(l)) };
}

function Home() {
  const { layout } = useLayout();
  const listPortfolioFn = listPortfolio;
  const { data: cmsItems = [] } = useQuery({
    queryKey: ["public-portfolio"],
    queryFn: () => listPortfolioFn(),
    staleTime: 60_000,
  });

  return (
    <main className="relative z-10 text-foreground">
      <PageLayoutPanel />
      <NavWithSections />
      {layout
        .filter((s) => s.visible)
        .map((s, i) => {
          const num = String(i + 1).padStart(2, "0");
          const key = `${s.type}-${i}`;
          switch (s.type) {
            case "hero":
              return <Hero key={key} />;
            case "marquee":
              return <Marquee key={key} />;
            case "services":
              return <Services key={key} num={num} label={s.label} />;
            case "work":
              return <Portfolio key={key} num={num} label={s.label} items={cmsItems} />;
            case "before_after":
              return <BeforeAfter key={key} num={num} label={s.label} />;
            case "films":
              return <Films key={key} num={num} label={s.label} />;
            case "testimonials":
              return <Testimonials key={key} num={num} label={s.label} />;
            case "contact":
              return <Contact key={key} num={num} label={s.label} />;
            default:
              return null;
          }
        })}
      <Footer />
      <EditToolbar />
      <ThemeSwitcher />
    </main>
  );
}

/** Floating panel to reorder / hide / rename homepage sections. */
function PageLayoutPanel() {
  const { editing, layout, setLayout } = useLayout();
  const [open, setOpen] = useState(false);
  if (!editing) return null;
  return (
    <div className="fixed right-5 top-24 z-[80] text-[11px] text-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-gold/60 bg-black/85 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-gold backdrop-blur"
      >
        Page sections
      </button>
      {open && (
        <div className="mt-2 w-64 rounded-xl border border-gold/40 bg-black/90 p-3 backdrop-blur">
          {layout.map((s, i) => (
            <div key={s.type + i} className="flex items-center gap-1 py-1">
              <button
                onClick={() => {
                  const n = [...layout];
                  if (i === 0) return;
                  [n[i - 1], n[i]] = [n[i], n[i - 1]];
                  setLayout(n);
                }}
                className="px-1 text-white/50 hover:text-gold"
              >
                ↑
              </button>
              <button
                onClick={() => {
                  const n = [...layout];
                  if (i === layout.length - 1) return;
                  [n[i + 1], n[i]] = [n[i], n[i + 1]];
                  setLayout(n);
                }}
                className="px-1 text-white/50 hover:text-gold"
              >
                ↓
              </button>
              <input
                value={s.label}
                onChange={(e) => {
                  const n = [...layout];
                  n[i] = { ...s, label: e.target.value };
                  setLayout(n);
                }}
                className="flex-1 rounded border border-white/20 bg-black/60 px-2 py-1 text-[11px]"
              />
              <input
                type="checkbox"
                checked={s.visible}
                title="Show / hide section"
                onChange={(e) => {
                  const n = [...layout];
                  n[i] = { ...s, visible: e.target.checked };
                  setLayout(n);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NavWithSections() {
  const { layout } = useLayout();
  const anchor: Record<SectionType, string> = {
    hero: "top",
    marquee: "",
    services: "services",
    work: "work",
    before_after: "",
    films: "films",
    testimonials: "",
    contact: "contact",
  };
  return (
    <Nav
      sections={layout
        .filter((s) => s.visible && anchor[s.type])
        .map((s) => ({ id: anchor[s.type], label: s.label }))}
    />
  );
}

/* ------------------------------------------------------------------- hero */

function Hero() {
  const s = useHeroSettings();
  return (
    <section
      id="top"
      className={`relative flex h-[100svh] w-full flex-col overflow-hidden bg-black ${
        s.grain ? "grain" : ""
      }`}
    >
      <HeroStage s={s} />
      <div
        className={`relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-between px-6 pb-20 pt-28 md:px-12 md:pt-40 ${
          s.align === "center" ? "items-center text-center" : ""
        }`}
      >
        <div>
          <T
            k="hero_kicker"
            className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/80"
          >
            est. 2024 — creative design & ai studio
          </T>
        </div>
        <div>
          <h1
            aria-label={`${s.align ? "" : ""}${"BLACK PIXAL"}`}
            className="hero-title font-serif text-[clamp(2.5rem,10vw,8rem)] font-semibold leading-[0.95] tracking-tight text-foreground"
          >
            <span className="block">
              <T k="hero_title_top">BLACK</T>
            </span>
            <span className="block bg-gradient-to-r from-gold via-foreground to-gold bg-clip-text italic text-transparent">
              <T k="hero_title_bottom">PIXAL</T>
            </span>
          </h1>
          <div
            className={`mt-6 grid gap-6 md:mt-8 md:grid-cols-[1fr_auto] md:items-end md:gap-8 ${
              s.align === "center" ? "md:grid-cols-1" : ""
            }`}
          >
            <T
              k="hero_desc"
              as="p"
              className={`max-w-xl text-balance text-sm leading-relaxed text-foreground/70 md:text-base ${
                s.align === "center" ? "mx-auto" : ""
              }`}
            >
              An editorial studio for brands that refuse the ordinary. We craft cinematic
              visuals, identity systems and AI-native films — all in black and gold.
            </T>
            <div className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/50 md:block">
              <p>scroll</p>
              <p>↓</p>
            </div>
          </div>
        </div>
      </div>
      <ScrollIndicator />
    </section>
  );
}

function ScrollIndicator() {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
      <div className="flex h-12 w-7 items-start justify-center rounded-full border border-gold/40 p-1.5">
        <span className="block h-2 w-[2px] animate-[scrollDot_1.8s_ease-in-out_infinite] rounded-full bg-gold" />
      </div>
      <style>{`@keyframes scrollDot { 0%{transform:translateY(0);opacity:1} 70%{transform:translateY(16px);opacity:0} 100%{transform:translateY(0);opacity:0} }`}</style>
    </div>
  );
}

/* ---------------------------------------------------------------- marquee */

function Marquee() {
  const { editing, get, set } = useEditor();
  const words = get(
    "marquee_words",
    "Banner Design, Pamphlet, Logo & Branding, Photo Retouching, Color Correction, AI Video, Social Ads",
  );
  const list = words
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
  const row = [...list, ...list, ...list];
  return (
    <section aria-hidden className="border-y border-border/60 bg-ink py-6 overflow-hidden">
      <div className="marquee flex gap-12 whitespace-nowrap">
        {(editing ? list : row).map((w, i) => (
          <span
            key={i}
            className="flex items-center gap-12 font-display text-3xl italic text-gold/80 md:text-5xl"
          >
            {editing ? (
              <input
                value={w}
                onChange={(e) => {
                  const n = [...list];
                  n[i] = e.target.value;
                  set("marquee_words", n.join(", "));
                }}
                className="w-48 rounded border border-gold/50 bg-black/60 px-2 py-1 text-white"
              />
            ) : (
              w
            )}
            <span className="text-gold">✦</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- services */

const SERVICES_FALLBACK = [
  { n: "01", title: "Banner Design", desc: "Editorial campaign banners that command attention across every channel." },
  { n: "02", title: "Pamphlet & Flyer", desc: "Print collateral with rhythm, restraint and an unmistakable point of view." },
  { n: "03", title: "Logo & Branding", desc: "Identity systems built to outlive trends — quiet, considered, iconic." },
  { n: "04", title: "Photo Retouching", desc: "High-end skin, product and fashion retouching at the level of Vogue covers." },
  { n: "05", title: "Color Correction", desc: "Cinematic color grading that gives every frame mood, weight and intent." },
  { n: "06", title: "AI Video Creation", desc: "Director-led AI films and motion pieces blending craft with new tooling." },
];

function Services({ num, label }: { num: string; label: string }) {
  const items = useEditableList<{ n?: string; title: string; desc: string }>(
    "services_json",
    SERVICES_FALLBACK,
    { title: "New service", desc: "Description…" },
  );
  return (
    <section id="services" className="relative bg-background px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel num={num} k={`section_services_label`} fallback={label} />
        <h2 className="mt-6 max-w-3xl whitespace-pre-line font-display text-5xl leading-[1] tracking-tight md:text-7xl">
          <T k="services_heading">A studio where editorial taste meets AI craft.</T>
        </h2>
        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-border/60 bg-border/60 md:grid-cols-2 lg:grid-cols-3">
          {items.items.map((s, si) => (
            <article key={si} className="hover-glow group relative bg-background p-8 md:p-10">
              {items.editing && (
                <ItemControls
                  onUp={() => items.move(si, -1)}
                  onDown={() => items.move(si, 1)}
                  onRemove={() => items.remove(si)}
                />
              )}
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] text-gold/70">
                  {s.n ?? String(si + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/40 transition group-hover:text-gold">
                  →
                </span>
              </div>
              <h3 className="mt-12 font-display text-3xl tracking-tight md:text-4xl">
                {items.editing ? (
                  <input
                    value={s.title}
                    onChange={(e) => items.patch(si, "title", e.target.value)}
                    className="w-full rounded border border-gold/50 bg-black/60 px-2 py-1"
                  />
                ) : (
                  s.title
                )}
              </h3>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground/60">
                {items.editing ? (
                  <textarea
                    rows={3}
                    value={s.desc}
                    onChange={(e) => items.patch(si, "desc", e.target.value)}
                    className="w-full rounded border border-gold/50 bg-black/60 px-2 py-1"
                  />
                ) : (
                  s.desc
                )}
              </p>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-gold to-transparent transition-transform duration-700 group-hover:scale-x-100" />
            </article>
          ))}
        </div>
        {items.editing && <div className="mt-6"><AddItem label="service" onClick={items.add} /></div>}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- portfolio */

function Portfolio({
  num,
  label,
  items: cmsItems,
}: {
  num: string;
  label: string;
  items: PortfolioItem[];
}) {
  const [filter, setFilter] = useState("All");
  const t = useEditor();
  const cats = Array.from(
    new Set(cmsItems.flatMap((i) => i.categories?.length ? i.categories : [i.category])),
  );
  const filters = ["All", ...cats];
  const items = cmsItems.filter(
    (i) => filter === "All" || i.categories?.includes(filter) || i.category === filter,
  );
  const [active, setActive] = useState<PortfolioItem | null>(null);

  return (
    <section id="work" className="relative bg-ink px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel num={num} k="section_work_label" fallback={label} />
            <h2 className="mt-6 max-w-2xl whitespace-pre-line font-display text-5xl leading-[1] tracking-tight md:text-7xl">
              <T k="work_heading">A vault of quiet obsession.</T>
            </h2>
          </div>
        </div>

        {filters.length > 2 && (
          <div className="mt-12 flex flex-wrap gap-2 md:gap-3">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition ${
                  filter === f
                    ? "border-gold bg-gold text-ink"
                    : "border-border text-foreground/60 hover:border-gold/60 hover:text-gold"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <figure
              key={i.id}
              onClick={() => setActive(i)}
              className="hover-glow group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-sm bg-background"
            >
              <PortfolioPreview item={i} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-90 transition-opacity duration-500" />
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                    {i.categories?.[0] ?? i.category}
                  </p>
                  <h3 className="mt-2 font-display text-2xl tracking-tight text-white">
                    {i.title || "Untitled"}
                  </h3>
                </div>
                <span className="font-mono text-xs text-gold opacity-0 transition group-hover:opacity-100">
                  view ↗
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        {cmsItems.length === 0 && (
          <p className="mt-10 text-sm text-foreground/50">
            No published work yet — add pieces in the admin panel.
          </p>
        )}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/90 p-4"
          onClick={() => setActive(null)}
        >
          <div className="my-8 w-full max-w-4xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <PortfolioRenderer item={active} />
            <div className="flex items-start justify-between gap-6">
              <div>
                <h3 className="font-display text-2xl text-white">{active.title}</h3>
                {active.description && (
                  <p className="mt-1 max-w-xl text-sm text-white/60">{active.description}</p>
                )}
                {active.client && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                    {active.client}
                  </p>
                )}
              </div>
              <button
                onClick={() => setActive(null)}
                className="rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ before/after */

function BeforeAfter({ num, label }: { num: string; label: string }) {
  const t = useEditor();
  const afterSrc = t.get("after_image_url", workRetouchAfter);
  const beforeSrc = t.get("before_image_url", workRetouchBefore);
  const [pos, setPos] = useState(50);
  const [drag, setDrag] = useState(false);

  const move = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <section className="relative bg-background px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel num={num} k="section_before_after_label" fallback={label} />
        <div className="mt-6 grid gap-10 md:grid-cols-[1fr_1fr] md:items-end">
          <h2 className="whitespace-pre-line font-display text-5xl leading-[1] tracking-tight md:text-7xl">
            <T k="before_after_heading">Retouching, undone.</T>
          </h2>
          <T
            k="before_after_desc"
            as="p"
            className="max-w-md whitespace-pre-line text-sm leading-relaxed text-foreground/60"
          >
            Drag the slider — or tap anywhere on the image — to compare an untouched capture
            with a Black Pixal high-end retouch. Skin texture is preserved, never plasticised.
          </T>
        </div>

        <div
          role="slider"
          tabIndex={0}
          aria-label="Before and after comparison"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onPointerDown={(e) => {
            setDrag(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            move(e.clientX, e.currentTarget);
          }}
          onPointerMove={(e) => drag && move(e.clientX, e.currentTarget)}
          onPointerUp={() => setDrag(false)}
          onPointerCancel={() => setDrag(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
            if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
          }}
          className="relative mt-12 aspect-[4/5] max-h-[80vh] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-sm outline-none ring-gold focus-visible:ring-2 focus-visible:ring-gold md:aspect-[16/9]"
        >
          <img
            src={afterSrc}
            alt="After retouching"
            loading="lazy"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          >
            <img
              src={beforeSrc}
              alt="Before retouching"
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <span className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/40 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white backdrop-blur">
            Before
          </span>
          <span className="pointer-events-none absolute right-4 top-4 rounded-full border border-gold/60 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-gold backdrop-blur">
            After
          </span>
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
          >
            <div className="h-full w-px bg-gold shadow-[0_0_20px_var(--glow-color)]" />
            <div className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold bg-black/70 backdrop-blur">
              <span className="font-mono text-xs text-gold">⇆</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ films */

function Films({ num, label }: { num: string; label: string }) {
  const films = useEditableList<{ title: string; duration: string; img: string }>(
    "films_json",
    [
      { title: "Midnight Drive", duration: "00:48", img: workAiVideo },
      { title: "Lobby Hour", duration: "01:12", img: workColor },
      { title: "Onyx Ritual", duration: "00:32", img: workSocial },
    ],
    { title: "New film", duration: "00:30", img: workAiVideo },
  );
  const [active, setActive] = useState<number | null>(null);
  const { editing, upload } = useEditor();

  return (
    <section id="films" className="relative bg-ink px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel num={num} k="section_films_label" fallback={label} />
        <h2 className="mt-6 max-w-3xl whitespace-pre-line font-display text-5xl leading-[1] tracking-tight md:text-7xl">
          <T k="films_heading">Director-led AI films.</T>
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {films.items.map((f, i) => (
            <div
              key={i}
              className="hover-glow group relative aspect-[3/4] overflow-hidden rounded-sm"
              onClick={() => !editing && setActive(i)}
            >
              <img
                src={f.img}
                alt={f.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-110"
              />
              {editing && (
                <>
                  <label className="absolute inset-0 z-30 grid cursor-pointer place-items-center bg-black/50 font-mono text-[10px] uppercase tracking-[0.25em] text-gold">
                    Replace poster
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) films.patch(i, "img", await upload(file));
                      }}
                    />
                  </label>
                  <ItemControls
                    onUp={() => films.move(i, -1)}
                    onDown={() => films.move(i, 1)}
                    onRemove={() => films.remove(i)}
                  />
                </>
              )}
              <div className={`${editing ? "hidden" : ""} absolute inset-0 grid place-items-center`}>
                <span className="grid h-20 w-20 place-items-center rounded-full border border-gold/70 bg-black/40 backdrop-blur transition group-hover:scale-110">
                  <span className="ml-1 block h-0 w-0 border-y-8 border-l-[12px] border-y-transparent border-l-gold" />
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                {editing ? (
                  <input
                    value={f.title}
                    onChange={(e) => films.patch(i, "title", e.target.value)}
                    className="w-32 rounded border border-gold/50 bg-black/70 px-2 py-1 text-white"
                  />
                ) : (
                  <h3 className="font-display text-2xl tracking-tight text-white">{f.title}</h3>
                )}
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                  {f.duration}
                </span>
              </div>
            </div>
          ))}
        </div>
        {films.editing && <div className="mt-6"><AddItem label="film" onClick={films.add} /></div>}
      </div>

      {active !== null && films.items[active] && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-6 backdrop-blur-md"
          onClick={() => setActive(null)}
        >
          <div
            className="ring-gold relative w-full max-w-5xl overflow-hidden rounded-sm bg-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video w-full">
              <img
                src={films.items[active].img}
                alt={films.items[active].title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between p-6">
              <h3 className="font-display text-2xl text-white">{films.items[active].title}</h3>
              <button
                onClick={() => setActive(null)}
                className="rounded-full border border-gold/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-gold hover:bg-gold hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ----------------------------------------------------------- testimonials */

const TESTIMONIALS_FALLBACK = [
  { quote: "Black Pixal turned our launch into a film. The restraint, the gold, the silence between frames — it sold the brand on its own.", name: "Amara V.", role: "Founder, Maison Noir" },
  { quote: "The only studio I've worked with that treats AI like a camera, not a gimmick.", name: "Devon K.", role: "Creative Director, Aurum" },
  { quote: "Retouching at a level I've only seen on Italian Vogue. Quietly perfect.", name: "Priya R.", role: "Photographer" },
  { quote: "They redesigned our identity in three weeks and our investor decks landed differently.", name: "Marcus L.", role: "CEO, Onyx Capital" },
  { quote: "Editorial taste, technical precision, zero ego. Rare combination.", name: "Sora T.", role: "Art Director" },
];

function Testimonials({ num, label }: { num: string; label: string }) {
  const items = useEditableList<{ quote: string; name: string; role: string }>(
    "testimonials_json",
    TESTIMONIALS_FALLBACK,
    { quote: "New quote…", name: "Name", role: "Role" },
  );
  const row = [...items.items, ...items.items];
  return (
    <section className="relative bg-background px-0 py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12">
        <SectionLabel num={num} k="section_testimonials_label" fallback={label} />
        <h2 className="mt-6 max-w-3xl whitespace-pre-line font-display text-5xl leading-[1] tracking-tight md:text-7xl">
          <T k="testimonials_heading">What our clients say.</T>
        </h2>
        {items.editing && <div className="mt-4"><AddItem label="testimonial" onClick={items.add} /></div>}
      </div>
      <div className="mt-16 overflow-hidden">
        <div className={`marquee flex gap-6 px-6 ${items.editing ? "!overflow-x-auto" : ""}`}>
          {(items.editing ? items.items : row).map((t, i) => (
            <article
              key={i}
              className="relative w-[340px] shrink-0 rounded-sm border border-border/60 bg-white/[0.03] p-8 md:w-[420px]"
            >
              {items.editing && (
                <ItemControls
                  onUp={() => items.move(i, -1)}
                  onDown={() => items.move(i, 1)}
                  onRemove={() => items.remove(i)}
                />
              )}
              <span className="font-display text-5xl leading-none text-gold">"</span>
              <p className="mt-2 font-display text-xl italic leading-snug text-foreground/90">
                {items.editing ? (
                  <textarea
                    rows={4}
                    value={t.quote}
                    onChange={(e) => items.patch(i, "quote", e.target.value)}
                    className="w-full rounded border border-gold/50 bg-black/60 px-2 py-1 text-sm"
                  />
                ) : (
                  t.quote
                )}
              </p>
              <div className="mt-6 border-t border-border/60 pt-4">
                {items.editing ? (
                  <div className="flex gap-2">
                    <input
                      value={t.name}
                      onChange={(e) => items.patch(i, "name", e.target.value)}
                      className="w-1/2 rounded border border-gold/50 bg-black/60 px-2 py-1 text-xs"
                    />
                    <input
                      value={t.role}
                      onChange={(e) => items.patch(i, "role", e.target.value)}
                      className="w-1/2 rounded border border-gold/50 bg-black/60 px-2 py-1 text-xs"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-foreground">{t.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/50">
                      {t.role}
                    </p>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- contact */

function Contact({ num, label }: { num: string; label: string }) {
  const items = useEditableList<{ label: string; value: string; href: string }>(
    "contacts_json",
    [
      { label: "WhatsApp", value: "+91 98406 60671", href: "https://wa.me/919840660671" },
      { label: "Instagram", value: "@blackpixalstudio", href: "https://instagram.com/blackpixalstudio" },
      { label: "Email", value: "blackpixalstudio@gmail.com", href: "mailto:blackpixalstudio@gmail.com" },
    ],
    { label: "Label", value: "Value", href: "#" },
  );
  const t = useEditor();
  return (
    <section id="contact" className="relative bg-ink px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel num={num} k="section_contact_label" fallback={label} />
        <h2 className="mt-6 max-w-4xl whitespace-pre-line font-display text-6xl leading-[0.95] tracking-tight md:text-[9vw]">
          <T k="contact_heading">Let's make something</T>
          <br />
          <em className="gold-text gold-glow">
            <T k="contact_heading_accent">unforgettable.</T>
          </em>
        </h2>

        <div className="mt-16 grid gap-12 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-6 sm:grid-cols-3">
            {items.items.map((c, i) => (
              <div key={i} className="relative">
                {items.editing && (
                  <ItemControls
                    onUp={() => items.move(i, -1)}
                    onDown={() => items.move(i, 1)}
                    onRemove={() => items.remove(i)}
                  />
                )}
                {items.editing ? (
                  <div className="space-y-2 rounded-sm border border-gold/40 bg-black/40 p-4">
                    {(["label", "value", "href"] as const).map((f) => (
                      <input
                        key={f}
                        value={c[f]}
                        placeholder={f}
                        onChange={(e) => items.patch(i, f, e.target.value)}
                        className="w-full rounded border border-gold/50 bg-black/60 px-2 py-1 text-xs"
                      />
                    ))}
                  </div>
                ) : (
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hover-glow group block rounded-sm border border-border/60 bg-background p-6"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold/70">
                      {c.label}
                    </p>
                    <p className="mt-3 break-words font-display text-2xl text-foreground transition group-hover:text-gold">
                      {c.value}
                    </p>
                  </a>
                )}
              </div>
            ))}
          </div>

          <a
            href={t.get("contact_cta_href", "mailto:blackpixalstudio@gmail.com?subject=Project%20Quote")}
            className="group relative inline-flex items-center justify-center gap-3 self-start overflow-hidden rounded-full bg-gold px-10 py-5 font-mono text-[11px] uppercase tracking-[0.3em] text-ink transition hover:scale-[1.02]"
          >
            <span className="relative z-10">
              <T k="contact_cta_label">Get Quote</T>
            </span>
            <span className="relative z-10">→</span>
          </a>
        </div>
        {items.editing && <div className="mt-6"><AddItem label="contact card" onClick={items.add} /></div>}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- footer */

function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-10 md:px-12">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 text-[11px] uppercase tracking-[0.3em] text-foreground/50 md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()}{" "}
          <T k="footer_left">Black Pixal — All rights reserved</T>
        </p>
        <p className="font-mono">
          <T k="footer_right">Crafted in black & gold</T>
        </p>
      </div>
    </footer>
  );
}

function SectionLabel({
  num,
  k,
  fallback,
}: {
  num: string;
  k: string;
  fallback: string;
}) {
  return (
    <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-gold/80">
      <span>{num}</span>
      <span className="h-px w-12 bg-gold/50" />
      <T k={k}>{fallback}</T>
    </div>
  );
}
