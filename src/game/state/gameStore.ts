import { create } from "zustand";
import {
  dialogues,
  type DialogueId,
  type EndingChoice,
  type MemoryId,
  type ZoneId,
} from "@/content";

export type GamePhase = "title" | "playing" | "ending";

interface ActiveDialogue {
  id: DialogueId;
  lineIndex: number;
}

/** Interativo sob a mira/perto do jogador, para o prompt "[ E ] ...". */
export interface InteractionFocus {
  id: string;
  prompt: string;
}

interface GameState {
  phase: GamePhase;
  zone: ZoneId;
  /** Jogador pode andar e olhar (falso durante a abertura e, no futuro, em cenas). */
  controlEnabled: boolean;
  interactionFocus: InteractionFocus | null;
  activeDialogue: ActiveDialogue | null;
  activeMemory: MemoryId | null;
  recoveredMemories: readonly MemoryId[];
  endingChoice: EndingChoice | null;
}

interface GameActions {
  startGame: () => void;
  enterZone: (zone: ZoneId) => void;
  setControlEnabled: (enabled: boolean) => void;
  setInteractionFocus: (focus: InteractionFocus | null) => void;
  startDialogue: (id: DialogueId) => void;
  advanceDialogue: () => void;
  recoverMemory: (id: MemoryId) => void;
  closeMemory: () => void;
  chooseEnding: (choice: EndingChoice) => void;
}

const initialState: GameState = {
  phase: "title",
  zone: "arrival",
  controlEnabled: false,
  interactionFocus: null,
  activeDialogue: null,
  activeMemory: null,
  recoveredMemories: [],
  endingChoice: null,
};

/**
 * Estado global da experiência.
 * Componentes React assinam com seletores; o loop 3D (useFrame) deve ler
 * via `useGameStore.getState()` para não provocar re-render a cada frame.
 */
export const useGameStore = create<GameState & GameActions>()((set) => ({
  ...initialState,

  startGame: () => set({ ...initialState, phase: "playing" }),

  enterZone: (zone) => set({ zone }),

  setControlEnabled: (enabled) => set({ controlEnabled: enabled }),

  setInteractionFocus: (focus) => set({ interactionFocus: focus }),

  startDialogue: (id) => set({ activeDialogue: { id, lineIndex: 0 } }),

  advanceDialogue: () =>
    set(({ activeDialogue }) => {
      if (!activeDialogue) return {};
      const next = activeDialogue.lineIndex + 1;
      const done = next >= dialogues[activeDialogue.id].lines.length;
      return { activeDialogue: done ? null : { ...activeDialogue, lineIndex: next } };
    }),

  recoverMemory: (id) =>
    set(({ recoveredMemories }) => ({
      activeMemory: id,
      recoveredMemories: recoveredMemories.includes(id)
        ? recoveredMemories
        : [...recoveredMemories, id],
    })),

  closeMemory: () => set({ activeMemory: null }),

  chooseEnding: (choice) => set({ endingChoice: choice, phase: "ending" }),
}));

/**
 * O jogador pode andar, olhar e interagir agora? Falso durante a abertura
 * e enquanto um diálogo ou uma memória está aberto.
 */
export const selectCanControl = (state: GameState): boolean =>
  state.controlEnabled && state.activeDialogue === null && state.activeMemory === null;
