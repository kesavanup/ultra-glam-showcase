import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { listPortfolio, type PortfolioItem } from "@/lib/portfolio.functions";
import { listSiteContent } from "@/lib/site-content.functions";

import heroImg from "@/assets/hero.jpg";
import logoOriginal from "@/assets/logo-original.png";
import workBanner from "@/assets/work-banner.jpg";
import workPamphlet from "@/assets/work-pamphlet.jpg";
import workLogo from "@/assets/work-logo.jpg";
import workRetouchAfter from "@/assets/work-retouch-after.jpg";
import workRetouchBefore from "@/assets/work-retouch-before.jpg";
import workAiVideo from "@/assets/work-aivideo.jpg";
import workSocial from "@/assets/work-social.jpg";
import workColor from "@/assets/work-color.jpg";

import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { AdminButton } from "@/components/AdminButton";

import heroVideo from "@/assets/hero-construction.mp4.asset.json";

gsap.registerPlugin(ScrollTrigger);

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
    ],
  }),
  component: Home,
});

type Category =
  | "All"
  | "Banner"
  | "Pamphlet"
  | "Logo"
  | "Retouching"
  | "AI Video"
  | "Social Media Ads";

const services = [
  {
    n: "01",
    title: "Banner Design",
    desc: "Editorial campaign banners that command attention across every channel.",
  },
  {
    n: "02",
    title: "Pamphlet & Flyer",
    desc: "Print collateral with rhythm, restraint and an unmistakable point of view.",
  },
  {
    n: "03",
    title: "Logo & Branding",
    desc: "Identity systems built to outlive trends — quiet, considered, iconic.",
  },
  {
    n: "04",
    title: "Photo Retouching",
    desc: "High-end skin, product and fashion retouching at the level of Vogue covers.",
  },
  {
    n: "05",
    title: "Color Correction",
    desc: "Cinematic color grading that gives every frame mood, weight and intent.",
  },
  {
    n: "06",
    title: "AI Video Creation",
    desc: "Director-led AI films and motion pieces blending craft with new tooling.",
  },
];

const portfolio: { title: string; cat: Exclude<Category, "All">; img: string }[] = [
  { title: "Aurum — Spring Campaign", cat: "Banner", img: workBanner },
  { title: "Maison Noir — Trifold", cat: "Pamphlet", img: workPamphlet },
  { title: "Ñ Monogram", cat: "Logo", img: workLogo },
  { title: "Editorial Portrait No. 7", cat: "Retouching", img: workRetouchAfter },
  { title: "Midnight Drive", cat: "AI Video", img: workAiVideo },
  { title: "Onyx Perfume — IG Ad", cat: "Social Media Ads", img: workSocial },
  { title: "Lobby — Color Grade", cat: "Banner", img: workColor },
  { title: "Velvet Hour", cat: "Social Media Ads", img: workSocial },
];

const filters: Category[] = [
  "All",
  "Banner",
  "Pamphlet",
  "Logo",
  "Retouching",
  "AI Video",
  "Social Media Ads",
];

const testimonials = [
  {
    quote:
      "Black Pixal turned our launch into a film. The restraint, the gold, the silence between frames — it sold the brand on its own.",
    name: "Amara V.",
    role: "Founder, Maison Noir",
  },
  {
    quote: "The only studio I've worked with that treats AI like a camera, not a gimmick.",
    name: "Devon K.",
    role: "Creative Director, Aurum",
  },
  {
    quote: "Retouching at a level I've only seen on Italian Vogue. Quietly perfect.",
    name: "Priya R.",
    role: "Photographer",
  },
  {
    quote: "They redesigned our identity in three weeks and our investor decks landed differently.",
    name: "Marcus L.",
    role: "CEO, Onyx Capital",
  },
  {
    quote: "Editorial taste, technical precision, zero ego. Rare combination.",
    name: "Sora T.",
    role: "Art Director",
  },
];

function useSiteContent() {
  const fetchFn = useServerFn(listSiteContent);
  const { data = {} } = useQuery({
    queryKey: ["public-site-content"],
    queryFn: () => fetchFn(),
    staleTime: 30_000,
  });
  return (key: string, fallback: string) => {
    const v = data[key];
    return v && v.trim().length > 0 ? v : fallback;
  };
}

