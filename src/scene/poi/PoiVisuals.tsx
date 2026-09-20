import { useLayoutEffect, useMemo, useRef } from "react";
import { CanvasTexture, Object3D, SRGBColorSpace, type InstancedMesh } from "three";
import type { PointOfInterest } from "@/content";
import { HOUSE, HOUSE_WINDOW } from "@/game/world/house";
import { createRandom } from "@/game/world/noise";
import { terrainHeight } from "@/game/world/terrain";

// Aparência provisória dos pontos de interesse: primitivas simples, poucos draw calls.
// Cada visual recebe a posição no mundo da base para acompanhar o terreno.

export type PoiKind = PointOfInterest["kind"];

interface VisualProps {
  /** Posição da base no mundo (o grupo já está nela). */
  x: number;
  y: number;
  z: number;
}

/** Ferradura velha, deitada na terra batida da trilha. */
function Horseshoe() {
  return (
    <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0.6]}>
      <torusGeometry args={[0.09, 0.018, 6, 16, Math.PI * 1.65]} />
      <meshLambertMaterial color="#7d5c40" emissive="#2a1c10" flatShading />
    </mesh>
  );
}

const FENCE_POSTS = 5;
const FENCE_SPACING = 2.3;
/** A cerca corre na direção da colina (para -Z, levemente à direita). */
const FENCE_DIRECTION = { x: 0.08, z: -1 };

/** Restos de cerca: postes tortos e uma travessa caída. */
function Fence({ x, y, z }: VisualProps) {
  const posts = useMemo(() => {
    const random = createRandom(41);
    return Array.from({ length: FENCE_POSTS }, (_, index) => {
      const localX = FENCE_DIRECTION.x * FENCE_SPACING * index;
      const localZ = FENCE_DIRECTION.z * FENCE_SPACING * index;
      return {
        position: [localX, terrainHeight(x + localX, z + localZ) - y, localZ] as const,
        height: 0.9 + random() * 0.35,
        tilt: [(random() - 0.5) * 0.25, random() * Math.PI, (random() - 0.5) * 0.25] as const,
      };
    });
  }, [x, y, z]);

  const [first, second] = posts;
  return (
    <>
      {posts.map((post, index) => (
        <mesh key={index} position={[post.position[0], post.position[1] + post.height / 2 - 0.1, post.position[2]]} rotation={post.tilt}>
          <boxGeometry args={[0.11, post.height, 0.11]} />
          <meshLambertMaterial color="#5c4c3a" flatShading />
        </mesh>
      ))}
      {/* Travessa ainda presa entre os dois primeiros postes, caída de um lado. */}
      <mesh
        position={[(first.position[0] + second.position[0]) / 2, first.position[1] + 0.45, (first.position[2] + second.position[2]) / 2]}
        rotation={[0.3, Math.atan2(FENCE_DIRECTION.x, FENCE_DIRECTION.z), 0]}
      >
        <boxGeometry args={[0.07, 0.07, FENCE_SPACING]} />
        <meshLambertMaterial color="#6a5842" flatShading />
      </mesh>
    </>
  );
}

/** Pilha fixa (mesma seed sempre): calculada uma vez, fora do render. */
const CAIRN_STONES = (() => {
  const random = createRandom(17);
  const stones = [];
  let height = 0;
  for (const radius of [0.32, 0.26, 0.21, 0.16, 0.11]) {
    stones.push({
      radius,
      position: [(random() - 0.5) * 0.06, height + radius * 0.7, (random() - 0.5) * 0.06] as const,
      rotation: [random(), random() * 3, random()] as const,
    });
    height += radius * 1.25;
  }
  return stones;
})();

/** Pedras empilhadas com cuidado. */
function Cairn() {
  return (
    <>
      {CAIRN_STONES.map((stone, index) => (
        <mesh key={index} position={stone.position} rotation={stone.rotation} scale={[1, 0.62, 1]}>
          <dodecahedronGeometry args={[stone.radius, 0]} />
          <meshLambertMaterial color="#8a8578" flatShading />
        </mesh>
      ))}
    </>
  );
}

const FLOWER_COUNT = 45;
const FLOWER_RADIUS = 1.8;
const dummy = new Object3D();

