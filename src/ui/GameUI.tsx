"use client";

import { useState } from "react";
import { useGameStore } from "@/game/state/gameStore";
import { TitleScreen } from "./title/TitleScreen";
import { ScreenVignette } from "./ScreenVignette";
import { CinematicOverlay } from "./cinematic/CinematicOverlay";
import { ChoicePrompt } from "./choice/ChoicePrompt";
import { EndScreen } from "./ending/EndScreen";
import { ControlsHint } from "./ControlsHint";
import { DialogueBox } from "./dialogue/DialogueBox";
import { GuideHint } from "./guide/GuideHint";
import { InteractionPrompt } from "./InteractionPrompt";
import { CaptureOverlay } from "./machine/CaptureOverlay";
import { ThreatVignette } from "./machine/ThreatVignette";
import { MemoryOverlay } from "./memory/MemoryOverlay";
import { TravelOverlay } from "./travel/TravelOverlay";

/** Camada HTML sobre o canvas. Não bloqueia o mouse, exceto nos próprios elementos. */
export function GameUI() {
  const phase = useGameStore((state) => state.phase);
  // A tela inicial continua montada até o fim da transição, mesmo após startGame().
  const [titleVisible, setTitleVisible] = useState(true);

  return (
    <div className="pointer-events-none absolute inset-0">
      {phase === "playing" && (
        <>
          <ScreenVignette />
          <ThreatVignette />
          <CinematicOverlay />
          <ControlsHint />
          <GuideHint />
          <InteractionPrompt />
          <DialogueBox />
          <ChoicePrompt />
          <MemoryOverlay />
          <CaptureOverlay />
          <TravelOverlay />
        </>
      )}
      {/* No fim as faixas de cinema continuam até a tela final cobrir tudo. */}
      {phase === "ending" && (
        <>
          {/* A vinheta fica: sem ela as bordas clareariam de golpe no último plano. */}
          <ScreenVignette />
          <CinematicOverlay />
          <EndScreen />
        </>
      )}
      {titleVisible && <TitleScreen onExited={() => setTitleVisible(false)} />}
    </div>
  );
}
