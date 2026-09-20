"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { memoryAudio } from "@/audio/memoryAudio";
import { memories, type Memory, type MemoryId, type MemoryTone } from "@/content";
import { fragmentDuration, fragmentTone, isLastFragment, memoryTones } from "@/game/memory/memoryLogic";
import { useGameStore } from "@/game/state/gameStore";
import { prefersReducedMotion } from "@/lib/motion";
import { ADVANCE_KEYS, useKeyPress } from "../useKeyPress";

/** Mostra a memória ativa, se houver. Uma instância nova por memória. */
export function MemoryOverlay() {
  const id = useGameStore((state) => state.activeMemory?.id ?? null);
  if (!id) return null;
  return <MemorySequence key={id} id={id} />;
}

type Stage = "entering" | "showing" | "leaving";

/** Aparência de cada clima de lembrança (classes literais: o Tailwind as lê aqui). */
const tones: Record<
  MemoryTone,
  {
    veil: string;
    shade: string;
    leak: string;
    flash: string;
    label: string;
    title: string;
    voice: string;
    soft: string;
    narration: string;
    dotOn: string;
    dotOff: string;
  }
> = {
  // Dourada, afetiva: sépia quente e uma luz vazando pelo canto, como um filme antigo.
  warm: {
    veil: "backdrop-blur-[6px] backdrop-brightness-90 backdrop-contrast-90 backdrop-sepia-75 backdrop-saturate-125",
    shade: "bg-[radial-gradient(ellipse_at_center,rgba(140,95,35,0.14)_0%,rgba(22,12,3,0.8)_100%)]",
    leak: "bg-[radial-gradient(circle_at_85%_12%,rgba(255,200,120,0.35),transparent_45%)]",
    flash: "bg-[#f7ecd6]",
    label: "text-amber-100/55",
    title: "text-amber-50/75",
    voice: "text-amber-100",
    soft: "text-amber-50/80",
    narration: "text-stone-100",
    dotOn: "bg-amber-100/70",
    dotOff: "bg-amber-100/20",
  },
  // Fria, dolorosa: quase sem cor, escura.
  cold: {
    veil: "backdrop-blur-[6px] backdrop-brightness-75 backdrop-grayscale-80",
    shade: "bg-[radial-gradient(ellipse_at_center,rgba(40,55,70,0.12)_0%,rgba(4,6,10,0.85)_100%)]",
    leak: "",
    flash: "bg-[#dfe6ee]",
    label: "text-slate-200/45",
    title: "text-slate-100/70",
    voice: "text-slate-100",
    soft: "text-slate-200/75",
    narration: "text-slate-50",
    dotOn: "bg-slate-200/70",
    dotOff: "bg-slate-200/15",
  },
};

/**
 * Sequência de uma memória:
 *   entrada (clarão → mundo velado) → fragmentos um a um → saída (clarão →
 *   mundo normal) → `completeMemory()` devolve o controle.
 *
 * Uma memória pode virar de clima no meio (um fragmento com `tone`): aí os
 * véus se cruzam, o som troca de acorde e leva uma batida (audio/memoryAudio),
 * e a luz e a câmera da cena acompanham pelo estado (scene/world/Lighting,
 * scene/memory/MemoryCamera).
 * O conteúdo vem de `content/memories.ts`; nada aqui é específico de uma memória.
 */