function Home() {
  return (
    <main className="relative z-10 text-foreground">
      <Nav />
      <Hero />
      <Marquee />
      <Services />
      <Portfolio />
      <BeforeAfter />
      <AiVideoShowcase />
      <Testimonials />
      <Contact />
      <Footer />
    </main>
  );
}


function Nav() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-6 md:px-12">
        <a href="#top" className="flex items-center gap-3 mix-blend-difference">
          <img src={logoOriginal} alt="Black Pixal" className="h-9 w-9 object-contain" />
          <span className="font-display text-xl font-bold tracking-[0.25em] text-white">
            BLACK PIXAL
          </span>
        </a>
        <nav className="hidden gap-10 text-[11px] uppercase tracking-[0.3em] text-white md:flex mix-blend-difference">
          <a href="#services" className="hover:opacity-60">Services</a>
          <a href="#work" className="hover:opacity-60">Work</a>
          <a href="#films" className="hover:opacity-60">Films</a>
          <a href="#contact" className="hover:opacity-60">Contact</a>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="#contact"
            className="hidden rounded-full border border-white/40 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-white transition hover:bg-white hover:text-black sm:inline-flex mix-blend-difference"
          >
            Get Quote
          </a>
          <ThemeSwitcher />
          <AdminButton />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const t = useSiteContent();
  const wrap = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Slow continuous zoom (cinematic Ken Burns)
      gsap.to(img.current, {
        scale: 1.18,
        duration: 18,
        ease: "none",
        repeat: -1,
        yoyo: true,
      });
      // Parallax + reveal on scroll
      gsap.to(img.current, {
        yPercent: 25,
        ease: "none",
        scrollTrigger: { trigger: wrap.current, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(title.current, {
        yPercent: -40,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: wrap.current, start: "top top", end: "bottom top", scrub: true },
      });
      // Letter reveal (skip if no char spans exist — headline is sr-only)
      const chars = title.current?.querySelectorAll<HTMLSpanElement>("[data-char]");
      if (chars && chars.length > 0) {
        gsap.from(chars, {
          yPercent: 110,
          duration: 1.4,
          ease: "expo.out",
          stagger: 0.04,
          delay: 0.2,
        });
      }
    }, wrap);
    return () => ctx.revert();
  }, []);

  const headline = "BLACK PIXAL";
  return (
    <section id="top" ref={wrap} className="relative h-[100svh] w-full overflow-hidden grain bg-black">
      {/* Cinematic MP4 background — replaces heavy WebGL for smooth performance */}
      <div ref={img} className="pointer-events-none absolute inset-0 will-change-transform">
        <video
          src={heroVideo.url}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={heroImg}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_85%)]" />
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-between px-6 pb-20 pt-28 md:px-12 md:pt-40">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/80">
            {t("hero_kicker", "est. 2024 — creative design & ai studio")}
          </p>
        </div>

        <div>
          <h1 ref={title} className="sr-only" aria-label={headline}>{headline}</h1>
          <UnderConstruction />
          <div className="mt-6 grid gap-6 md:mt-8 md:grid-cols-[1fr_auto] md:items-end md:gap-8">
            <p className="max-w-xl text-balance text-sm leading-relaxed text-foreground/70 md:text-base">
              {t("hero_desc", "An editorial studio for brands that refuse the ordinary. We craft cinematic visuals, identity systems and AI-native films — all in black and gold.")}
            </p>
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