/** Moita de flores amarelas: hastes e flores instanciadas (2 draw calls). */
function Flowers({ x, y, z }: VisualProps) {
  const stemsRef = useRef<InstancedMesh>(null);
  const headsRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const stems = stemsRef.current;
    const heads = headsRef.current;
    if (!stems || !heads) return;
    const random = createRandom(29);
    for (let i = 0; i < FLOWER_COUNT; i++) {
      const r = FLOWER_RADIUS * Math.sqrt(random());
      const angle = random() * Math.PI * 2;
      const localX = Math.cos(angle) * r;
      const localZ = Math.sin(angle) * r;
      const ground = terrainHeight(x + localX, z + localZ) - y;
      const height = 0.45 + random() * 0.4;

      dummy.position.set(localX, ground + height / 2, localZ);
      dummy.rotation.set((random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);

      dummy.position.set(localX, ground + height, localZ);
      dummy.rotation.set(0, random() * Math.PI, 0);
      dummy.scale.setScalar(0.8 + random() * 0.5);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    }
    stems.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }, [x, y, z]);

  return (
    <>
      <instancedMesh ref={stemsRef} args={[undefined, undefined, FLOWER_COUNT]} frustumCulled={false}>
        <cylinderGeometry args={[0.008, 0.012, 1, 4]} />
        <meshLambertMaterial color="#4b5a2c" />
      </instancedMesh>
      <instancedMesh ref={headsRef} args={[undefined, undefined, FLOWER_COUNT]} frustumCulled={false}>
        <icosahedronGeometry args={[0.045, 0]} />
        <meshLambertMaterial color="#e6c34a" emissive="#3a2e08" flatShading />
      </instancedMesh>
    </>
  );
}

/** Pedra grande virada para a colina, como um banco. */
function Boulder() {
  return (
    <>
      <mesh position={[0, 0.35, 0]} rotation={[0.1, 0.5, 0.05]} scale={[1.5, 0.75, 1.1]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial color="#7d786a" flatShading />
      </mesh>
      <mesh position={[1.3, 0.1, 0.7]} rotation={[0.4, 1.2, 0.2]} scale={[0.5, 0.35, 0.45]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial color="#77725f" flatShading />
      </mesh>
    </>
  );
}

/**
 * O papel da câmara do labirinto: uma pedra baixa, chata, e em cima dela uma
 * folha dobrada muitas vezes, presa por um seixo para o vento não levar.
 */
function Note() {
  return (
    <>
      <mesh position={[0, 0.16, 0]} rotation={[0, 0.3, 0]} scale={[1, 0.35, 1]}>
        <dodecahedronGeometry args={[0.45, 0]} />
        <meshLambertMaterial color="#6b675c" flatShading />
      </mesh>
      {/* A folha, amarelada e amassada: quase plana sobre a pedra. */}
      <mesh position={[0, 0.3, 0.02]} rotation={[-Math.PI / 2 + 0.12, 0.25, 0]}>
        <boxGeometry args={[0.26, 0.34, 0.012]} />
        <meshLambertMaterial color="#d9cfae" flatShading />
      </mesh>
      {/* O seixo que a segura. */}
      <mesh position={[0.07, 0.34, -0.08]} rotation={[0.3, 0.8, 0.1]}>
        <dodecahedronGeometry args={[0.055, 0]} />
        <meshLambertMaterial color="#5f5b52" flatShading />
      </mesh>
    </>
  );
}

const GATE_WIDTH = 3;
const WOOD = "#6e5c46";

/** Porteira de madeira sozinha no campo: dois mourões, três tábuas e a travessa diagonal. */
function Gate() {
  const half = GATE_WIDTH / 2;
  return (
    <>
      {[-half, half].map((x) => (
        <mesh key={x} position={[x, 0.7, 0]}>
          <boxGeometry args={[0.16, 1.55, 0.16]} />
          <meshLambertMaterial color="#5a4a38" flatShading />
        </mesh>
      ))}
      {[0.35, 0.72, 1.09].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[GATE_WIDTH - 0.16, 0.13, 0.05]} />
          <meshLambertMaterial color={WOOD} flatShading />
        </mesh>
      ))}
      {/* Travessa diagonal (mão-francesa) de um canto ao outro. */}
      <mesh position={[0, 0.72, 0.04]} rotation-z={Math.atan2(0.74, GATE_WIDTH - 0.3)}>
        <boxGeometry args={[Math.hypot(GATE_WIDTH - 0.3, 0.74), 0.11, 0.05]} />
        <meshLambertMaterial color={WOOD} flatShading />
      </mesh>
    </>
  );
}

