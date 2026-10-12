"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { assetManifest, modelIds, type ModelId } from "@/assets/manifest";
import { useGameStore } from "@/game/state/gameStore";
import { useStoryDirector } from "@/game/story/useStoryDirector";
import { GameUI } from "@/ui/GameUI";

// Three.js depende de WebGL/window: a cena nunca é pré-renderizada no servidor.
const Experience = dynamic(() => import("@/scene/Experience"), { ssr: false });

interface GameShellProps {
  /** Modelos do manifesto que existem em /public (ver assets/availableModels.ts). */
  availableModels: readonly ModelId[];
}

export function GameShell({ availableModels }: GameShellProps) {
  useStoryDirector();

  // Só em desenvolvimento: estado do jogo no console (window.__bth.getState())
  // e os atalhos de teste (bth.ajuda()).
  // Importadas só aqui dentro: o build de produção descarta o ramo inteiro e
  // as ferramentas não entram no pacote que o jogador baixa.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    Object.assign(window, { __bth: useGameStore });
    void import("@/game/debug/devTools").then(({ installDevTools }) => installDevTools());

    // Modelos declarados que ainda não chegaram: quem os usaria segue com a
    // figura provisória, e o console diz o que falta.
    const missing = modelIds.filter((id) => !availableModels.includes(id));
    if (missing.length) {
      console.warn(`Modelos 3D que faltam em /public:\n${missing.map((id) => `  public${assetManifest.models[id]}`).join("\n")}`);
    }
  }, [availableModels]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#050505]">
      <Experience availableModels={availableModels} />
      <GameUI />
    </main>
  );
}