function UnderConstruction() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      const chars = root.current?.querySelectorAll<HTMLSpanElement>("[data-uc-char]");
      if (chars && chars.length) {
        gsap.from(chars, {
          yPercent: 120,
          opacity: 0,
          rotateX: -60,
          duration: 1.2,
          ease: "expo.out",
          stagger: 0.03,
          delay: 0.3,
        });
      }
      gsap.from(root.current?.querySelectorAll("[data-uc-line]") ?? [], {
        opacity: 0,
        y: 20,
        duration: 1,
        ease: "power3.out",
        stagger: 0.15,
        delay: 0.6,
      });
      gsap.to(root.current?.querySelector("[data-uc-shimmer]") ?? {}, {
        backgroundPositionX: "200%",
        duration: 6,
        ease: "none",
        repeat: -1,
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const title = "WEBSITE UNDER CONSTRUCTION";
  return (
    <div ref={root} className="mt-2 select-none">
      <div data-uc-line className="mb-4 flex items-center gap-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/90">
          in progress — building something extraordinary
        </span>
      </div>

      <h2
        aria-label={title}
        className="font-serif text-[clamp(1.55rem,7.5vw,5.5rem)] font-semibold leading-[1] tracking-tight text-foreground break-words"
      >
        <span className="block overflow-hidden">
          {"WEBSITE".split("").map((c, i) => (
            <span key={`w-${i}`} data-uc-char className="inline-block">
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
        </span>
        <span
          data-uc-shimmer
          className="mt-1 block overflow-hidden bg-gradient-to-r from-gold via-foreground to-gold bg-[length:200%_100%] bg-clip-text italic text-transparent"
          style={{ WebkitTextFillColor: "transparent" }}
        >
          {"UNDER CONSTRUCTION".split("").map((c, i) => (
            <span key={`u-${i}`} data-uc-char className="inline-block">
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
        </span>
      </h2>

      <p
        data-uc-line
        className="mt-4 max-w-xl text-sm italic text-foreground/60 md:text-base"
      >
        Crafting pixel by pixel — a cinematic experience is loading.
        <span className="ml-2 font-mono not-italic text-gold/80">Stay tuned.</span>
      </p>
    </div>
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

function Marquee() {
  const words = [
    "Banner Design",
    "Pamphlet",
    "Logo & Branding",
    "Photo Retouching",
    "Color Correction",
    "AI Video",
    "Social Ads",
  ];
  const list = [...words, ...words, ...words];
  return (
    <section aria-hidden className="border-y border-border/60 bg-ink/80 backdrop-blur-md py-6 overflow-hidden">
      <div className="marquee flex gap-12 whitespace-nowrap">
        {list.map((w, i) => (
          <span
            key={i}
            className="flex items-center gap-12 font-display text-3xl italic text-gold/80 md:text-5xl"
          >
            {w}
            <span className="text-gold">✦</span>
          </span>
        ))}
      </div>
    </section>
  );
}

function Services() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-service]", {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "expo.out",
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="services" ref={root} className="relative bg-background/80 backdrop-blur-md px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel num="01" label="Services" />
        <h2 className="mt-6 max-w-3xl font-display text-5xl leading-[1] tracking-tight md:text-7xl">
          A studio where <em className="gold-text">editorial taste</em> meets
          AI craft.
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-border/60 bg-border/60 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <article
              key={s.n}
              data-service
              className="hover-glow group relative bg-background p-8 md:p-10"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] text-gold/70">{s.n}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/40 transition group-hover:text-gold">
                  →
                </span>
              </div>
              <h3 className="mt-12 font-display text-3xl tracking-tight md:text-4xl">
                {s.title}
              </h3>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground/60">
                {s.desc}
              </p>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-gold to-transparent transition-transform duration-700 group-hover:scale-x-100" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Portfolio() {
  const [filter, setFilter] = useState<Category>("All");
  const root = useRef<HTMLDivElement>(null);
  const listPortfolioFn = useServerFn(listPortfolio);
  const { data: cmsItems = [] } = useQuery({
    queryKey: ["public-portfolio"],
    queryFn: () => listPortfolioFn(),
    staleTime: 60_000,
  });

  const CMS_TO_CAT: Record<string, Exclude<Category, "All">> = {
    "Banner Design": "Banner",
    "Pamphlet Design": "Pamphlet",
    "Logo Design": "Logo",
    "Branding Projects": "Logo",
    "High-End Retouch": "Retouching",
    "Color Correction": "Retouching",
    "AI Generated Videos": "AI Video",
    "AI Generated Images": "AI Video",
    "Social Media Designs": "Social Media Ads",
  };

  const cmsMapped = cmsItems.map((i: PortfolioItem) => ({
    title: i.title || i.category,
    cat: (CMS_TO_CAT[i.category] ?? "Banner") as Exclude<Category, "All">,
    img: i.thumbnail_url ?? i.media_url,
    isVideo: i.media_type === "video",
    src: i.media_url,
  }));

  const allItems = [
    ...cmsMapped,
    ...portfolio.map((p) => ({ ...p, isVideo: false, src: p.img })),
  ];
  const items = allItems.filter((p) => filter === "All" || p.cat === filter);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-work]", {
        y: 80,
        opacity: 0,
        duration: 1,
        ease: "expo.out",
        stagger: 0.07,
      });
    }, root);
    return () => ctx.revert();
  }, [filter, cmsItems.length]);

  return (
    <section id="work" className="relative bg-ink/80 backdrop-blur-md px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel num="02" label="Selected Work" />
            <h2 className="mt-6 max-w-2xl font-display text-5xl leading-[1] tracking-tight md:text-7xl">
              A vault of <em className="gold-text">quiet</em> obsession.
            </h2>
          </div>
        </div>

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

        <div
          ref={root}
          className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((p, i) => (
            <figure
              key={`${p.title}-${i}`}
              data-work
              className="hover-glow group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-sm bg-background"
            >
              {p.isVideo ? (
                <video
                  src={p.src}
                  muted
                  loop
                  playsInline
                  autoPlay
                  className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                />
              ) : (
                <img
                  src={p.img}
                  alt={p.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-90 transition-opacity duration-500" />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                    {p.cat}
                  </p>
                  <h3 className="mt-2 font-display text-2xl tracking-tight text-white">
                    {p.title}
                  </h3>
                </div>
                <span className="font-mono text-xs text-gold opacity-0 transition group-hover:opacity-100">
                  view ↗
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const wrap = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);

  const update = (clientX: number) => {
    if (!wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointer.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    update(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return;
    e.preventDefault();
    update(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
    if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
  };

  return (
    <section className="relative bg-background/80 backdrop-blur-md px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel num="03" label="Before / After" />
        <div className="mt-6 grid gap-10 md:grid-cols-[1fr_1fr] md:items-end">
          <h2 className="font-display text-5xl leading-[1] tracking-tight md:text-7xl">
            Retouching, <em className="gold-text">undone</em>.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-foreground/60">
            Drag the slider — or tap anywhere on the image — to compare an
            untouched capture with a Black Pixal high-end retouch. Skin texture
            is preserved, never plasticised.
          </p>
        </div>

        <div
          ref={wrap}
          role="slider"
          tabIndex={0}
          aria-label="Before and after comparison"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="ring-gold relative mt-12 aspect-[4/5] max-h-[80vh] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-gold md:aspect-[16/9]"
          style={{ WebkitUserSelect: "none" }}
        >
          <img
            src={workRetouchAfter}
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
              src={workRetouchBefore}
              alt="Before retouching"
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          {/* Labels */}
          <span className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/40 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white backdrop-blur">
            Before
          </span>
          <span className="pointer-events-none absolute right-4 top-4 rounded-full border border-gold/60 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-gold backdrop-blur">
            After
          </span>

          {/* Divider */}
          <div
            className="pointer-events-none absolute inset-y-0 will-change-transform"
            style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
          >
            <div className="h-full w-px bg-gold shadow-[0_0_20px_var(--glow-color)]" />
            <div className="absolute top-1/2 left-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold bg-black/70 backdrop-blur transition-transform duration-200 group-active:scale-95">
              <span className="font-mono text-xs text-gold">⇆</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AiVideoShowcase() {
  const [active, setActive] = useState<number | null>(null);
  const films = [
    { title: "Midnight Drive", duration: "00:48", img: workAiVideo },
    { title: "Lobby Hour", duration: "01:12", img: workColor },
    { title: "Onyx Ritual", duration: "00:32", img: workSocial },
  ];
  return (
    <section id="films" className="relative bg-ink/80 backdrop-blur-md px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel num="04" label="AI Films" />
        <h2 className="mt-6 max-w-3xl font-display text-5xl leading-[1] tracking-tight md:text-7xl">
          Director-led <em className="gold-text">AI films</em>.
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {films.map((f, i) => (
            <button
              key={f.title}
              onClick={() => setActive(i)}
              className="hover-glow group relative aspect-[3/4] overflow-hidden rounded-sm text-left"
            >
              <img
                src={f.img}
                alt={f.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 transition group-hover:bg-black/20" />
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid h-20 w-20 place-items-center rounded-full border border-gold/70 bg-black/40 backdrop-blur transition group-hover:scale-110">
                  <span className="ml-1 block h-0 w-0 border-y-8 border-l-[12px] border-y-transparent border-l-gold" />
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                <h3 className="font-display text-2xl tracking-tight text-white">
                  {f.title}
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                  {f.duration}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {active !== null && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-6 backdrop-blur-md animate-[fadeIn_0.3s_ease]"
          onClick={() => setActive(null)}
        >
          <div
            className="ring-gold relative w-full max-w-5xl overflow-hidden rounded-sm bg-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video w-full">
              <img
                src={films[active].img}
                alt={films[active].title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
                  Preview
                </p>
                <h3 className="mt-1 font-display text-2xl text-white">
                  {films[active].title}
                </h3>
              </div>
              <button
                onClick={() => setActive(null)}
                className="rounded-full border border-gold/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-gold hover:bg-gold hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
          <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
        </div>
      )}
    </section>
  );
}

function Testimonials() {
  const row = [...testimonials, ...testimonials];
  return (
    <section className="relative bg-background/80 backdrop-blur-md px-0 py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12">
        <SectionLabel num="05" label="Testimonials" />
        <h2 className="mt-6 max-w-3xl font-display text-5xl leading-[1] tracking-tight md:text-7xl">
          What our <em className="gold-text">clients</em> say.
        </h2>
      </div>

      <div className="mt-16 overflow-hidden">
        <div className="marquee flex gap-6 px-6">
          {row.map((t, i) => (
            <article
              key={i}
              className="w-[340px] shrink-0 rounded-sm border border-border/60 bg-white/[0.03] p-8 backdrop-blur-md md:w-[420px]"
            >
              <span className="font-display text-5xl leading-none text-gold">"</span>
              <p className="mt-2 font-display text-xl italic leading-snug text-foreground/90">
                {t.quote}
              </p>
              <div className="mt-6 border-t border-border/60 pt-4">
                <p className="text-sm text-foreground">{t.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/50">
                  {t.role}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="relative bg-ink/80 backdrop-blur-md px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <SectionLabel num="06" label="Contact" />
        <h2 className="mt-6 max-w-4xl font-display text-6xl leading-[0.95] tracking-tight md:text-[9vw]">
          Let's make something
          <br />
          <em className="gold-text gold-glow">unforgettable.</em>
        </h2>

        <div className="mt-16 grid gap-12 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-6 sm:grid-cols-3">
            <ContactCard
              label="WhatsApp"
              value="+91 98406 60671"
              href="https://wa.me/919840660671"
            />
            <ContactCard
              label="Instagram"
              value="@blackpixalstudio"
              href="https://instagram.com/blackpixalstudio"
            />
            <ContactCard
              label="Email"
              value="blackpixalstudio@gmail.com"
              href="mailto:blackpixalstudio@gmail.com"
            />
          </div>

          <a
            href="mailto:blackpixalstudio@gmail.com?subject=Project%20Quote"
            className="group relative inline-flex items-center justify-center gap-3 self-start overflow-hidden rounded-full bg-gold px-10 py-5 font-mono text-[11px] uppercase tracking-[0.3em] text-ink transition hover:scale-[1.02]"
          >
            <span className="relative z-10">Get Quote</span>
            <span className="relative z-10">→</span>
            <span className="absolute inset-0 bg-gradient-to-r from-gold-soft via-gold to-gold-deep opacity-0 transition group-hover:opacity-100" />
          </a>
        </div>
      </div>
    </section>
  );
}

function ContactCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="hover-glow group block rounded-sm border border-border/60 bg-background p-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold/70">
        {label}
      </p>
      <p className="mt-3 break-words font-display text-2xl text-foreground transition group-hover:text-gold">
        {value}
      </p>
    </a>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-10 md:px-12">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 text-[11px] uppercase tracking-[0.3em] text-foreground/50 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Black Pixal — All rights reserved</p>
        <p className="font-mono">Crafted in black & gold</p>
      </div>
    </footer>
  );
}

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.4em] text-gold/80">
      <span>{num}</span>
      <span className="h-px w-12 bg-gold/50" />
      <span>{label}</span>
    </div>
  );
}
