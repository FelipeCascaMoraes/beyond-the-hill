import { terrainHeight, trailCenterX } from "@/game/world/terrain";
import { useInteractable } from "./useInteractable";

// Objeto de teste do sistema de interação. Só existe em desenvolvimento
// (npm run dev); não entra no build final. Pode ser removido quando houver
// interativos reais na cena.

const Z = -6;
const X = trailCenterX(Z);
const Y = terrainHeight(X, Z);

export function DevInteractionProbe() {
  useInteractable(
    {
      id: "dev-probe",
      prompt: "Interagir",
      action: { type: "memory", memory: "father-ride" },
      targetRadius: 0.7,
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
