import { useEffect, useMemo } from "react";
import { terrainFocusOf } from "@/content";
import { useGameStore } from "@/game/state/gameStore";
import { createTerrainGeometry } from "./geometry";

/**
 * Chão do Além e a colina, em um único mesh. A malha é refeita a cada troca de
 * zona para adensar onde se caminha (ver `terrainFocus` em content/zones.ts);
 * como toda troca de zona acontece atrás de um apagão, a reconstrução não
 * aparece.
 */
export function Terrain() {
  const zone = useGameStore((state) => state.zone);
  const [focusX, focusZ] = terrainFocusOf(zone);

  const geometry = useMemo(() => createTerrainGeometry([focusX, focusZ]), [focusX, focusZ]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Depois da grama e do que está em pé sobre ele: o chão que ficou escondido
  // atrás disso tudo é descartado pelo teste de profundidade antes de ser pintado.
  return (
    <mesh geometry={geometry} matrixAutoUpdate={false} renderOrder={1}>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}
