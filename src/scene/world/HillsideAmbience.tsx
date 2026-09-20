import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { hillsideAudio } from "@/audio/hillsideAudio";
import { publishAscent } from "@/game/world/ascentSignal";
import { shelterAt } from "@/game/world/hillside";
import { ascentNow } from "./mood";

/** De quanto em quanto tempo o som e a interface recebem a altura nova (s). */
const STEP = 0.1;

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

  useEffect(() => {
    hillsideAudio.start();
    return () => {
      hillsideAudio.stop();
      publishAscent(0);
    };
  }, []);

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
