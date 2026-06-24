import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { TextureLoader } from "three";

import logoMark from "@/assets/logo-mark.png";

function Logo() {
  const tex = useLoader(TextureLoader, logoMark);
  tex.anisotropy = 8;
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.5) * 0.08;
      group.current.rotation.y = Math.sin(t * 0.35) * 0.35;
      group.current.rotation.x = Math.sin(t * 0.25) * 0.08;
    }
    if (inner.current) {
      // breathing emissive shimmer
      const mat = inner.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.35 + Math.sin(t * 1.2) * 0.15;
    }
  });

  return (
    <group ref={group}>
      {/* glowing rings, ActiveTheory-style orbit */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.85, 0.006, 16, 200]} />
        <meshBasicMaterial color="#f4d28a" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0.4, 0]}>
        <torusGeometry args={[2.15, 0.004, 16, 200]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>

      {/* logo plane */}
      <mesh ref={inner}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshStandardMaterial
          map={tex}
          transparent
          alphaTest={0.05}
          metalness={0.9}
          roughness={0.25}
          emissive={new THREE.Color("#f4d28a")}
          emissiveMap={tex}
          emissiveIntensity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
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

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={["#05060A"]} />
      <fog attach="fog" args={["#05060A", 6, 14]} />

      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#f4d28a" />
      <pointLight position={[-4, -2, 3]} intensity={0.6} color="#8aa9ff" />

      <Logo />

      <Particles count={900} spread={14} size={0.025} speed={0.25} color="#f4d28a" />
      <Particles count={350} spread={20} size={0.05} speed={0.12} color="#9bb6ff" />
      <Particles count={120} spread={8} size={0.08} speed={0.45} color="#ffffff" />

      <CameraRig />

      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur />
        <ChromaticAberration
          offset={new THREE.Vector2(0.0008, 0.0008)}
          blendFunction={BlendFunction.NORMAL}
          radialModulation={false}
          modulationOffset={0}
        />
        <Vignette eskil={false} offset={0.2} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
