import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  pages: string[];
  cover?: string | null;
  coverColor?: string;
  pageThickness?: number;
  spineWidth?: number;
  shadowIntensity?: number;
};

const PAGE_W = 2.2;
const PAGE_H = 3;

function Page({
  url,
  index,
  turned,
  thickness,
}: {
  url: string;
  index: number;
  turned: boolean;
  thickness: number;
}) {
  const texture = useLoader(THREE.TextureLoader, url);
  const group = useRef<THREE.Group>(null);
  const target = turned ? -Math.PI * 0.98 : 0;

  useFrame((_, delta) => {
    if (!group.current) return;
    // Natural easing towards the target angle.
    group.current.rotation.y += (target - group.current.rotation.y) * Math.min(1, delta * 4);
  });

  // Curved page: a segmented plane bent slightly for realistic sheen.
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 24, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const t = (x + PAGE_W / 2) / PAGE_W;
      pos.setZ(i, Math.sin(t * Math.PI) * 0.06);
    }
    g.computeVertexNormals();
    g.translate(PAGE_W / 2, 0, 0);
    return g;
  }, []);

  return (
    <group ref={group} position={[0, 0, index * thickness]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial map={texture} roughness={0.65} metalness={0.03} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Spine({ width, color }: { width: number; color: string }) {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[width, PAGE_H + 0.12, 0.32]} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.25} />
    </mesh>
  );
}

export function AlbumViewer3D({
  pages,
  cover,
  coverColor = "#141414",
  pageThickness = 0.012,
  spineWidth = 0.16,
  shadowIntensity = 0.8,
}: Props) {
  const all = useMemo(() => [cover, ...pages].filter(Boolean) as string[], [cover, pages]);
  const [turned, setTurned] = useState(0);

  return (
    <div className="relative h-[60vh] min-h-[320px] w-full overflow-hidden rounded-xl bg-black/60">
      <Canvas shadows dpr={[1, 1.8]} camera={{ position: [0, 0.2, 6], fov: 42 }}>
        <color attach="background" args={["#0a0a0a"]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[3, 4, 5]}
          intensity={1.4 * shadowIntensity + 0.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <Suspense fallback={null}>
          <group rotation={[0.12, -0.35, 0]}>
            <Spine width={spineWidth} color={coverColor} />
            {all.map((url, i) => (
              <Page key={url + i} url={url} index={i} turned={i < turned} thickness={pageThickness} />
            ))}
          </group>
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={3.5} maxDistance={9} maxPolarAngle={Math.PI / 1.7} />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 p-4">
        <button
          onClick={() => setTurned((t) => Math.max(0, t - 1))}
          className="pointer-events-auto rounded-full border border-border bg-background/80 px-4 py-2 text-xs uppercase tracking-[0.2em] backdrop-blur"
        >
          ← Prev
        </button>
        <span className="pointer-events-none rounded-full bg-background/70 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {Math.min(turned + 1, all.length)} / {all.length}
        </span>
        <button
          onClick={() => setTurned((t) => Math.min(all.length, t + 1))}
          className="pointer-events-auto rounded-full border border-border bg-background/80 px-4 py-2 text-xs uppercase tracking-[0.2em] backdrop-blur"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default AlbumViewer3D;
