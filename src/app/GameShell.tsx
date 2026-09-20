"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { installDevTools } from "@/game/debug/devTools";
import { useGameStore } from "@/game/state/gameStore";
import { useStoryDirector } from "@/game/story/useStoryDirector";
import { GameUI } from "@/ui/GameUI";

// Three.js depende de WebGL/window: a cena nunca é pré-renderizada no servidor.
const Experience = dynamic(() => import("@/scene/Experience"), { ssr: false });

export function GameShell() {
  useStoryDirector();

  // Só em desenvolvimento: estado do jogo no console (window.__bth.getState())
  // e os atalhos de teste (bth.ajuda()).
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    Object.assign(window, { __bth: useGameStore });
    installDevTools();
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
      <Experience />
      <GameUI />
    </main>
  );
}
