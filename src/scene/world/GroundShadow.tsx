import { useEffect, useMemo, type Ref } from "react";
import { CanvasTexture, PlaneGeometry, SRGBColorSpace, type MeshBasicMaterial } from "three";
import { terrainHeight } from "@/game/world/terrain";

// Sombra de contato: uma mancha escura e macia no chão debaixo de quem está
// de pé. Não há mapa de sombras no jogo (a luz é um contraluz de fim de tarde,
// e sombras projetadas custariam caro na grama), então sem isto as pessoas e
// as pedras parecem recortadas e coladas por cima do campo. É o mínimo que
// assenta cada coisa no chão — e só isso.

/** Folga acima do terreno (m), para não piscar contra ele. */
const LIFT = 0.04;

let texture: CanvasTexture | null = null;

/** Um degradê radial, feito uma vez e compartilhado por todas as sombras. */
function shadowTexture(): CanvasTexture {
  if (texture) return texture;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.45, "rgba(0,0,0,0.6)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

interface GroundShadowProps {
  x: number;
  z: number;
  radius: number;
  /** Força da sombra no centro (0–1). */
  opacity?: number;
  /**
   * Plana e centrada na origem do grupo pai, em vez de moldada ao chão em
   * (x, z): para quem se move junto com a própria sombra.
   */
  local?: boolean;
  materialRef?: Ref<MeshBasicMaterial>;
}

/**
 * Sombra macia que acompanha o relevo: a malha é uma pequena grade com a
 * altura do chão em cada vértice, então serve tanto para uma pessoa num campo
 * plano quanto para a copa larga no alto do morro.
 */
export function GroundShadow({ x, z, radius, opacity = 0.4, local = false, materialRef }: GroundShadowProps) {
  const geometry = useMemo(() => {
    const segments = radius > 3 ? 12 : 4;
    const plane = new PlaneGeometry(radius * 2, radius * 2, segments, segments);
    plane.rotateX(-Math.PI / 2);
    if (local) {
      plane.translate(0, LIFT, 0);
      return plane;
    }
    const position = plane.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const px = x + position.getX(i);
      const pz = z + position.getZ(i);
      position.setXYZ(i, px, terrainHeight(px, pz) + LIFT, pz);
    }
    plane.computeBoundingSphere();
    return plane;
  }, [x, z, radius, local]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} matrixAutoUpdate={false} renderOrder={1}>
      <meshBasicMaterial
        ref={materialRef}
        map={shadowTexture()}
        transparent
        opacity={opacity}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        color="#000000"
      />
    </mesh>
  );
}
