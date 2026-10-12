import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { markSceneReady } from "@/game/loading/sceneReady";

/**
 * Avisa a tela de carregamento quando o mundo pode aparecer. Deve ser o último
 * filho da cena: o efeito dele roda com terreno, grama e zona já montados.
 *
 * Compila os shaders antes de avisar, e de forma assíncrona — o navegador
 * compila em paralelo e a animação da tela de carregamento não engasga. Sem
 * isto a compilação cairia no primeiro quadro do jogo, bem no começo da
 * abertura.
 */
export function SceneReady() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (cancelled) return;
      // Um quadro desenhado por baixo da tela inicial, e só então o aviso.
      invalidate();
      requestAnimationFrame(() => requestAnimationFrame(markSceneReady));
    };
    // Se a compilação antecipada falhar, o jogo segue: ela acontece no 1º quadro.
    gl.compileAsync(scene, camera).then(done, done);
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, invalidate]);

  return null;
}