function MemorySequence({ id }: { id: MemoryId }) {
  const memory: Memory = memories[id];
  const fragmentIndex = useGameStore((state) => state.activeMemory?.fragment ?? 0);
  const advanceMemory = useGameStore((state) => state.advanceMemory);
  const completeMemory = useGameStore((state) => state.completeMemory);

  const rootRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<gsap.Context | null>(null);
  const [stage, setStage] = useState<Stage>("entering");

  const usedTones = useMemo(() => memoryTones(memory), [memory]);
  const tone = fragmentTone(memory, fragmentIndex);
  const look = tones[tone];

  // Entrada, no clima do primeiro fragmento.
  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    const context = gsap.context(() => {
      gsap
        .timeline({ onComplete: () => setStage("showing") })
        .fromTo(
          "[data-memory-flash]",
          { autoAlpha: 0 },
          { autoAlpha: reduced ? 0 : 0.92, duration: reduced ? 0 : 0.45, ease: "power2.in" },
        )
        .set(`[data-memory-veil="${usedTones[0]}"]`, { autoAlpha: 1 })
        .to("[data-memory-flash]", { autoAlpha: 0, duration: reduced ? 0.2 : 1.2, ease: "power2.out" })
        .fromTo("[data-memory-content]", { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.2 : 1 }, reduced ? ">" : "-=0.7");
    }, rootRef);
    contextRef.current = context;
    return () => context.revert();
  }, [usedTones]);

  // O leito sonoro acompanha a sequência inteira.
  useEffect(() => {
    memoryAudio.start(fragmentTone(memory, 0));
    return () => memoryAudio.stop(0.4);
  }, [memory]);

  // Virada de clima: os véus se cruzam sob um clarão curto, e o som vira junto.
  const previousTone = useRef(tone);
  useEffect(() => {
    const from = previousTone.current;
    if (from === tone) return;
    previousTone.current = tone;
    memoryAudio.setTone(tone);
    memoryAudio.strike(tone);

    const reduced = prefersReducedMotion();
    contextRef.current?.add(() => {
      gsap
        .timeline()
        .to("[data-memory-flash]", { autoAlpha: reduced ? 0 : 0.5, duration: reduced ? 0 : 0.16, ease: "power2.in" })
        .to(`[data-memory-veil="${from}"]`, { autoAlpha: 0, duration: reduced ? 0.2 : 1 }, reduced ? ">" : "-=0.04")
        .fromTo(`[data-memory-veil="${tone}"]`, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0.2 : 1 }, "<")
        .to("[data-memory-flash]", { autoAlpha: 0, duration: reduced ? 0.2 : 1.2, ease: "power2.out" }, "<");
    });
  }, [tone]);

  // Saída: só depois dela a memória é registrada e o controle volta.
  const leave = () => {
    setStage("leaving");
    const reduced = prefersReducedMotion();
    memoryAudio.stop(reduced ? 0.3 : 1.6);
    contextRef.current?.add(() => {
      gsap
        .timeline({ onComplete: completeMemory })
        .to("[data-memory-content]", { autoAlpha: 0, duration: reduced ? 0.15 : 0.5 })
        .to("[data-memory-flash]", { autoAlpha: reduced ? 0 : 0.8, duration: reduced ? 0 : 0.35, ease: "power2.in" })
        .set(`[data-memory-veil="${tone}"]`, { autoAlpha: 0 })
        .to("[data-memory-flash]", { autoAlpha: 0, duration: reduced ? 0.15 : 0.9, ease: "power2.out" });
    });
  };

  const isLast = isLastFragment(memory, fragmentIndex);
  const handleAdvance = () => {
    if (stage !== "showing") return;
    if (isLast) leave();
    else advanceMemory();
  };
  useKeyPress(stage === "showing", ADVANCE_KEYS, handleAdvance);

  // Memórias em reprodução automática avançam sozinhas (E ainda adianta).
  const advanceRef = useRef(handleAdvance);
  useEffect(() => {
    advanceRef.current = handleAdvance;
  });
  const duration = fragmentDuration(memory, fragmentIndex);
  useEffect(() => {
    if (!memory.autoplay || stage !== "showing") return;
    const timer = setTimeout(() => advanceRef.current(), duration * 1000);
    return () => clearTimeout(timer);
  }, [memory.autoplay, stage, fragmentIndex, duration]);

  const fragment = memory.fragments[fragmentIndex];
  const isVoice = fragment.kind === "voice";
  const textStyle = fragment.soft
    ? `text-[clamp(1.1rem,2vw,1.5rem)] tracking-[0.04em] italic ${look.soft}`
    : isVoice
      ? `text-[clamp(1.35rem,2.6vw,2rem)] italic ${look.voice}`
      : `text-[clamp(1.35rem,2.6vw,2rem)] font-light ${look.narration}`;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={`Lembrança: ${memory.title}`}
      onClick={handleAdvance}
      className="pointer-events-auto absolute inset-0 cursor-pointer overflow-hidden"
    >
      {/* O mundo continua ali atrás, velado pelo clima da lembrança. Um véu por
          clima: a virada é o cruzamento entre dois deles. */}
      {usedTones.map((veilTone) => (
        <div
          key={veilTone}
          data-memory-veil={veilTone}
          className={`invisible absolute inset-0 overflow-hidden ${tones[veilTone].veil}`}
        >
          <div className={`absolute inset-0 ${tones[veilTone].shade}`} />
          {tones[veilTone].leak && <div className={`hill-glow absolute inset-0 mix-blend-screen ${tones[veilTone].leak}`} />}
          <div className="film-grain" />
        </div>
      ))}

      <div data-memory-content className="invisible relative flex h-full flex-col items-center justify-center px-6 text-center">
        <p className={`text-[0.65rem] tracking-[0.45em] uppercase transition-colors duration-1000 ${look.label}`}>Lembrança</p>
        <p className={`mt-2 font-serif text-lg italic transition-colors duration-1000 ${look.title}`}>{memory.title}</p>

        {/* key: cada fragmento entra com a própria animação. */}
        <p
          key={fragmentIndex}
          aria-live="polite"
          className={`mt-12 max-w-2xl font-serif leading-relaxed animate-[memory-fragment-in_1.4s_ease-out] motion-reduce:animate-none ${textStyle}`}
        >
          {isVoice ? `“${fragment.text}”` : fragment.text}
        </p>

        <div aria-hidden className="mt-12 flex gap-2">
          {memory.fragments.map((_, index) => (
            <span
              key={index}
              className={`size-1 rounded-full transition-colors duration-700 ${index <= fragmentIndex ? look.dotOn : look.dotOff}`}
            />
          ))}
        </div>

        {/* Em reprodução automática não há instrução: só a lembrança. */}
        {!memory.autoplay && (
          <p
            className={`absolute bottom-[10vh] text-[0.65rem] tracking-[0.3em] text-stone-300/60 uppercase transition-opacity duration-700 ${
              stage === "showing" ? "opacity-100" : "opacity-0"
            }`}
          >
            {isLast ? "[ E ] voltar" : "[ E ] continuar"}
          </p>
        )}
      </div>

      <div data-memory-flash className={`pointer-events-none invisible absolute inset-0 ${look.flash}`} />
    </div>
  );
}