// ── Objetos da casa abandonada ────────────────────────────────────────────
// A base (y = 0) é o chão do terreno; o piso de madeira fica HOUSE.floorThickness acima.

const FLOOR = HOUSE.floorThickness;

let drawingTexture: CanvasTexture | null = null;

/**
 * Desenho de criança feito em código (sem imagem externa): a colina com o
 * degrau à esquerda, a árvore no topo, o sol e três pessoas de mãos dadas.
 */
function getDrawingTexture(): CanvasTexture {
  if (drawingTexture) return drawingTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#e8dcc0";
    ctx.fillRect(0, 0, 256, 192);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const crayon = (color: string, width: number, draw: () => void) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      draw();
      ctx.stroke();
    };
    // Sol.
    crayon("#d9a431", 4, () => ctx.arc(200, 38, 16, 0, Math.PI * 2));
    // Colina: encosta longa, degrau, cume.
    crayon("#6f7d3a", 5, () => {
      ctx.moveTo(8, 150);
      ctx.bezierCurveTo(50, 145, 70, 118, 96, 112);
      ctx.bezierCurveTo(118, 108, 122, 70, 150, 66);
      ctx.bezierCurveTo(180, 62, 205, 120, 248, 140);
    });
    // Árvore no topo.
    crayon("#5a3e26", 4, () => {
      ctx.moveTo(150, 66);
      ctx.lineTo(150, 44);
    });
    crayon("#3f5a2a", 6, () => ctx.ellipse(150, 38, 20, 9, 0, 0, Math.PI * 2));
    // Três pessoas de mãos dadas: grande, média, pequena.
    const person = (x: number, height: number, color: string) =>
      crayon(color, 3, () => {
        const top = 182 - height;
        ctx.moveTo(x + 6, top);
        ctx.arc(x, top, 6, 0, Math.PI * 2);
        ctx.moveTo(x, top + 6);
        ctx.lineTo(x, top + height * 0.6);
        ctx.lineTo(x - 7, 182);
        ctx.moveTo(x, top + height * 0.6);
        ctx.lineTo(x + 7, 182);
      });
    person(52, 52, "#35507a");
    person(82, 46, "#8a3a3a");
    person(106, 30, "#b56a2a");
    crayon("#555", 2, () => {
      ctx.moveTo(52, 150);
      ctx.lineTo(82, 150);
      ctx.lineTo(106, 164);
    });
  }
  drawingTexture = new CanvasTexture(canvas);
  drawingTexture.colorSpace = SRGBColorSpace;
  return drawingTexture;
}

/** Desenho de criança preso na parede, um pouco torto. */
function Drawing() {
  const texture = useMemo(() => getDrawingTexture(), []);
  return (
    <mesh position={[0, FLOOR + 1.55, 0.02]} rotation-z={0.05}>
      <planeGeometry args={[0.42, 0.32]} />
      <meshLambertMaterial map={texture} />
    </mesh>
  );
}

const TABLE_TOP = 0.74;

/** Mesa posta para três: pratos, duas cadeiras de pé e uma caída. */
function Table() {
  const legs: [number, number][] = [
    [-0.62, -0.33],
    [0.62, -0.33],
    [-0.62, 0.33],
    [0.62, 0.33],
  ];
  const plates: [number, number][] = [
    [-0.45, -0.22],
    [0.45, -0.22],
    [0, 0.24],
  ];
  return (
    <group position={[0, FLOOR, 0]}>
      <mesh position={[0, TABLE_TOP, 0]}>
        <boxGeometry args={[1.4, 0.06, 0.8]} />
        <meshLambertMaterial color="#5e4a36" flatShading />
      </mesh>
      {legs.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, TABLE_TOP / 2, z]}>
          <boxGeometry args={[0.07, TABLE_TOP, 0.07]} />
          <meshLambertMaterial color="#4d3c2b" />
        </mesh>
      ))}
      {plates.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, TABLE_TOP + 0.04, z]}>
          <cylinderGeometry args={[0.12, 0.1, 0.02, 14]} />
          <meshLambertMaterial color="#b9b1a0" />
        </mesh>
      ))}
      <Chair position={[-0.45, 0, -0.62]} rotation={0} />
      <Chair position={[0.45, 0, -0.6]} rotation={0.15} />
      {/* A terceira cadeira, caída de costas no chão. */}
      <group position={[0.1, 0.24, 0.95]} rotation={[-Math.PI / 2 + 0.1, 0.4, 0]}>
        <Chair position={[0, 0, 0]} rotation={Math.PI} />
      </group>
    </group>
  );
}

