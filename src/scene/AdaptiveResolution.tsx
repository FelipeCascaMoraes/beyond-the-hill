import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { getQualitySettings } from "@/game/config/quality";
import {
  createResolutionMonitor,
  interruptResolutionMonitor,
  resolutionAt,
  resolutionCeiling,
  sampleResolution,
} from "@/game/render/resolution";
import { useGameStore } from "@/game/state/gameStore";

/** O fator de resolução de partida para a janela inteira (a cena ocupa a tela toda). */
export function initialResolution(): number {
  return resolutionCeiling(window.innerWidth, window.innerHeight, window.devicePixelRatio, getQualitySettings());
}

/**
 * Mede o FPS enquanto a Aysha anda e ajusta a resolução da cena (ver
 * game/render/resolution.ts). Só mede com o jogo correndo de verdade: durante
 * uma lembrança, uma travessia ou um apagão quem pesa é a tela por cima, e
 * baixar a resolução do mundo não resolveria nada.
 *
 * Avisa `onChange` só quando a resolução muda — o valor mora no estado de
 * quem monta o Canvas, porque é o Canvas que a aplica.
 */
export function AdaptiveResolution({ onChange }: { onChange: (dpr: number) => void }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const monitor = useRef(createResolutionMonitor());
  const ceiling = resolutionCeiling(width, height, window.devicePixelRatio, getQualitySettings());

  // Janela redimensionada: o teto mudou, o degrau conquistado continua.
  useEffect(() => {
    onChange(resolutionAt(monitor.current, ceiling));
  }, [ceiling, onChange]);

  useFrame((_, delta) => {
    const state = useGameStore.getState();
    if (state.phase !== "playing" || state.activeMemory || state.traveling || state.captured) {
      interruptResolutionMonitor(monitor.current);
      return;
    }
    if (sampleResolution(monitor.current, delta)) onChange(resolutionAt(monitor.current, ceiling));
  });

  return null;
}
