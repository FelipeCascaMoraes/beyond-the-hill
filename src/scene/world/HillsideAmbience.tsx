import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { hillsideAudio } from "@/audio/hillsideAudio";
import { useGameStore } from "@/game/state/gameStore";
import { publishAscent } from "@/game/world/ascentSignal";
import { shelterAt } from "@/game/world/hillside";
import { ascentNow } from "./mood";

/** De quanto em quanto tempo o som e a interface recebem a altura nova (s). */
const STEP = 0.1;
/** Quanto o som leva para sumir quando a zona sai ou o jogo acaba (s). */
const ENDING_FADE = 4.5;

/**
 * O que a subida faz fora da imagem: o vento e o acorde que abrem com a altura
 * (audio/hillsideAudio.ts) e o número que a interface usa para ir sumindo.
 * Tudo sai de uma coisa só — a altura do chão debaixo da câmera.
 *
 * Não atualiza por quadro: dez vezes por segundo é mais do que o ouvido e o
 * olho percebem, e evita agendar rampas de áudio sessenta vezes por segundo.
 */
export function HillsideAmbience() {
  const elapsed = useRef(0);

  // No fim do jogo o vento e o acorde se apagam junto com a tela.
  const ended = useGameStore((state) => state.phase === "ending");

  useEffect(() => {
    if (ended) return;
    hillsideAudio.start();
    return () => {
      hillsideAudio.stop(ENDING_FADE);
      publishAscent(0);
    };
  }, [ended]);

  useFrame(({ camera }, delta) => {
    elapsed.current += delta;
    if (elapsed.current < STEP) return;
    elapsed.current = 0;
    const climbed = ascentNow(camera.position.y);
    hillsideAudio.setAscent(climbed, shelterAt(camera.position.x, camera.position.z));
    publishAscent(climbed);
  });

  return null;
}