function Chair({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[0.42, 0.05, 0.42]} />
        <meshLambertMaterial color="#5a4633" flatShading />
      </mesh>
      <mesh position={[0, 0.7, -0.19]}>
        <boxGeometry args={[0.42, 0.5, 0.04]} />
        <meshLambertMaterial color="#5a4633" flatShading />
      </mesh>
      {CHAIR_LEGS.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.21, z]}>
          <boxGeometry args={[0.04, 0.42, 0.04]} />
          <meshLambertMaterial color="#4a3a2a" />
        </mesh>
      ))}
    </group>
  );
}

const CHAIR_LEGS = [
  [-0.18, -0.18],
  [0.18, -0.18],
  [-0.18, 0.18],
  [0.18, 0.18],
] as const;

/** Cavalinho de madeira no parapeito, olhando para fora (para a colina). */
function ToyHorse() {
  const wood = "#9a7650";
  return (
    <group position={[0, HOUSE_WINDOW.sill, 0]} scale={1.3}>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[0.06, 0.05, 0.14]} />
        <meshLambertMaterial color={wood} flatShading />
      </mesh>
      <mesh position={[0, 0.12, 0.07]} rotation-x={-0.5}>
        <boxGeometry args={[0.04, 0.07, 0.04]} />
        <meshLambertMaterial color={wood} flatShading />
      </mesh>
      {[
        [-0.02, -0.05],
        [0.02, -0.05],
        [-0.02, 0.05],
        [0.02, 0.05],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.025, z]}>
          <boxGeometry args={[0.015, 0.05, 0.015]} />
          <meshLambertMaterial color="#7d5e3e" />
        </mesh>
      ))}
    </group>
  );
}

/** A janela é parte da casa; aqui só existe o ponto de interação. */
function WindowView() {
  return <></>;
}

interface PoiVisualConfig {
  Visual: (props: VisualProps) => React.JSX.Element;
  /** Altura do alvo de interação acima da base (m). */
  targetHeight: number;
  /** Raio do alvo para a mira (m). */
  targetRadius: number;
  /** Alcance da interação (m). */
  reach: number;
  /** Raio da clareira na grama em volta (m), para o objeto se destacar. */
  clearing: number;
}

export const poiVisuals: Record<PoiKind, PoiVisualConfig> = {
  horseshoe: { Visual: Horseshoe, targetHeight: 0.05, targetRadius: 0.4, reach: 2.4, clearing: 1.4 },
  fence: { Visual: Fence, targetHeight: 0.7, targetRadius: 0.6, reach: 2.8, clearing: 1.4 },
  cairn: { Visual: Cairn, targetHeight: 0.45, targetRadius: 0.6, reach: 2.8, clearing: 1.8 },
  flowers: { Visual: Flowers, targetHeight: 0.55, targetRadius: 1.3, reach: 3.2, clearing: 2.4 },
  boulder: { Visual: Boulder, targetHeight: 0.6, targetRadius: 1.4, reach: 3.6, clearing: 2.6 },
  gate: { Visual: Gate, targetHeight: 0.8, targetRadius: 1.3, reach: 3.2, clearing: 2.4 },
  // Dentro da casa: a grama é removida pela própria casa (clearing 0 = nenhuma extra).
  drawing: { Visual: Drawing, targetHeight: FLOOR + 1.55, targetRadius: 0.35, reach: 2.4, clearing: 0 },
  table: { Visual: Table, targetHeight: FLOOR + 0.8, targetRadius: 0.7, reach: 2.6, clearing: 0 },
  "toy-horse": { Visual: ToyHorse, targetHeight: HOUSE_WINDOW.sill + 0.1, targetRadius: 0.25, reach: 2.2, clearing: 0 },
  window: { Visual: WindowView, targetHeight: FLOOR + 1.5, targetRadius: 0.55, reach: 2.8, clearing: 0 },
  // No labirinto: o chão é de terra batida, sem grama para abrir.
  note: { Visual: Note, targetHeight: 0.3, targetRadius: 0.4, reach: 2.4, clearing: 0 },
};
