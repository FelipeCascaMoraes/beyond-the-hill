"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { audioManager } from "@/audio/audioManager";
import { isSceneReady, subscribeSceneReady } from "@/game/loading/sceneReady";
import { useGameStore } from "@/game/state/gameStore";
import { setCameraMode, type CameraMode } from "@/game/player/cameraMode";
import { prefersReducedMotion } from "@/lib/motion";
import { useCameraMode } from "../useCameraMode";
import { TitleBackdrop } from "./TitleBackdrop";

const TITLE_WORDS = ["BEYOND", "THE", "HILL"];
const LETTER_COUNT = TITLE_WORDS.join("").length;

/** Quando a primeira letra do título começa a aparecer, e o intervalo entre elas (s). */
const LETTERS_FROM = 0.2;
const LETTER_STAGGER = 0.06;

/** Em que ponto do título cada palavra começa, para o atraso de cada letra. */
const WORD_OFFSETS = TITLE_WORDS.map((_, index) => TITLE_WORDS.slice(0, index).join("").length);

/**
 * Tempo mínimo, desde a abertura da página, antes de trocar o carregamento
 * pelo menu (ms). Não atrasa o carregamento em si — ele corre em paralelo —,
 * só garante que o título termine de chegar e a frase possa ser lida numa
 * máquina em que tudo carrega num piscar.
 */
const MIN_LOADING = 2600;

const CAMERA_OPTIONS: readonly { mode: CameraMode; label: string }[] = [
  { mode: "first", label: "1ª pessoa" },
  { mode: "third", label: "3ª pessoa" },
];

/** O que só aparece quando o mundo está pronto. */
const MENU = "[data-title-hill], [data-title-divider], [data-title-subtitle], [data-title-start]";

interface TitleScreenProps {
  /** Chamado quando a transição termina e a tela pode ser desmontada. */
  onExited: () => void;
}

/**
 * A tela inicial, que é também a de carregamento: são a mesma tela em dois
 * momentos, e o título não sai do lugar entre um e outro.
 *
 *   carregando  — o título chega letra a letra, com uma frase e o aviso.
 *                 Só CSS: já vem no HTML e aparece antes de o JavaScript rodar.
 *   pronto      — a frase se desfaz; a colina sobe atrás, e entram o subtítulo
 *                 e o botão. O mundo já está gerado e compilado por baixo.
 *   começar     — o texto se dissolve e a tela se abre sobre a cena.
 */
