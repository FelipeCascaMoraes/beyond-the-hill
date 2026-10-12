import { Suspense } from "react";
import type { ModelId } from "@/assets/manifest";
import { characterModelOf, characters, type CharacterId } from "@/content";
import { CharacterModel, type CharacterAnimation } from "./CharacterModel";
import { ModelBoundary, useAvailableModels } from "./modelAvailability";

// Figuras provisórias feitas de primitivas: silhuetas distintas, sem modelos.
// Frente voltada para +Z. Cada uma dá lugar ao modelo 3D do personagem assim
// que o arquivo dele existir (ver NpcFigure, no fim).

const SKIN = "#c7a488";

interface FigureProps {
  color: string;
}

/** Cassandra: esguia, casaco longo até os pés, cabelo preso. */
function CassandraFigure({ color }: FigureProps) {
  return (
    <>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.17, 0.36, 1.2, 10]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 1.34, 0]}>
        <capsuleGeometry args={[0.16, 0.26, 3, 10]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 1.7, 0.01]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      <mesh position={[0, 1.74, -0.1]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshLambertMaterial color="#2b211d" />
      </mesh>
    </>
  );
}

/** Victor: mais largo, chapéu de aba, lanterna acesa na mão. */
function VictorFigure({ color }: FigureProps) {
  return (
    <>
      <mesh position={[0, 0.88, 0]}>
        <capsuleGeometry args={[0.25, 0.85, 3, 10]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 1.66, 0.01]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      <mesh position={[0, 1.77, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.025, 14]} />
        <meshLambertMaterial color="#231f1b" />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.16, 12]} />
        <meshLambertMaterial color="#231f1b" />
      </mesh>
      {/* Lanterna: só um material emissivo, sem luz real (custo zero de iluminação). */}
      <mesh position={[0.34, 0.72, 0.12]}>
        <boxGeometry args={[0.1, 0.14, 0.1]} />
        <meshBasicMaterial color="#ffd89a" toneMapped={false} />
      </mesh>
    </>
  );
}

/**
 * O pai: alto e largo, sem chapéu nem lanterna — nada nas mãos. Barba curta,
 * mangas arregaçadas, calça de quem monta. Nenhuma peça escura: onde o Victor
 * é sombra, ele é terra e palha.
 */
function FatherFigure({ color }: FigureProps) {
  return (
    <>
      {/* Pernas: calça de montaria. */}
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.2, 0.17, 0.88, 10]} />
        <meshLambertMaterial color="#5a4a35" flatShading />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <capsuleGeometry args={[0.27, 0.5, 3, 10]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      {/* Antebraços à mostra, soltos ao lado do corpo. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.33, 1.02, 0.02]} rotation-z={side * 0.08}>
          <capsuleGeometry args={[0.06, 0.34, 2, 6]} />
          <meshLambertMaterial color={SKIN} />
        </mesh>
      ))}
      <mesh position={[0, 1.75, 0.01]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      {/* Barba e cabelo curtos. */}
      <mesh position={[0, 1.69, 0.06]} scale={[1, 0.7, 0.8]}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshLambertMaterial color="#6b5238" />
      </mesh>
      <mesh position={[0, 1.81, -0.02]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshLambertMaterial color="#6b5238" />
      </mesh>
    </>
  );
}

/**
 * A mãe: vestido comprido que abre até o chão, um xale claro nos ombros e o
 * cabelo solto nas costas. Mais baixa que o pai. Onde a Cassandra é estreita
 * e fechada, ela é larga e macia.
 */
