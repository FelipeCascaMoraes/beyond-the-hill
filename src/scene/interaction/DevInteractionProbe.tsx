import { selectMemoryStatus, useGameStore } from "@/game/state/gameStore";
import { terrainHeight, trailCenterX } from "@/game/world/terrain";
import { useInteractable } from "./useInteractable";

// Objeto de teste do sistema de interação + memórias. Só existe em
// desenvolvimento (npm run dev); não entra no build final. Mostra o padrão de
// um "gatilho de memória": só fica interativo enquanto a memória está
// desbloqueada e ainda não foi vivida.

const Z = -6;
const X = trailCenterX(Z);
const Y = terrainHeight(X, Z);
const MEMORY = "first-ride";

export function DevInteractionProbe() {
  const status = useGameStore(selectMemoryStatus(MEMORY));

  useInteractable(
    {
      id: "dev-probe",
      prompt: "Lembrar",
      action: { type: "memory", memory: MEMORY },
      targetRadius: 0.7,
      enabled: status === "unlocked",
    },
    [X, Y + 0.3, Z],
  );

  return (
    <mesh position={[X, Y + 0.25, Z]} rotation={[0.3, 0.8, 0.1]}>
      <dodecahedronGeometry args={[0.4, 0]} />
      <meshLambertMaterial color="#8d8773" flatShading />
    </mesh>
  );
}
