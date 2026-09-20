"use client";

import { useGameStore } from "@/game/state/gameStore";

/** Aparência de cada nível de ameaça (classes literais: o Tailwind as lê aqui). */
const levels = {
  calm: { veil: "opacity-0", pulse: "" },
  // Ela desconfiou: as bordas escurecem de leve, sem alarme.
  detect: { veil: "opacity-70", pulse: "" },
  // Está vindo: vermelho fraco nas bordas, respirando rápido.
  chase: { veil: "opacity-100", pulse: "threat-pulse" },
} as const;

/**
 * A tensão das máquinas, sem HUD: só as bordas da tela. Nada de barra de vida
 * nem de mira — a Aysha não luta, ela corre.
 */
export function ThreatVignette() {
  const threat = useGameStore((state) => state.threat);
  const level = levels[threat];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${level.veil} ${level.pulse} bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(90,10,6,0.55)_100%)]`}
      />
      {threat === "chase" && (
        <p className="absolute inset-x-0 bottom-[14vh] text-center text-[0.7rem] tracking-[0.4em] text-red-100/70 uppercase [text-shadow:0_1px_10px_rgba(0,0,0,0.8)]">
          Shift para correr
        </p>
      )}
    </div>
  );
}
