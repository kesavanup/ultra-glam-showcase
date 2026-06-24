## Goal

Replace the current hero `<video>` with a real-time **Three.js / WebGL** scene inspired by activetheory.net: a dark void with a floating metallic logo, ambient drifting particles, soft light streaks, and depth — the kind of motion you can't fake with an MP4. Logo and copy stay BLACK PIXAL as currently designed.

## Visual reference (activetheory.net)

- Near-black background with subtle blue/violet vignette
- Centered metallic 3D mark, slowly rotating + bobbing
- Two layers of particles drifting at different depths (parallax)
- Soft bloom + faint chromatic aberration glow
- Cursor parallax (camera tilts slightly toward pointer)
- Scroll-driven zoom-out / fade as you leave hero

## Logo treatment

Use the user-uploaded mark (`Screenshot_2026-06-24_at_7.50.27_PM.png`):

- Invert colors so the **frame becomes white**, the inner square + checker pattern become **white on transparent** (black areas of source → white; white areas → transparent). This gives a clean monochrome silhouette that reads on the dark scene and matches the activetheory monochrome-metallic vibe.
- Save the inverted PNG as `src/assets/logo-mark.png` via `imagegen--edit_image` (transparent background).
- Use it as a transparent texture on a `PlaneGeometry`, then add a subtle **gold rim light** so it still ties to the existing BLACK PIXAL palette (one accent, not the activetheory cyan).

## Tech approach

- Add deps: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`.
- New component `src/components/HeroScene.tsx` (client-only) — a `<Canvas>` with:
  - `<color attach="background">` deep ink (#05060A)
  - Logo plane with `MeshStandardMaterial` (transparent map + emissive gold) gently rotating on Y, bobbing on a sine
  - Two `<Points>` particle systems (≈800 + 200) drifting upward at different speeds for parallax
  - 1–2 thin glowing rings around the logo (à la activetheory orbit)
  - `<EffectComposer>` with `Bloom` (intensity ~0.8) + `Vignette` + faint `ChromaticAberration`
  - Cursor-driven `useFrame` lerp on camera position (±0.3 units)
- Lazy-load HeroScene with `React.lazy` + `Suspense` so it never runs during SSR (avoids `window`/WebGL crash). Fallback = current `hero.jpg` poster, so first paint stays instant.
- Scroll behavior via existing GSAP ScrollTrigger: fade the canvas opacity 1 → 0 and scale 1 → 1.1 over the hero's height (keeps the parallax title overlay already in place).
- Remove the `<video>` tag and `heroVideo` import. Keep `hero.jpg` strictly as Suspense fallback / `<noscript>` poster.

## Files touched

- `src/assets/logo-mark.png` — new (inverted, transparent)
- `src/components/HeroScene.tsx` — new (R3F scene + effects)
- `src/routes/index.tsx` — swap `<video>` block for `<Suspense><HeroScene/></Suspense>` and drop hero video import
- `package.json` / `bun.lock` — add three + r3f + drei + postprocessing

## Out of scope (call out honestly)

This will be a **high-quality approximation**, not a 1:1 clone. activetheory.net ships custom GLSL shaders, baked HDR cubemaps, mesh-line trails, fluid sims, and DOF — months of bespoke shader work. The plan above captures the *feel* (metallic mark, particles, bloom, parallax, cursor reactivity, scroll fade) within what's reasonable to build in one pass. If you want to go further afterwards (custom shaders, fluid trails, audio-reactive), we can layer that on.

## Acceptance

- Hero shows a live WebGL canvas, not an MP4
- Inverted white logo floats centered with slow rotation + bob
- Particles drift, bloom glows, cursor tilts camera
- Page scroll fades canvas out smoothly
- Mobile: scene still renders (lower DPR + fewer particles); falls back to poster image if WebGL unavailable