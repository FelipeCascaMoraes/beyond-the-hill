import { useEffect, useMemo, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Box3, Mesh, Vector3, type Group, type Material } from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { assetManifest, type ModelId } from "@/assets/manifest";
import type { CharacterModelConfig } from "@/content";

// Personagens em modelo 3D (GLB com esqueleto). Um componente só para todos:
// o que muda de um para outro são dados (content/characterModels.ts).

/** O que o personagem está fazendo. Cada arquivo traz as animações que tiver. */
export type CharacterAnimation = "idle" | "walk" | "talk";

/**
 * Como reconhecer cada animação pelo nome do clipe. Os nomes variam com a
 * ferramenta que exportou ("Idle", "mixamo.com|Breathing Idle", "Walking"...),
 * então basta o clipe conter uma destas palavras.
 */
const CLIP_NAMES: Record<CharacterAnimation, RegExp> = {
  idle: /idle|breath|stand|parad/i,
  walk: /walk|andar|caminh/i,
  talk: /talk|speak|fala/i,
};

/** Quanto leva a passagem de uma animação para outra (s). */
const CROSS_FADE = 0.35;

/** Sem compressão Draco (o decodificador viria de um servidor externo); com Meshopt, que vai junto no jogo. */
const useModel = (model: ModelId) => useGLTF(assetManifest.models[model], false, true);

const size = new Vector3();
const middle = new Vector3();

/**
 * Baixa um modelo antes de ele ser preciso. Montado junto com o mundo, dentro
 * da espera da tela de carregamento: quando o personagem aparecer — mesmo no
 * meio do jogo — o arquivo já está na memória e nada pisca.
 */
export function PreloadCharacterModel({ model }: { model: ModelId }) {
  useModel(model);
  return null;
}

interface CharacterModelProps {
  /** Qual arquivo, em que altura (content/characterModels.ts). */
  config: CharacterModelConfig;
  animation?: CharacterAnimation;
}

/**
 * Um personagem em modelo 3D, de pé na origem do grupo pai e virado para +Z —
 * o mesmo contrato das figuras de primitivas, para um poder ficar no lugar do
 * outro sem que o resto do jogo (posição, colisão, interação, diálogo) saiba.
 *
 * O arquivo pode vir em qualquer escala e com a origem em qualquer lugar: o
 * modelo é medido e posto com os pés no chão, centrado, na altura declarada.
 * Toca a animação pedida se o arquivo a tiver; sem ela, cai para a de parado;
 * sem nenhuma, fica na pose em que foi exportado.
 */
export function CharacterModel({ config, animation = "idle" }: CharacterModelProps) {

  const gltf = useModel(config.model);
  const rootRef = useRef<Group>(null);

  // Cada personagem em cena é uma cópia com esqueleto e materiais próprios: o
  // arquivo fica em cache e pode servir a mais de uma figura, e o apagar de
  // uma (ver Npc.tsx) não pode apagar as outras nem o original.
  const { model, materials, scale, offset } = useMemo(() => {
    const copy = cloneSkinned(gltf.scene);
    const owned: Material[] = [];
    copy.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const own = (material: Material) => {
        const cloned = material.clone();
        // Materiais que já nascem transparentes (cabelo em planos, cílios)
        // continuam assim depois de a figura terminar de aparecer.
        cloned.userData.keepTransparent = material.transparent;
        // A cena não tem mapa de ambiente, e metal sem o que refletir sai
        // preto. Tudo vira superfície fosca — pano, couro, pele —, que é o que
        // a luz do Além sabe iluminar.
        if ("metalness" in cloned) cloned.metalness = 0;
        owned.push(cloned);
        return cloned;
      };
      child.material = Array.isArray(child.material) ? child.material.map(own) : own(child.material);
    });

    copy.updateMatrixWorld(true);
    const box = new Box3().setFromObject(copy);
    box.getSize(size);
    box.getCenter(middle);
    const factor = size.y > 0 ? config.height / size.y : 1;
    return {
      model: copy,
      materials: owned,
      scale: factor,
      offset: [-middle.x * factor, -box.min.y * factor, -middle.z * factor] as const,
    };
  }, [gltf.scene, config.height]);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  const { actions, names } = useAnimations(gltf.animations, rootRef);

  useEffect(() => {
    const name = names.find((clip) => CLIP_NAMES[animation].test(clip)) ?? names.find((clip) => CLIP_NAMES.idle.test(clip));
    const action = name ? actions[name] : null;
    if (!action) return;
    action.reset().fadeIn(CROSS_FADE).play();
    return () => {
      action.fadeOut(CROSS_FADE);
    };
  }, [actions, names, animation]);

  return (
    <group ref={rootRef} rotation-y={config.rotationY ?? 0}>
      <group scale={scale} position={offset}>
        <primitive object={model} />
      </group>
    </group>
  );
}
