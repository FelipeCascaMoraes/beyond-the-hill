import { useEffect, useMemo } from "react";
import { atmosphere } from "@/game/config/render";
import { SUMMIT, terrainHeight } from "@/game/world/terrain";
import { createTreeGeometry } from "./geometry";

/** Escala da árvore: ~26 m de altura, legível a 720 m de distância. */
const TREE_SCALE = 1.9;

/** A árvore no topo da colina, recortada contra a luz. Visível de todo o campo. */
export function LoneTree() {
  const geometry = useMemo(() => createTreeGeometry(23), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Levemente enterrada para não flutuar na encosta.
  const y = terrainHeight(SUMMIT.x, SUMMIT.z) - 1.5;

  return (
    <mesh geometry={geometry} position={[SUMMIT.x, y, SUMMIT.z]} rotation-y={0.4} scale={TREE_SCALE}>
      <meshLambertMaterial color={atmosphere.treeColor} flatShading />
    </mesh>
  );
}
