"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { guidePassages, guideSteps } from "@/content";
import { arrowAngle, currentGuide, resolveTarget } from "@/game/guide/guide";
import { playerView } from "@/game/player/playerView";
import { selectCanControl, useGameStore } from "@/game/state/gameStore";
import { useKeyPress } from "../useKeyPress";

const shadow = "[text-shadow:0_1px_10px_rgba(0,0,0,0.7)]";

/** Esconde e mostra o roteiro. */
const GUIDE_KEYS: ReadonlySet<string> = new Set(["KeyH"]);

/** A seta se atualiza 10 vezes por segundo: basta, e não renderiza nada. */
const ARROW_INTERVAL = 100;
/** Mais perto que isto (m), a seta dá lugar a "aqui perto". */
const NEAR = 3;

/** O que dizer enquanto uma máquina aperta: vem antes de qualquer passo. */
const threatTips = {
  detect: {
    title: "A máquina notou você",
    hint: "Afaste-se dela agora. Se o olho ficar vermelho, corra.",
  },
  chase: {
    title: "Corra! Segure Shift",
    hint: "Ela é mais lenta que a sua corrida. Dentro da casa ou no meio das paredes do labirinto ela perde você.",
  },
} as const;

/**
 * O roteiro: no canto da tela, o que fazer agora e para que lado fica. Diz a
 * direção, não a resposta — o que acontece em cada lugar continua sendo do
 * jogo. Some enquanto a Aysha não pode andar (conversa, lembrança, cena) e
 * pode ser escondido com H.
 */
export function GuideHint() {
  const zone = useGameStore((state) => state.zone);
  const flags = useGameStore((state) => state.flags);
  const seenDialogues = useGameStore((state) => state.seenDialogues);
  const recoveredMemories = useGameStore((state) => state.recoveredMemories);
  const threat = useGameStore((state) => state.threat);
  const canControl = useGameStore(selectCanControl);
  const [open, setOpen] = useState(true);
  useKeyPress(canControl, GUIDE_KEYS, () => setOpen((value) => !value));

  const context = useMemo(() => ({ flags, seenDialogues, recoveredMemories }), [flags, seenDialogues, recoveredMemories]);
  const guide = useMemo(() => currentGuide(guideSteps, guidePassages, zone, context), [zone, context]);
  const tip = threat === "calm" ? null : threatTips[threat];
  const target = tip ? undefined : guide?.target;

  const directionRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const distanceRef = useRef<HTMLSpanElement>(null);

  // A seta segue a Aysha fora do React: a posição muda a cada quadro, e passar
  // isso pelo estado renderizaria a interface inteira junto.
  useEffect(() => {
    const row = directionRef.current;
    if (!target || !open || !row) return;
    let turned = 0;
    const update = () => {
      const direction = playerView.tracked ? resolveTarget(target, playerView.x, playerView.z, context) : null;
      row.style.opacity = direction ? "1" : "0";
      if (!direction || !arrowRef.current || !distanceRef.current) return;
      const near = direction.distance < NEAR;
      const angle = arrowAngle(playerView.x, playerView.z, playerView.yaw, direction.x, direction.z);
      // Soma só a diferença mais curta: sem isso, ao cruzar as costas a seta daria a volta inteira.
      turned += Math.atan2(Math.sin(angle - turned), Math.cos(angle - turned));
      arrowRef.current.style.opacity = near ? "0.25" : "1";
      arrowRef.current.style.transform = `rotate(${turned}rad)`;
      distanceRef.current.textContent = near ? "aqui perto" : `${Math.round(direction.distance)} m`;
    };
    update();
    const timer = setInterval(update, ARROW_INTERVAL);
    return () => clearInterval(timer);
  }, [target, open, context]);

  const shown = tip ?? guide;
  const visible = canControl && shown !== null;

  return (
    <aside
      aria-label="Roteiro"
      aria-hidden={!visible}
      className={`absolute top-[5vh] left-[4vw] w-[min(22rem,80vw)] text-stone-100 transition-opacity duration-700 ${shadow} ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {shown && !open && <p className="text-[0.65rem] tracking-[0.3em] text-stone-200/60 uppercase">H · mostrar o roteiro</p>}
      {shown && open && (
        <div className="bg-[radial-gradient(closest-side,rgba(8,6,4,0.42)_0%,rgba(8,6,4,0.24)_60%,transparent_100%)] px-5 py-4 -mx-5 -my-4">
          <p className={`text-[0.65rem] tracking-[0.3em] uppercase ${tip ? "text-orange-200/90" : "text-stone-200/70"}`}>
            {tip ? "Cuidado" : "O que fazer agora"}
          </p>
          <p role="status" aria-live="polite" className="mt-1.5 font-serif text-xl leading-snug font-light tracking-[0.03em] italic">
            {shown.title}
            {guide?.tally && !tip && (
              <span className="ml-2 font-sans text-xs tracking-[0.2em] text-stone-200/70 not-italic">
                {guide.tally.done} de {guide.tally.of}
              </span>
            )}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-200/85">{shown.hint}</p>
          {target && (
            <div ref={directionRef} style={{ opacity: 0 }} className="mt-3 flex items-center gap-3 transition-opacity duration-300">
              <span className="flex size-9 items-center justify-center rounded-full border border-stone-100/40 bg-black/25">
                <svg ref={arrowRef} viewBox="0 0 24 24" aria-hidden className="size-5 fill-stone-50 transition-transform duration-150 ease-linear">
                  <path d="M12 3 19 20 12 16 5 20Z" />
                </svg>
              </span>
              <span ref={distanceRef} className="text-xs tracking-[0.25em] text-stone-100/90 uppercase" />
              <span className="text-[0.65rem] tracking-[0.25em] text-stone-200/50 uppercase">· H esconder</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
