"use client";

import dynamic from "next/dynamic";
import { GameUI } from "@/ui/GameUI";

// Three.js depende de WebGL/window: a cena nunca é pré-renderizada no servidor.
const Experience = dynamic(() => import("@/scene/Experience"), { ssr: false });

export function GameShell() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
      <Experience />
      <GameUI />
    </main>
  );
}
