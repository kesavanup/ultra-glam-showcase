import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import type { PortfolioItem } from "@/lib/cms";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

const AlbumViewer3D = lazy(() => import("./AlbumViewer3D"));

export const HOVER_EFFECTS = [
  "zoom",
  "slide",
  "fade",
  "overlay",
  "text-reveal",
  "image-reveal",
  "parallax",
  "none",
] as const;

const hoverClass: Record<string, string> = {
  zoom: "transition-transform duration-700 group-hover:scale-110",
  slide: "transition-transform duration-700 group-hover:translate-y-[-3%]",
  fade: "transition-opacity duration-500 group-hover:opacity-70",
  overlay: "transition-all duration-500 group-hover:brightness-75",
  "text-reveal": "transition-transform duration-700 group-hover:scale-105",
  "image-reveal": "transition-[filter] duration-700 grayscale group-hover:grayscale-0",
  parallax: "transition-transform duration-1000 group-hover:scale-105 group-hover:-translate-y-2",
  none: "",
};

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

/** Compact preview used inside grids/cards. */
export function PortfolioPreview({ item }: { item: PortfolioItem }) {
  const effect = hoverClass[item.hover_effect] ?? hoverClass.zoom;
  const cfg = item.config ?? {};

  if (item.display_type === "before_after" && cfg.before && cfg.after) {
    return (
      <BeforeAfterSlider
        before={cfg.before}
        after={cfg.after}
        start={Number(cfg.start ?? 50)}
        alt={item.title}
        className="h-full w-full"
      />
    );
  }

  if (item.display_type === "youtube" && cfg.url) {
    const id = youtubeId(String(cfg.url));
    const poster = item.thumbnail_url || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "");
    return (
      <div className="relative h-full w-full">
        {poster ? (
          <img src={poster} alt={item.title} className={`h-full w-full object-cover ${effect}`} loading="lazy" />
        ) : (
          <div className="h-full w-full bg-black/60" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/70 bg-background/70 text-primary backdrop-blur">
            ▶
          </span>
        </span>
      </div>
    );
  }

  if (item.display_type === "video" || item.media_type === "video") {
    return (
      <video
        src={item.media_url}
        poster={item.thumbnail_url ?? undefined}
        className={`h-full w-full object-cover ${effect}`}
        muted
        playsInline
        preload="none"
      />
    );
  }

  const src =
    item.thumbnail_url ||
    (item.display_type === "gallery" || item.display_type === "mockup"
      ? cfg.images?.[0]
      : item.display_type === "album"
        ? cfg.cover || cfg.pages?.[0]
        : item.media_url) ||
    item.media_url;

  return <img src={src} alt={item.title} className={`h-full w-full object-cover ${effect}`} loading="lazy" />;
}

/** Full experience used in detail/lightbox views. */
export function PortfolioRenderer({ item }: { item: PortfolioItem }) {
  const cfg = item.config ?? {};
  const [galleryIndex, setGalleryIndex] = useState(0);

  switch (item.display_type) {
    case "before_after":
      return cfg.before && cfg.after ? (
        <BeforeAfterSlider
          before={cfg.before}
          after={cfg.after}
          start={Number(cfg.start ?? 50)}
          alt={item.title}
          className="aspect-[4/3] w-full"
        />
      ) : null;

    case "gallery":
    case "mockup": {
      const images: string[] = cfg.images ?? [];
      if (!images.length) return null;
      return (
        <div className="space-y-3">
          <img
            src={images[Math.min(galleryIndex, images.length - 1)]}
            alt={item.title}
            className="w-full rounded-xl object-contain"
          />
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => setGalleryIndex(i)}
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded border ${
                    i === galleryIndex ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "album":
      return (
        <ClientOnly fallback={<div className="h-[60vh] w-full animate-pulse rounded-xl bg-black/50" />}>
          <Suspense fallback={<div className="h-[60vh] w-full animate-pulse rounded-xl bg-black/50" />}>
            <AlbumViewer3D
              pages={cfg.pages ?? []}
              cover={cfg.cover ?? null}
              coverColor={cfg.coverColor ?? "#141414"}
              pageThickness={Number(cfg.pageThickness ?? 0.012)}
              spineWidth={Number(cfg.spineWidth ?? 0.16)}
              shadowIntensity={Number(cfg.shadowIntensity ?? 0.8)}
            />
          </Suspense>
        </ClientOnly>
      );

    case "youtube": {
      const id = cfg.url ? youtubeId(String(cfg.url)) : null;
      if (!id) return null;
      return (
        <div className="aspect-video w-full overflow-hidden rounded-xl">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title={item.title || "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="h-full w-full border-0"
          />
        </div>
      );
    }

    case "video":
      return (
        <video
          src={item.media_url}
          poster={item.thumbnail_url ?? undefined}
          controls
          playsInline
          preload="none"
          className="w-full rounded-xl"
        />
      );

    case "pdf":
      return (
        <div className="space-y-3">
          <iframe src={item.media_url} title={item.title || "Document"} className="h-[70vh] w-full rounded-xl border border-border" />
          <a
            href={item.media_url}
            download
            className="inline-block rounded-md border border-border px-4 py-2 text-xs uppercase tracking-[0.25em]"
          >
            Download PDF
          </a>
        </div>
      );

    case "html":
      return (
        <iframe
          title={item.title || "Interactive"}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={String(cfg.html ?? "")}
          className="h-[70vh] w-full rounded-xl border border-border bg-white"
        />
      );

    case "gif":
    case "image":
    default:
      return <img src={item.media_url} alt={item.title} className="w-full rounded-xl object-contain" />;
  }
}

export default PortfolioRenderer;
