"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { atmosphere, cameraIntro, renderConfig } from "@/game/config/render";
import { getQualitySettings } from "@/game/config/quality";
import { useGameStore } from "@/game/state/gameStore";
import { CameraRig } from "./camera/CameraRig";
import { World } from "./world/World";
import { ZoneRenderer } from "./zones/ZoneRenderer";
import { Player } from "./actors/Player";

/** Raiz 3D. Só roda no cliente (carregada com ssr: false). */
export default function Experience() {
  const phase = useGameStore((state) => state.phase);
  const quality = getQualitySettings();

  return (
    <Canvas
      // Na tela inicial a cena fica coberta: renderiza sob demanda (só o necessário
      // para compilar shaders). O loop contínuo começa com o jogo.
      frameloop={phase === "title" ? "demand" : "always"}
      dpr={quality.dpr}
      camera={{ ...renderConfig.camera, position: cameraIntro.from.position }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[atmosphere.horizonColor]} />
      <CameraRig />
      <Suspense fallback={null}>
        <World />
        <ZoneRenderer />
        <Player />
      </Suspense>
    </Canvas>
  );
}
