import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type MeshLambertMaterial } from "three";
import { atmosphere } from "@/game/config/render";
import { SUMMIT, terrainHeight } from "@/game/world/terrain";
import { createTreeGeometry } from "./geometry";

/** Escala da árvore: ~26 m de altura, legível a 720 m de distância. */
const TREE_SCALE = 1.9;

/**
 * De onde a árvore deixa de ser silhueta e vira árvore (m). Longe, ela é o
 * recorte escuro contra o sol que chama o jogo inteiro; perto, é casca e
 * folha — a Aysha encosta a testa nela, e um monólito preto não serve para isso.
 */
const NEAR = 25;
const FAR = 110;

const silhouette = new Color(atmosphere.treeColor);
const bark = new Color("#6b5641");
const leaves = new Color("#56663a");

/** A árvore no topo da colina, recortada contra a luz. Visível de todo o campo. */
export function LoneTree() {
  const geometry = useMemo(() => createTreeGeometry(23), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const woodRef = useRef<MeshLambertMaterial>(null);
  const canopyRef = useRef<MeshLambertMaterial>(null);

  // Levemente enterrada para não flutuar na encosta.
  const y = terrainHeight(SUMMIT.x, SUMMIT.z) - 1.5;

  useFrame(({ camera }) => {
    const wood = woodRef.current;
    const canopy = canopyRef.current;
    if (!wood || !canopy) return;
    const distance = Math.hypot(camera.position.x - SUMMIT.x, camera.position.z - SUMMIT.z);
    const t = Math.min(1, Math.max(0, (FAR - distance) / (FAR - NEAR)));
    const near = t * t * (3 - 2 * t);
    wood.color.lerpColors(silhouette, bark, near);
    canopy.color.lerpColors(silhouette, leaves, near);
  });

  return (
    <mesh geometry={geometry} position={[SUMMIT.x, y, SUMMIT.z]} rotation-y={0.4} scale={TREE_SCALE}>
      <meshLambertMaterial ref={woodRef} attach="material-0" color={atmosphere.treeColor} flatShading />
      <meshLambertMaterial ref={canopyRef} attach="material-1" color={atmosphere.treeColor} flatShading />
    </mesh>
  );
}
