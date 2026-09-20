import type { Group, Mesh } from "three";

// Figura provisória feita de primitivas, como os NPCs: uma coisa de metal
// escuro que flutua, com um olho aceso. Frente voltada para +Z.
// Substituir por um modelo CC0 quando existir.

const SHELL = "#2f3338";
const RIM = "#4a5158";

interface MachineFigureProps {
  /** O corpo, para o balanço e o giro lento (ver Machine.tsx). */
  bodyRef: React.Ref<Group>;
  /** O olho: a cor conta em que estado ela está. */
  eyeRef: React.Ref<Mesh>;
}

/**
 * Casco octaédrico, um anel em volta e um olho só. Nada de armas: a ameaça
 * está em ser vista.
 */
export function MachineFigure({ bodyRef, eyeRef }: MachineFigureProps) {
  return (
    <group ref={bodyRef}>
      <mesh>
        <octahedronGeometry args={[0.62, 0]} />
        <meshLambertMaterial color={SHELL} flatShading />
      </mesh>
      {/* Anel inclinado: dá a leitura de "máquina" mesmo de longe. */}
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.85, 0.055, 6, 18]} />
        <meshLambertMaterial color={RIM} flatShading />
      </mesh>
      {/* Hastes curtas penduradas, como pernas que não pousam. */}
      {[-0.5, 0, 0.5].map((offset) => (
        <mesh key={offset} position={[offset * 0.7, -0.55, offset * 0.3]}>
          <cylinderGeometry args={[0.035, 0.02, 0.5, 5]} />
          <meshLambertMaterial color={RIM} flatShading />
        </mesh>
      ))}
      {/* O olho, virado para a frente. Material básico: brilha sem luz real. */}
      <mesh ref={eyeRef} position={[0, 0.05, 0.56]}>
        <sphereGeometry args={[0.17, 12, 10]} />
        <meshBasicMaterial color="#ffd89a" toneMapped={false} />
      </mesh>
    </group>
  );
}
