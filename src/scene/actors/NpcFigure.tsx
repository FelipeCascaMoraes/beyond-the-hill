import { characters, type NpcId } from "@/content";

// Figuras provisórias feitas de primitivas: silhuetas distintas, sem modelos.
// Frente voltada para +Z. Substituir por modelos CC0 quando existirem.

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

const figures: Record<NpcId, (props: FigureProps) => React.JSX.Element> = {
  cassandra: CassandraFigure,
  victor: VictorFigure,
};

export function NpcFigure({ id }: { id: NpcId }) {
  const Figure = figures[id];
  return <Figure color={characters[id].placeholderColor} />;
}
