"use client";

import { useState } from "react";
import { useGameStore } from "@/game/state/gameStore";
import { TitleScreen } from "./title/TitleScreen";
import { ControlsHint } from "./ControlsHint";
import { DialogueBox } from "./dialogue/DialogueBox";
import { InteractionPrompt } from "./InteractionPrompt";
import { CaptureOverlay } from "./machine/CaptureOverlay";
import { ThreatVignette } from "./machine/ThreatVignette";
import { MemoryOverlay } from "./memory/MemoryOverlay";

/** Camada HTML sobre o canvas. Não bloqueia o mouse, exceto nos próprios elementos. */
export function GameUI() {
  const phase = useGameStore((state) => state.phase);
  // A tela inicial continua montada até o fim da transição, mesmo após startGame().
  const [titleVisible, setTitleVisible] = useState(true);

  return (
    <div className="pointer-events-none absolute inset-0">
      {phase === "playing" && (
        <>
          <ThreatVignette />
          <ControlsHint />
          <InteractionPrompt />
          <DialogueBox />
          <MemoryOverlay />
          <CaptureOverlay />
        </>
      )}
      {titleVisible && <TitleScreen onExited={() => setTitleVisible(false)} />}
    </div>
  );
}
