import { useEffect } from "react";
import { storyBeats, type StoryBeatId } from "@/content";
import { selectCanInteract, useGameStore } from "@/game/state/gameStore";
import { nextBeat } from "./beats";

type GameStoreState = ReturnType<typeof useGameStore.getState>;

/** Próximo momento, se o jogador estiver livre para recebê-lo. */
function pendingBeat(state: GameStoreState): StoryBeatId | null {
  if (state.phase !== "playing" || !selectCanInteract(state)) return null;
  return nextBeat(storyBeats, state.zone, state);
}

/**
 * Diretor narrativo: observa o estado do jogo e dispara os momentos de
 * `content/story.ts` quando as condições se cumprem, após um pequeno atraso.
 * Se o jogador ficar ocupado nesse intervalo, espera a próxima oportunidade.
 */
export function useStoryDirector(): void {
  useEffect(() => {
    let scheduled: StoryBeatId | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const evaluate = () => {
      const beat = pendingBeat(useGameStore.getState());
      if (beat === scheduled) return;
      clearTimeout(timer);
      scheduled = beat;
      if (!beat) return;
      timer = setTimeout(() => {
        scheduled = null;
        const state = useGameStore.getState();
        // Confere de novo: o jogador pode ter começado outra coisa no intervalo.
        if (pendingBeat(state) === beat) state.startDialogue(storyBeats[beat].dialogue);
      }, storyBeats[beat].delay * 1000);
    };

    const unsubscribe = useGameStore.subscribe(evaluate);
    evaluate();
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);
}