function MotherFigure({ color }: FigureProps) {
  return (
    <>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.42, 1.0, 12]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <capsuleGeometry args={[0.18, 0.34, 3, 10]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      {/* Xale. */}
      <mesh position={[0, 1.36, 0]} scale={[1, 0.45, 0.85]}>
        <sphereGeometry args={[0.28, 12, 8]} />
        <meshLambertMaterial color="#e3d3b2" flatShading />
      </mesh>
      <mesh position={[0, 1.62, 0.01]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      {/* Cabelo solto até o meio das costas. */}
      <mesh position={[0, 1.6, -0.06]}>
        <capsuleGeometry args={[0.12, 0.3, 3, 8]} />
        <meshLambertMaterial color="#4a3222" />
      </mesh>
      <mesh position={[0, 1.37, -0.12]} scale={[1, 1, 0.6]}>
        <capsuleGeometry args={[0.11, 0.26, 3, 8]} />
        <meshLambertMaterial color="#4a3222" />
      </mesh>
    </>
  );
}

/**
 * A Aysha, para a câmera em 3ª pessoa: camisa clara de mangas dobradas, calça
 * escura de trabalho, botas, e o cabelo escuro e comprido solto nas costas —
 * que é quase tudo o que se vê dela, de trás. Provisória como as outras: dá
 * lugar ao modelo assim que `aysha.glb` existir.
 */
function AyshaFigure({ color }: FigureProps) {
  return (
    <>
      {/* Botas e calça. */}
      <mesh position={[0, 0.14, 0.02]}>
        <cylinderGeometry args={[0.16, 0.18, 0.28, 10]} />
        <meshLambertMaterial color="#3a2a20" flatShading />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.19, 0.16, 0.62, 10]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      {/* Cinto. */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 10]} />
        <meshLambertMaterial color="#2a1f18" flatShading />
      </mesh>
      {/* Camisa. */}
      <mesh position={[0, 1.17, 0]}>
        <capsuleGeometry args={[0.19, 0.34, 3, 10]} />
        <meshLambertMaterial color="#d9cfbd" flatShading />
      </mesh>
      {/* Mangas dobradas e antebraços, soltos ao lado do corpo. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.25, 1.3, 0]} rotation-z={side * 0.1}>
          <mesh position={[0, -0.13, 0]}>
            <capsuleGeometry args={[0.065, 0.18, 2, 6]} />
            <meshLambertMaterial color="#d9cfbd" flatShading />
          </mesh>
          <mesh position={[0, -0.42, 0.01]}>
            <capsuleGeometry args={[0.048, 0.26, 2, 6]} />
            <meshLambertMaterial color={SKIN} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.6, 0.01]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      {/* Cabelo: o alto da cabeça e a queda longa pelas costas. */}
      <mesh position={[0, 1.64, -0.03]} scale={[1.08, 0.95, 1.05]}>
        <sphereGeometry args={[0.125, 10, 8]} />
        <meshLambertMaterial color="#1f1815" />
      </mesh>
      <mesh position={[0, 1.36, -0.13]} scale={[1.25, 1, 0.6]}>
        <capsuleGeometry args={[0.12, 0.42, 3, 8]} />
        <meshLambertMaterial color="#1f1815" />
      </mesh>
    </>
  );
}

/** Quem aparece como NPC: todo mundo menos a própria Aysha, que é quem se joga. */
export type FigureId = Exclude<CharacterId, "aysha">;

const figures: Record<CharacterId, (props: FigureProps) => React.JSX.Element> = {
  aysha: AyshaFigure,
  cassandra: CassandraFigure,
  victor: VictorFigure,
  father: FatherFigure,
  mother: MotherFigure,
};

/** Dos modelos que existem, os de quem tem figura no mundo. */
export function figureModels(available: readonly ModelId[]): ModelId[] {
  return (Object.keys(figures) as CharacterId[])
    .flatMap((id) => characterModelOf(id)?.model ?? [])
    .filter((model) => available.includes(model));
}

/**
 * A figura de um personagem: o modelo 3D dele, se houver um declarado
 * (content/characterModels.ts) e o arquivo existir em /public; senão, as
 * primitivas acima. Os dois ficam de pé na origem, virados para +Z, então
 * quem monta a figura (Npc.tsx, AyshaBody.tsx) não precisa saber qual das
 * duas recebeu. A animação só vale para o modelo.
 */
export function NpcFigure({ character, animation }: { character: CharacterId; animation?: CharacterAnimation }) {
  const available = useAvailableModels();
  const config = characterModelOf(character);
  const Figure = figures[character];
  const primitives = <Figure color={characters[character].placeholderColor} />;

  if (!config || !available.includes(config.model)) return primitives;
  return (
    <ModelBoundary model={config.model} fallback={primitives}>
      {/* O arquivo já foi baixado junto com o mundo; a espera é só garantia. */}
      <Suspense fallback={null}>
        <CharacterModel config={config} animation={animation} />
      </Suspense>
    </ModelBoundary>
  );
}
