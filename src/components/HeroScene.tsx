import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TextureLoader } from "three";

import logoMark from "@/assets/logo-mark.png";

// Shared scroll progress (0 → 1) updated outside R3F so we can read it in useFrame.
const scrollState = { progress: 0 };

function useScrollProgress() {
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      scrollState.progress = max > 0 ? Math.min(1, Math.max(0, h.scrollTop / max)) : 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

function Logo() {
  const tex = useLoader(TextureLoader, logoMark);
  tex.anisotropy = 8;
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = scrollState.progress;
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.5) * 0.08;
      // Scroll multiplies rotation — full spin(s) as user scrolls down.
      group.current.rotation.y = Math.sin(t * 0.35) * 0.35 + p * Math.PI * 4;
      group.current.rotation.x = Math.sin(t * 0.25) * 0.08 + p * 0.6;
      // Logo plane fades as pixels burst out.
      const targetOpacity = 1 - p * 0.85;
      if (inner.current) {
        const mat = inner.current.material as THREE.MeshStandardMaterial;
        mat.opacity = targetOpacity;
        mat.emissiveIntensity = 0.35 + Math.sin(t * 1.2) * 0.15;
      }
    }
  });

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.25, 0.005, 16, 200]} />
        <meshBasicMaterial color="#cfe0ff" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0.4, 0]}>
        <torusGeometry args={[1.5, 0.0035, 16, 200]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>

      <mesh ref={inner}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshStandardMaterial
          map={tex}
          transparent
          alphaTest={0.02}
          metalness={0.9}
          roughness={0.25}
          emissive={new THREE.Color("#cfe0ff")}
          emissiveMap={tex}
          emissiveIntensity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      <PixelBurst />
    </group>
  );
}

// Grid of "pixels" sitting on the logo plane that explode outward as the user scrolls.
function PixelBurst() {
  const ref = useRef<THREE.Points>(null);
  const GRID = 14; // 14x14 pixels
  const count = GRID * GRID;

  const { basePositions, directions } = useMemo(() => {
    const base = new Float32Array(count * 3);
    const dirs = new Float32Array(count * 3);
    const size = 1.4;
    let i = 0;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const px = (x / (GRID - 1) - 0.5) * size;
        const py = (y / (GRID - 1) - 0.5) * size;
        base[i * 3 + 0] = px;
        base[i * 3 + 1] = py;
        base[i * 3 + 2] = 0;
        // Outward direction with a forward Z kick + jitter
        const len = Math.hypot(px, py) || 0.001;
        dirs[i * 3 + 0] = (px / len) * (1 + Math.random() * 0.8);
        dirs[i * 3 + 1] = (py / len) * (1 + Math.random() * 0.8);
        dirs[i * 3 + 2] = (Math.random() - 0.3) * 1.5;
        i++;
      }
    }
    return { basePositions: base, directions: dirs };
  }, [count]);

  const positions = useMemo(() => new Float32Array(basePositions), [basePositions]);

  useFrame(() => {
    if (!ref.current) return;
    const p = scrollState.progress;
    const burst = Math.pow(p, 1.4) * 4.5; // distance multiplier
    const arr = (ref.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = basePositions[i * 3 + 0] + directions[i * 3 + 0] * burst;
      arr[i * 3 + 1] = basePositions[i * 3 + 1] + directions[i * 3 + 1] * burst;
      arr[i * 3 + 2] = basePositions[i * 3 + 2] + directions[i * 3 + 2] * burst;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    const mat = ref.current.material as THREE.PointsMaterial;
    // Start invisible (logo is whole), fade in as pixels separate.
    mat.opacity = Math.min(1, p * 2.2);
    mat.size = 0.05 + p * 0.06;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#cfe0ff"
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Particles({
  count,
  spread,
  size,
  speed,
  color,
}: {
  count: number;
  spread: number;
  size: number;
  speed: number;
  color: string;
}) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * spread;
      arr[i * 3 + 1] = (Math.random() - 0.5) * spread;
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.6;
    }
    return arr;
  }, [count, spread]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const pos = (ref.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += delta * speed;
      if (pos[i * 3 + 1] > spread / 2) pos[i * 3 + 1] = -spread / 2;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CameraRig() {
  const target = useRef({ x: 0, y: 0 });
  useFrame((state) => {
    const onMove = (state.pointer.x ?? 0) * 0.4;
    const onMoveY = (state.pointer.y ?? 0) * 0.25;
    target.current.x += (onMove - target.current.x) * 0.04;
    target.current.y += (onMoveY - target.current.y) * 0.04;
    state.camera.position.x = target.current.x;
    state.camera.position.y = target.current.y;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function ScrollTracker() {
  useScrollProgress();
  return null;
}

export default function HeroScene() {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <Canvas
      dpr={isMobile ? [1, 1.25] : [1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: !isMobile, alpha: true, powerPreference: "high-performance" }}
      frameloop={reduce ? "demand" : "always"}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <ScrollTracker />
      <color attach="background" args={["#0a0a0f"]} />
      <fog attach="fog" args={["#0a0a0f", 6, 14]} />

      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#cfe0ff" />
      {!isMobile && <pointLight position={[-4, -2, 3]} intensity={0.6} color="#5d7ea8" />}

      <Logo />

      <Particles
        count={isMobile ? 220 : 700}
        spread={14}
        size={0.025}
        speed={0.25}
        color="#cfe0ff"
      />
      {!isMobile && (
        <>
          <Particles count={300} spread={20} size={0.05} speed={0.12} color="#8a9bb4" />
          <Particles count={100} spread={8} size={0.08} speed={0.45} color="#ffffff" />
        </>
      )}

      {!isMobile && <CameraRig />}

      {!isMobile && (
        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.2} luminanceSmoothing={0.4} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.85} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
