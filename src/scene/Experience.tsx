"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { atmosphere, cameraIntro, renderConfig } from "@/game/config/render";
import { getQualitySettings } from "@/game/config/quality";
import { useGameStore } from "@/game/state/gameStore";
import { CameraRig } from "./camera/CameraRig";
import { InteractionSystem } from "./interaction/InteractionSystem";
import { MemoryCamera } from "./memory/MemoryCamera";
import { AreaTriggers } from "./story/AreaTriggers";
import { PlayerController } from "./player/PlayerController";
import { World } from "./world/World";
import { ZoneRenderer } from "./zones/ZoneRenderer";
import { installHeightFog } from "./shaders/heightFog";

// Antes de qualquer material compilar.
installHeightFog();

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
      <PlayerController />
      {/* Depois do jogador: somam-se à câmera já atualizada no mesmo frame. */}
      <MemoryCamera />
      <InteractionSystem />
      <AreaTriggers />
      <Suspense fallback={null}>
        <World />
        <ZoneRenderer />
      </Suspense>
    </Canvas>
  );
}