export function TitleScreen({ onExited }: TitleScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<gsap.Context | null>(null);
  const [leaving, setLeaving] = useState(false);
  /** O aviso de carregamento já se desfez e pode sair da página. */
  const [loaded, setLoaded] = useState(false);
  const sceneReady = useSyncExternalStore(subscribeSceneReady, isSceneReady, () => false);
  const startGame = useGameStore((state) => state.startGame);
  const cameraMode = useCameraMode();

  useLayoutEffect(() => {
    const context = gsap.context(() => {}, rootRef);
    contextRef.current = context;
    return () => context.revert();
  }, []);

  // O mundo está pronto: o carregamento dá lugar ao menu.
  useEffect(() => {
    if (!sceneReady) return;
    const reveal = () => {
      contextRef.current?.add(() => {
        // As entradas em CSS já terminaram; daqui em diante quem anima é o GSAP.
        gsap.set("[data-title-loading] *", { animation: "none" });
        if (prefersReducedMotion()) {
          gsap.set("[data-title-loading]", { autoAlpha: 0 });
          gsap.set(MENU, { autoAlpha: 1 });
          setLoaded(true);
          return;
        }
        gsap
          .timeline({ defaults: { ease: "power2.out" } })
          .to("[data-title-loading]", { autoAlpha: 0, y: -6, duration: 0.9, ease: "power2.in", onComplete: () => setLoaded(true) }, 0)
          .fromTo("[data-title-hill]", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 3.4, ease: "power1.out" }, 0.2)
          .fromTo("[data-title-divider]", { autoAlpha: 0, scaleX: 0 }, { autoAlpha: 1, scaleX: 1, duration: 1.4, ease: "power3.inOut" }, 0.5)
          .fromTo("[data-title-subtitle]", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1.4 }, 0.9)
          .fromTo("[data-title-start]", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, 1.6);
      });
    };
    const timer = setTimeout(reveal, Math.max(0, MIN_LOADING - performance.now()));
    return () => clearTimeout(timer);
  }, [sceneReady]);

  // Saída: o texto se dissolve, a tela escurece e se abre sobre a cena 3D.
  const handleStart = () => {
    if (leaving) return;
    setLeaving(true);
    // Primeiro gesto do usuário: libera o áudio no navegador.
    audioManager.unlock();

    if (prefersReducedMotion()) {
      startGame();
      onExited();
      return;
    }

    contextRef.current?.add(() => {
      const center = (LETTER_COUNT - 1) / 2;
      // A entrada das letras é CSS: sai de cena para o GSAP poder movê-las.
      gsap.set("[data-title-letter]", { animation: "none" });
      gsap
        .timeline({ onComplete: onExited })
        .to("[data-title-start], [data-title-subtitle], [data-title-divider]", { autoAlpha: 0, duration: 0.8, ease: "power2.in" }, 0)
        .to(
          "[data-title-letter]",
          {
            x: (index: number) => (index - center) * 7,
            autoAlpha: 0,
            filter: "blur(8px)",
            duration: 1.8,
            ease: "power2.inOut",
          },
          0.1,
        )
        .to("[data-title-hill]", { autoAlpha: 0, y: 12, duration: 1.4, ease: "power2.in" }, 0.4)
        .add(startGame, 1.9)
        .to(rootRef.current, { autoAlpha: 0, duration: 2.6, ease: "power1.inOut" }, 2.1);
    });
  };

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 bg-[#050505] ${leaving ? "pointer-events-none" : "pointer-events-auto"}`}
    >
      <TitleBackdrop />

      <div className="relative flex h-full flex-col items-center justify-center px-4 pb-[12vh] text-center">
        <h1
          aria-label="Beyond the Hill"
          className="font-serif text-[clamp(2.25rem,min(7.5vw,11vh),5.5rem)] leading-[1.15] font-light pl-[0.2em] tracking-[0.2em] text-balance text-stone-100 sm:pl-[0.32em] sm:tracking-[0.32em]"
        >
          {TITLE_WORDS.map((word, wordIndex) => (
            <Fragment key={word}>
              {/* Espaço comum entre palavras: permite quebra de linha em telas estreitas. */}
              {wordIndex > 0 && " "}
              <span aria-hidden className="inline-block whitespace-nowrap">
                {word.split("").map((letter, index) => (
                  <span
                    key={index}
                    data-title-letter
                    style={{ animationDelay: `${(LETTERS_FROM + (WORD_OFFSETS[wordIndex] + index) * LETTER_STAGGER).toFixed(2)}s` }}
                    className="inline-block animate-[title-letter-in_1.5s_ease-out_backwards] will-change-transform motion-reduce:animate-none"
                  >
                    {letter}
                  </span>
                ))}
              </span>
            </Fragment>
          ))}
        </h1>

        <span
          data-title-divider
          aria-hidden
          className="invisible mt-[clamp(1rem,3vh,2rem)] block h-px w-24 bg-gradient-to-r from-transparent via-stone-300/50 to-transparent sm:w-40"
        />

        {/* Carregamento e menu ocupam a mesma célula: o título acima não se
            mexe quando um dá lugar ao outro. */}
        <div className="grid justify-items-center">
          {!loaded && (
            <div data-title-loading role="status" className="col-start-1 row-start-1 flex flex-col items-center">
              <p className="mt-[clamp(0.75rem,2.5vh,1.5rem)] animate-[loading-in_1.6s_ease-out_1s_backwards] font-serif text-[clamp(1.05rem,2.6vw,1.6rem)] leading-snug font-light tracking-[0.08em] text-stone-400 italic motion-reduce:animate-none">
                Algumas memórias encontram
                <br />o caminho de volta.
              </p>
              <p className="mt-[clamp(1.5rem,7vh,4rem)] flex animate-[loading-in_1.2s_ease-out_1.7s_backwards] items-center gap-4 text-xs font-light tracking-[0.45em] text-stone-400 motion-reduce:animate-none sm:text-sm">
                <span aria-hidden className="text-stone-600">
                  [
                </span>
                <span className="pl-[0.45em]">
                  carregando
                  <span aria-hidden>
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        style={{ animationDelay: `${dot * 0.25}s` }}
                        className="animate-[loading-dot_1.6s_ease-in-out_infinite] motion-reduce:animate-none"
                      >
                        .
                      </span>
                    ))}
                  </span>
                </span>
                <span aria-hidden className="text-stone-600">
                  ]
                </span>
              </p>
            </div>
          )}

          <div className="col-start-1 row-start-1 flex flex-col items-center">
            <p
              data-title-subtitle
              className="invisible mt-[clamp(0.75rem,2.5vh,1.5rem)] font-serif text-[clamp(1.05rem,2.6vw,1.6rem)] font-light tracking-[0.12em] text-stone-400 italic"
            >
              Além da Colina
            </p>

            <button
              type="button"
              data-title-start
              onClick={handleStart}
              disabled={leaving}
              className="group invisible mt-[clamp(1.5rem,9vh,5rem)] flex items-center gap-4 px-4 py-3 text-xs font-light tracking-[0.45em] text-stone-300 transition-colors duration-700 outline-none hover:text-stone-50 focus-visible:text-stone-50 sm:text-sm"
            >
              <span aria-hidden className="text-stone-500 transition-transform duration-700 group-hover:-translate-x-1.5 group-focus-visible:-translate-x-1.5">
                [
              </span>
              <span className="pl-[0.45em]">COMEÇAR</span>
              <span aria-hidden className="text-stone-500 transition-transform duration-700 group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5">
                ]
              </span>
            </button>

            {/* De onde ver a Aysha. Dá para trocar a qualquer momento, no jogo, com C. */}
            <div
              data-title-start
              role="radiogroup"
              aria-label="Câmera"
              className="invisible mt-[clamp(0.5rem,3vh,1.75rem)] flex items-center gap-4 text-[0.65rem] font-light tracking-[0.3em] text-stone-500 uppercase"
            >
              <span aria-hidden>Câmera</span>
              {CAMERA_OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  role="radio"
                  aria-checked={cameraMode === option.mode}
                  onClick={() => setCameraMode(option.mode)}
                  disabled={leaving}
                  className={`border-b pb-0.5 tracking-[0.3em] uppercase transition-colors duration-500 outline-none hover:text-stone-200 focus-visible:text-stone-200 ${
                    cameraMode === option.mode ? "border-stone-400/60 text-stone-200" : "border-transparent"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
