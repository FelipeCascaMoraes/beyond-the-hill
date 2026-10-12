"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { atmosphere, cameraIntro, renderConfig } from "@/game/config/render";
import type { ModelId } from "@/assets/manifest";
import { useGameStore } from "@/game/state/gameStore";
import { AdaptiveResolution, initialResolution } from "./AdaptiveResolution";
import { SceneReady } from "./SceneReady";
import { PreloadCharacterModel } from "./actors/CharacterModel";
import { figureModels } from "./actors/NpcFigure";
import { AvailableModelsContext, ModelBoundary } from "./actors/modelAvailability";
import { CameraRig } from "./camera/CameraRig";
import { CinematicDirector } from "./cinematic/CinematicDirector";
import { InteractionSystem } from "./interaction/InteractionSystem";
import { MemoryCamera } from "./memory/MemoryCamera";
import { AreaTriggers } from "./story/AreaTriggers";
import { AyshaBody } from "./player/AyshaBody";
import { PlayerController } from "./player/PlayerController";
import { World } from "./world/World";
import { ZoneRenderer } from "./zones/ZoneRenderer";
import { installHeightFog } from "./shaders/heightFog";

// Antes de qualquer material compilar.
installHeightFog();

interface ExperienceProps {
  /** Modelos 3D que existem em /public: só esses são pedidos ao servidor. */
  availableModels: readonly ModelId[];
}

/** Raiz 3D. Só roda no cliente (carregada com ssr: false). */
export default function Experience({ availableModels }: ExperienceProps) {
  const phase = useGameStore((state) => state.phase);
  // A resolução mora aqui porque é o Canvas que a aplica; quem decide é
  // <AdaptiveResolution>, medindo o FPS de dentro da cena.
  const [dpr, setDpr] = useState(initialResolution);

  return (
    <Canvas
      // Na tela inicial a cena fica coberta: renderiza sob demanda (só o necessário
      // para compilar shaders). O loop contínuo começa com o jogo.
      frameloop={phase === "title" ? "demand" : "always"}
      dpr={dpr}
      camera={{ ...renderConfig.camera, position: cameraIntro.from.position }}
      // Sem canal alfa: o céu cobre a tela inteira, e um canvas opaco poupa ao
      // navegador a mistura dele com a página a cada quadro.
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[atmosphere.horizonColor]} />
      <AdaptiveResolution onChange={setDpr} />
      <CameraRig />
      <PlayerController />
      {/* Depois do jogador: escrevem por cima da câmera já atualizada no mesmo
          frame — a cena primeiro, o desvio da lembrança por cima dela. */}
      <CinematicDirector />
      <MemoryCamera />
      <InteractionSystem />
      <AreaTriggers />
      <AvailableModelsContext value={availableModels}>
        {/* Depois do jogador: desenha a Aysha onde ele acabou de pô-la. */}
        <AyshaBody />
        <Suspense fallback={null}>
          <World />
          <ZoneRenderer />
          {/* Os modelos de quem aparece no mundo chegam junto com ele: a tela
              de carregamento espera por eles, e ninguém surge pela metade. */}
          {figureModels(availableModels).map((model) => (
            <ModelBoundary key={model} model={model} fallback={null}>
              <PreloadCharacterModel model={model} />
            </ModelBoundary>
          ))}
          <SceneReady />
        </Suspense>
      </AvailableModelsContext>
    </Canvas>
  );
}
