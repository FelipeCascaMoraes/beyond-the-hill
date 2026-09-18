import { useEffect } from "react";
import { memories, storyBeats, type MemoryId, type StoryBeatId } from "@/content";
import { nextAutoMemory } from "@/game/memory/memoryLogic";
import { selectCanInteract, useGameStore } from "@/game/state/gameStore";
import { nextBeat } from "./beats";

type GameStoreState = ReturnType<typeof useGameStore.getState>;

/** Algo que a narrativa quer disparar sozinha. */
type PendingEvent = { kind: "beat"; id: StoryBeatId } | { kind: "memory"; id: MemoryId };

const eventKey = (event: PendingEvent | null) => (event ? `${event.kind}:${event.id}` : null);

/** Próximo evento, se o jogador estiver livre para recebê-lo. Momentos vêm antes de memórias. */
function pendingEvent(state: GameStoreState): PendingEvent | null {
  if (state.phase !== "playing" || !selectCanInteract(state)) return null;
  const beat = nextBeat(storyBeats, state.zone, state);
  if (beat) return { kind: "beat", id: beat };
  const memory = nextAutoMemory(memories, state);
  if (memory) return { kind: "memory", id: memory };
  return null;
}

function delayOf(event: PendingEvent): number {
  if (event.kind === "beat") return storyBeats[event.id].delay;
  const { trigger } = memories[event.id];
  return trigger.type === "auto" ? trigger.delay : 0;
}

function run(event: PendingEvent, state: GameStoreState): void {
  if (event.kind === "beat") state.startDialogue(storyBeats[event.id].dialogue);
  else state.activateMemory(event.id);
}

/**
 * Diretor narrativo: observa o estado do jogo e dispara os momentos de
 * `content/story.ts` e as memórias automáticas de `content/memories.ts` quando
 * as condições se cumprem, após um pequeno atraso. Se o jogador ficar ocupado
 * nesse intervalo, espera a próxima oportunidade.
 */
export function useStoryDirector(): void {
  useEffect(() => {
    let scheduled: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const evaluate = () => {
      const event = pendingEvent(useGameStore.getState());
      const key = eventKey(event);
      if (key === scheduled) return;
      clearTimeout(timer);
      scheduled = key;
      if (!event) return;
      timer = setTimeout(() => {
        scheduled = null;
        const state = useGameStore.getState();
        // Confere de novo: o jogador pode ter começado outra coisa no intervalo.
        if (eventKey(pendingEvent(state)) === key) run(event, state);
      }, delayOf(event) * 1000);
    };

    const unsubscribe = useGameStore.subscribe(evaluate);
    evaluate();
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);
}
