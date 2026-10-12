import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  Object3D,
  type InstancedMesh,
  type PointLight,
  type PointsMaterial,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getQualitySettings } from "@/game/config/quality";
import { useGameStore } from "@/game/state/gameStore";
import { createRandom } from "@/game/world/noise";
import { REFUGE, refugeHedge } from "@/game/world/refuge";
import { terrainHeight } from "@/game/world/terrain";
import { prefersReducedMotion } from "@/lib/motion";
import { Grass } from "./Grass";
import { GroundShadow } from "./GroundShadow";

// O refúgio, no fundo da concha: o único lugar do Além que parece cuidado.
// Tudo o que o resto da colina não tem — cor viva, flor, sombra de árvore,
// luz morna parada no ar — está aqui, num espaço pequeno o bastante para
// caber três pessoas. As posições vêm de game/world/refuge.ts.

const { center, tree } = REFUGE;
const dummy = new Object3D();

/** Grama do refúgio: mais verde, mais alta na cor, dourada na ponta. */
const GRASS = { base: "#2d3d17", tip: "#c2b863", dry: "#d8c47e", far: "#7d7038", radius: 16, share: 0.2 } as const;

/** Onde a grama se abre: debaixo dos dois, no tronco e onde a Aysha para. */
const GRASS_CLEARINGS = [
  { x: REFUGE.father[0], z: REFUGE.father[1], radius: 1.4 },
  { x: REFUGE.mother[0], z: REFUGE.mother[1], radius: 1.4 },
  { x: tree.x, z: tree.z, radius: 1.8 },
  { x: 44.5, z: -804.4, radius: 1.6 },
] as const;

/**
 * A árvore pequena: tronco curto e torto, copa redonda e baixa, com flores
 * claras salpicadas. É o contrário da árvore do cume — aquela é silhueta
 * contra o céu, esta é sombra para ficar embaixo.
 */
