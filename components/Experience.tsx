"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  useGLTF,
  useProgress,
} from "@react-three/drei";
import { ShaderChunk } from "three";
import { Hud } from "./Hud";

// three r181+ eliminó este chunk. El suelo proyectado de drei igual lo incluye,
// y el include que no resuelve tira en cada frame.
const chunks = ShaderChunk as Record<string, string>;
if (!chunks.cube_uv_reflection_fragment) {
  chunks.cube_uv_reflection_fragment = "";
}

const MODEL_URL = "/models/mesh.glb";
const DRACO_DECODER = "/draco/";

const SCENES = [
  { id: "sunrise", label: "Amanecer", file: "/hdri/aarfontein_sunrise_2k.hdr" },
  { id: "road", label: "Mediodía", file: "/hdri/aarfontein_dirt_road_2k.hdr" },
  { id: "dusk", label: "Atardecer", file: "/hdri/aarfontein_dusk_2k.hdr" },
  { id: "pan", label: "Salinas", file: "/hdri/aarfontein_pan_2k.hdr" },
] as const;

/**
 * El GLB viene con el largo del tren en el eje Y y el techo en z=0 (hacia +Z arriba).
 * El grupo interior lo para (Z arriba -> Y arriba) y el exterior alinea el largo con X.
 */
function Train() {
  const { scene } = useGLTF(MODEL_URL, DRACO_DECODER, true);
  const scale = 14;
  return (
    <group position={[0, 0.216 * scale, 0]} rotation={[0, Math.PI / 2, 0]} scale={scale}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL, DRACO_DECODER, true);

function Loader() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/70">
      <p className="text-sm tracking-[0.3em] text-amber-100/80 uppercase">
        Cargando tren · {Math.round(progress)}%
      </p>
    </div>
  );
}

export function Experience() {
  const [sceneId, setSceneId] = useState<(typeof SCENES)[number]["id"]>("sunrise");
  const current = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];

  return (
    <main className="relative h-full w-full">
      <Canvas
        className="absolute inset-0"
        camera={{ position: [11, 3.2, 15], fov: 38 }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Environment
            key={current.id}
            files={current.file}
            background
            ground={{ height: 5, radius: 90, scale: 90 }}
          />
          <Train />
          <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={30} blur={2.4} far={6} />
        </Suspense>
        <OrbitControls
          target={[0, 1.6, 0]}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.45}
          minDistance={9}
          maxDistance={32}
          maxPolarAngle={Math.PI / 2 - 0.03}
        />
      </Canvas>

      <Loader />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-5 sm:p-8">
        <header>
          <p className="text-[11px] tracking-[0.35em] text-amber-100/70 uppercase">
            Quebrada de Humahuaca · Jujuy
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-6xl">
            Tren Solar
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/70 sm:text-base">
            Turismo y economías regionales del NOA, medidos en tiempo real.
          </p>
        </header>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <nav className="pointer-events-auto flex flex-wrap gap-2">
            {SCENES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSceneId(s.id)}
                className={`rounded-full border px-4 py-1.5 text-xs backdrop-blur transition ${
                  s.id === sceneId
                    ? "border-amber-200/80 bg-amber-200/20 text-amber-50"
                    : "border-white/20 bg-black/30 text-white/70 hover:border-white/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <Hud />
        </div>
      </div>
    </main>
  );
}
