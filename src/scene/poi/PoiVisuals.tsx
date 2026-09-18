import { useLayoutEffect, useMemo, useRef } from "react";
import { Object3D, type InstancedMesh } from "three";
import type { PointOfInterest } from "@/content";
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
};