function RefugeTree() {
  const { trunk, canopy, blossoms } = useMemo(() => {
    const random = createRandom(17);
    const wood: BufferGeometry[] = [];
    const body = new CylinderGeometry(0.18, 0.34, 2.6, 7, 2);
    body.translate(0, 1.3, 0);
    body.rotateZ(0.08);
    wood.push(body);
    for (const [angle, tilt] of [
      [0.3, 0.8],
      [2.4, 0.7],
      [4.3, 0.9],
    ] as const) {
      const branch = new CylinderGeometry(0.07, 0.13, 1.8, 5);
      branch.translate(0, 0.9, 0);
      branch.rotateZ(tilt);
      branch.rotateY(angle);
      branch.translate(0.1, 2.2, 0);
      wood.push(branch);
    }

    const leaves: BufferGeometry[] = [];
    const flowers: [number, number, number][] = [];
    const blobs = [
      [0, 4.1, 0, 1.9],
      [-1.5, 3.6, 0.4, 1.4],
      [1.4, 3.7, -0.3, 1.5],
      [0.3, 3.5, 1.4, 1.3],
      [-0.2, 3.6, -1.4, 1.3],
      [0.1, 4.9, 0.2, 1.2],
    ] as const;
    for (const [x, y, z, radius] of blobs) {
      const blob = new IcosahedronGeometry(radius * (0.9 + random() * 0.2), 1);
      blob.scale(1, 0.8, 1);
      blob.translate(x, y, z);
      leaves.push(blob);
      for (let i = 0; i < 14; i++) {
        const theta = random() * Math.PI * 2;
        const phi = Math.acos(random() * 1.6 - 0.6);
        flowers.push([
          x + Math.sin(phi) * Math.cos(theta) * radius * 0.95,
          y + Math.cos(phi) * radius * 0.8,
          z + Math.sin(phi) * Math.sin(theta) * radius * 0.95,
        ]);
      }
    }

    const merged = { trunk: mergeGeometries(wood), canopy: mergeGeometries(leaves), blossoms: flowers };
    [...wood, ...leaves].forEach((part) => part.dispose());
    return merged;
  }, []);
  useEffect(
    () => () => {
      trunk.dispose();
      canopy.dispose();
    },
    [trunk, canopy],
  );

  const blossomsRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = blossomsRef.current;
    if (!mesh) return;
    blossoms.forEach(([x, y, z], index) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(index, index * 0.7, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [blossoms]);

  const y = terrainHeight(tree.x, tree.z) - 0.2;
  return (
    <group position={[tree.x, y, tree.z]} rotation-y={0.6}>
      <mesh geometry={trunk}>
        <meshLambertMaterial color="#5b4430" flatShading />
      </mesh>
      <mesh geometry={canopy}>
        <meshLambertMaterial color="#6f8a3a" emissive="#1f2408" flatShading />
      </mesh>
      <instancedMesh ref={blossomsRef} args={[undefined, undefined, blossoms.length]} frustumCulled={false}>
        <icosahedronGeometry args={[0.08, 0]} />
        <meshLambertMaterial color="#fbeedd" emissive="#4a3a28" flatShading />
      </instancedMesh>
    </group>
  );
}

/** Quantos tufos formam cada arbusto da cerca viva. */
const TUFTS_PER_BUSH = 3;

/** A cerca viva: arbustos redondos em arco, fechando o lado norte (1 draw call). */
function Hedge() {
  const bushes = useMemo(() => refugeHedge(), []);
  const ref = useRef<InstancedMesh>(null);
  const count = bushes.length * TUFTS_PER_BUSH;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const random = createRandom(59);
    const tint = new Color();
    let index = 0;
    for (const bush of bushes) {
      for (let tuft = 0; tuft < TUFTS_PER_BUSH; tuft++) {
        const x = bush.x + (random() - 0.5) * bush.size;
        const z = bush.z + (random() - 0.5) * bush.size;
        const size = bush.size * (0.7 + random() * 0.4);
        dummy.position.set(x, terrainHeight(x, z) + size * 0.55, z);
        dummy.rotation.set(0, random() * Math.PI, 0);
        dummy.scale.set(size, size * 0.85, size);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        mesh.setColorAt(index, tint.set("#56702e").offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.08));
        index++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bushes]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}

/** Canteiros: flores de três cores nas beiradas do patamar, nunca no meio. */
const FLOWER_COLORS = ["#f2d256", "#f7f1e4", "#e8a3a0", "#c9a3e0"] as const;
const FLOWER_COUNT = 320;
/** Quanto os canteiros descem pelos lados, além da metade norte (rad). */
const FLOWER_SPILL = 0.35;

function FlowerBeds() {
  const stemsRef = useRef<InstancedMesh>(null);
  const headsRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const stems = stemsRef.current;
    const heads = headsRef.current;
    if (!stems || !heads) return;
    const random = createRandom(211);
    const tint = new Color();
    for (let i = 0; i < FLOWER_COUNT; i++) {
      // Numa faixa entre 5 e 12 m do centro, e mais para os lados e o fundo:
      // o caminho de quem chega (o sul) fica livre.
      const angle = -Math.PI - FLOWER_SPILL + random() * (Math.PI + 2 * FLOWER_SPILL);
      const radius = 5 + Math.sqrt(random()) * 7;
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;
      const ground = terrainHeight(x, z);
      const height = 0.35 + random() * 0.35;

      dummy.position.set(x, ground + height / 2, z);
      dummy.rotation.set((random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, ground + height, z);
      dummy.rotation.set(0, random() * Math.PI, 0);
      dummy.scale.setScalar(0.8 + random() * 0.6);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
      heads.setColorAt(i, tint.set(FLOWER_COLORS[Math.floor(random() * FLOWER_COLORS.length)]));
    }
    stems.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  }, []);

  return (
    <>
      <instancedMesh ref={stemsRef} args={[undefined, undefined, FLOWER_COUNT]} frustumCulled={false}>
        <cylinderGeometry args={[0.008, 0.012, 1, 4]} />
        <meshLambertMaterial color="#4f6a2a" />
      </instancedMesh>
      <instancedMesh ref={headsRef} args={[undefined, undefined, FLOWER_COUNT]} frustumCulled={false}>
        <icosahedronGeometry args={[0.055, 0]} />
        <meshLambertMaterial emissive="#2a1f0a" flatShading />
      </instancedMesh>
    </>
  );
}

