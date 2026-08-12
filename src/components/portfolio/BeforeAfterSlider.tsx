import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  before: string;
  after: string;
  start?: number;
  alt?: string;
  className?: string;
};

export function BeforeAfterSlider({ before, after, start = 50, alt = "", className = "" }: Props) {
  const [pos, setPos] = useState(Math.min(100, Math.max(0, start)));
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      setFromClientX(e.clientX);
    };
    const up = () => (dragging.current = false);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [setFromClientX]);

  return (
    <div
      ref={ref}
      className={`relative select-none overflow-hidden rounded-xl bg-black/40 ${className}`}
      onPointerDown={(e) => {
        dragging.current = true;
        setFromClientX(e.clientX);
      }}
      style={{ touchAction: "pan-y" }}
    >
      <img src={after} alt={alt ? `${alt} — after` : "After"} className="block h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt={alt ? `${alt} — before` : "Before"}
          className="h-full w-full object-cover"
          style={{ width: ref.current?.clientWidth ? `${ref.current.clientWidth}px` : "100%", maxWidth: "none" }}
          loading="lazy"
        />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Before and after comparison"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
          if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
        }}
        className="absolute inset-y-0 z-10 -ml-px w-0.5 cursor-ew-resize bg-primary/90"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/70 bg-background/80 text-xs text-primary backdrop-blur">
          ⇔
        </span>
      </div>
    </div>
  );
}

export default BeforeAfterSlider;
