import { useEffect, useRef } from "react";
import { useActiveTheme, type ThemeId } from "./ThemeSwitcher";

type Palette = {
  bg: string;
  particles: string[];
  trail: boolean;
  count: number;
  blend: GlobalCompositeOperation;
};

const PALETTES: Record<ThemeId, Palette> = {
  chrome: { bg: "transparent", particles: ["#cfe0ff", "#8a9bb4", "#ffffff"], trail: false, count: 60, blend: "screen" },
  mono: { bg: "transparent", particles: ["#000000", "#666666"], trail: false, count: 0, blend: "source-over" },
  glass: { bg: "transparent", particles: ["#ffffff", "#a0a0a0"], trail: false, count: 30, blend: "screen" },
  "noir-gold": { bg: "transparent", particles: ["#d4af37", "#fff1c1", "#c9a84c"], trail: true, count: 90, blend: "screen" },
  "ivory-gold": { bg: "transparent", particles: ["#c9a84c", "#8b6914"], trail: false, count: 50, blend: "multiply" },
  prism: { bg: "transparent", particles: ["#ff6b6b", "#f7931e", "#67e8f9", "#a78bfa", "#34d399"], trail: false, count: 120, blend: "screen" },
  neon: { bg: "transparent", particles: ["#00f0ff", "#ff00d4", "#b400ff", "#7df9ff"], trail: true, count: 110, blend: "screen" },
};

type P = { x: number; y: number; vx: number; vy: number; r: number; c: string; life: number };

export default function ThemeFX() {
  const theme = useActiveTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.innerWidth < 768;
    // Skip the canvas overlay entirely on mobile — the 3D hero already taxes the GPU.
    if (mobile) return;
    const pal = PALETTES[theme] ?? PALETTES.chrome;
    const target = reduce ? 0 : pal.count;

    let w = (canvas.width = window.innerWidth * devicePixelRatio);
    let h = (canvas.height = window.innerHeight * devicePixelRatio);
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const onResize = () => {
      w = canvas.width = window.innerWidth * devicePixelRatio;
      h = canvas.height = window.innerHeight * devicePixelRatio;
    };
    window.addEventListener("resize", onResize);

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX * devicePixelRatio;
      mouseRef.current.y = e.clientY * devicePixelRatio;
    };
    const onLeave = () => (mouseRef.current = { x: -9999, y: -9999 });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    const particles: P[] = [];
    const pick = () => pal.particles[Math.floor(Math.random() * pal.particles.length)];
    const spawn = (x?: number, y?: number): P => ({
      x: x ?? Math.random() * w,
      y: y ?? Math.random() * h,
      vx: (Math.random() - 0.5) * 0.6 * devicePixelRatio,
      vy: (Math.random() - 0.5) * 0.6 * devicePixelRatio - 0.2,
      r: (Math.random() * 1.6 + 0.4) * devicePixelRatio,
      c: pick(),
      life: Math.random() * 200 + 100,
    });
    for (let i = 0; i < target; i++) particles.push(spawn());

    let raf = 0;
    const loop = () => {
      if (pal.trail) {
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = pal.blend;

      for (const p of particles) {
        // mouse attraction/repulsion
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const d2 = dx * dx + dy * dy;
        const R = 140 * devicePixelRatio;
        if (d2 < R * R) {
          const f = (1 - Math.sqrt(d2) / R) * 0.6;
          p.vx += (dx / (Math.sqrt(d2) + 0.01)) * f;
          p.vy += (dy / (Math.sqrt(d2) + 0.01)) * f;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life--;

        if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
          Object.assign(p, spawn());
        }

        ctx.beginPath();
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur = (theme === "neon" ? 14 : theme === "noir-gold" ? 8 : 5) * devicePixelRatio;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(loop);
    };
    if (target > 0) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [theme]);

  if (theme === "mono") return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] opacity-70"
    />
  );
}
