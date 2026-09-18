import { useEffect, useMemo } from "react";
import { createTerrainGeometry } from "./geometry";

/** Chão do Além e a colina, em um único mesh. */
export function Terrain() {
  const geometry = useMemo(() => createTerrainGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} matrixAutoUpdate={false}>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}
