import { create } from "zustand";
import {
  dialogues,
  type CharacterId,
  type DialogueId,
  type DialogueLine,
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
  /** Conversas já concluídas (define o que cada NPC diz a seguir). */
  seenDialogues: readonly DialogueId[];
  /** Personagens cujo nome a Aysha já conhece. */
  knownCharacters: readonly CharacterId[];
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
  seenDialogues: [],
  knownCharacters: ["aysha"],
  activeMemory: null,
  recoveredMemories: [],
  endingChoice: null,
};

const addUnique = <T,>(list: readonly T[], item: T): readonly T[] => (list.includes(item) ? list : [...list, item]);

/** Quando uma fala apresenta alguém, o nome passa a ser conhecido. */
function learnFromLine(known: readonly CharacterId[], line: DialogueLine): readonly CharacterId[] {
  return line.introduces ? addUnique(known, line.introduces) : known;
}

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

  startDialogue: (id) =>
    set(({ knownCharacters }) => ({
      activeDialogue: { id, lineIndex: 0 },
      knownCharacters: learnFromLine(knownCharacters, dialogues[id].lines[0]),
    })),

  advanceDialogue: () =>
    set(({ activeDialogue, seenDialogues, knownCharacters }) => {
      if (!activeDialogue) return {};
      const { lines } = dialogues[activeDialogue.id];
      const next = activeDialogue.lineIndex + 1;
      if (next >= lines.length) {
        return { activeDialogue: null, seenDialogues: addUnique(seenDialogues, activeDialogue.id) };
      }
      return {
        activeDialogue: { ...activeDialogue, lineIndex: next },
        knownCharacters: learnFromLine(knownCharacters, lines[next]),
      };
    }),

  recoverMemory: (id) =>
    set(({ recoveredMemories }) => ({
      activeMemory: id,
      recoveredMemories: addUnique(recoveredMemories, id),
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