/** Um banco baixo de tronco partido, virado para a árvore: alguém sentava aqui. */
function Bench() {
  const [x, z] = [38.6, -807.2];
  const y = terrainHeight(x, z);
  return (
    <group position={[x, y, z]} rotation-y={-0.9}>
      {[-0.55, 0.55].map((offset) => (
        <mesh key={offset} position={[offset, 0.2, 0]}>
          <cylinderGeometry args={[0.16, 0.19, 0.4, 7]} />
          <meshLambertMaterial color="#5e4631" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.45, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.2, 0.2, 1.7, 8, 1, false, 0, Math.PI]} />
        <meshLambertMaterial color="#76593c" flatShading />
      </mesh>
    </group>
  );
}

const FIREFLY_COUNT = 70;

/**
 * Vaga-lumes: pontos mornos boiando devagar entre a grama e a copa. Ao
 * contrário da poeira de luz do resto do Além, que segue a câmera, estes
 * moram aqui — e ficam aqui quando ela vai embora.
 */
function Fireflies() {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const materialRef = useRef<PointsMaterial>(null);
  const { geometry, seeds } = useMemo(() => {
    const random = createRandom(5);
    const positions = new Float32Array(FIREFLY_COUNT * 3);
    const base: { x: number; y: number; z: number; phase: number; speed: number }[] = [];
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * 12;
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z - 2 + Math.sin(angle) * radius;
      base.push({ x, y: terrainHeight(x, z) + 0.4 + random() * 2.6, z, phase: random() * Math.PI * 2, speed: 0.2 + random() * 0.35 });
      positions.set([x, base[i].y, z], i * 3);
    }
    const created = new BufferGeometry();
    created.setAttribute("position", new BufferAttribute(positions, 3));
    return { geometry: created, seeds: base };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const material = materialRef.current;
    if (material) material.opacity = 0.65 + Math.sin(time * 0.9) * 0.2;
    if (reduced) return;
    const positions = geometry.getAttribute("position") as BufferAttribute;
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const seed = seeds[i];
      const t = time * seed.speed + seed.phase;
      positions.setXYZ(i, seed.x + Math.sin(t) * 0.8, seed.y + Math.sin(t * 1.7) * 0.35, seed.z + Math.cos(t * 0.8) * 0.8);
    }
    positions.needsUpdate = true;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={materialRef}
        color="#ffcf7a"
        size={0.11}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/** Intensidade da luz debaixo da árvore: antes e depois de os dois aparecerem. */
const GLOW = { quiet: 2.5, gathered: 7 } as const;
/** Onde a luz mora: rente ao chão, entre os dois, e não dentro da copa. */
const GLOW_AT = { x: (REFUGE.father[0] + REFUGE.mother[0]) / 2, z: (REFUGE.father[1] + REFUGE.mother[1]) / 2 - 1.2 };

/**
 * Uma luz morna parada debaixo da copa. Quando os dois aparecem, ela se
 * adensa — é assim que a cena os apresenta: não entram, a luz junta e eles
 * estão ali.
 *
 * Fica baixa e perto deles de propósito: no alto, acendia a copa por baixo
 * como uma lâmpada. Aqui ela toca os dois e a grama em volta, e mais nada.
 */
function WarmGlow() {
  const lightRef = useRef<PointLight>(null);
  const y = terrainHeight(GLOW_AT.x, GLOW_AT.z) + 1.3;

  useFrame(({ clock }, delta) => {
    const light = lightRef.current;
    if (!light) return;
    const gathered = useGameStore.getState().flags.includes("parents-found");
    const target = (gathered ? GLOW.gathered : GLOW.quiet) * (1 + Math.sin(clock.elapsedTime * 0.7) * 0.05);
    light.intensity += (target - light.intensity) * (1 - Math.exp(-delta * 0.8));
  });

  return <pointLight ref={lightRef} position={[GLOW_AT.x, y, GLOW_AT.z]} color="#ffb366" intensity={GLOW.quiet} distance={9} decay={2} />;
}

/** O refúgio inteiro. Montado pela zona da encosta, no fundo da concha. */
export function Refuge() {
  const quality = getQualitySettings();
  return (
    <>
      <Grass
        count={Math.round(quality.grassBlades * GRASS.share)}
        radius={GRASS.radius}
        centerX={center.x}
        centerZ={center.z}
        seed={311}
        clearings={GRASS_CLEARINGS}
        baseColor={GRASS.base}
        tipColor={GRASS.tip}
        dryColor={GRASS.dry}
        farColor={GRASS.far}
        cull
      />
      <RefugeTree />
      <GroundShadow x={tree.x} z={tree.z} radius={3.4} opacity={0.3} />
      <Hedge />
      <FlowerBeds />
      <Bench />
      <Fireflies />
      <WarmGlow />
    </>
  );
}
