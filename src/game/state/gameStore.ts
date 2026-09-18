import { create } from "zustand";
import {
  dialogues,
  type CharacterId,
  type DialogueId,
  type EndingChoice,
  type MemoryId,
  type StoryFlag,
  type ZoneId,
} from "@/content";
import {
  advanceCursor,
  beginDialogue,
  chooseOption,
  currentStep,
  introducedBy,
  type DialogueCursor,
} from "@/game/dialogue/runner";

export type GamePhase = "title" | "playing" | "ending";

/** Diálogo aberto e o ponto em que está. */
export interface ActiveDialogue {
  id: DialogueId;
  cursor: DialogueCursor;
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
  /** Marcos da história já alcançados. */
  flags: readonly StoryFlag[];
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
  /** Próxima fala (ou encerra). Diante de escolhas, não faz nada. */
  advanceDialogue: () => void;
  chooseDialogueOption: (index: number) => void;
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
  flags: [],
  activeMemory: null,
  recoveredMemories: [],
  endingChoice: null,
};

const addUnique = <T,>(list: readonly T[], ...items: readonly T[]): readonly T[] => {
  const missing = items.filter((item) => !list.includes(item));
  return missing.length ? [...list, ...missing] : list;
};

type DialogueSlice = Pick<GameState, "activeDialogue" | "seenDialogues" | "knownCharacters" | "flags">;

/**
 * Aplica um novo cursor: `null` encerra (marca a conversa como vista e
 * registra seus marcos); caso contrário, aprende nomes apresentados na nova fala.
 */
function moveDialogue(state: DialogueSlice, id: DialogueId, cursor: DialogueCursor | null): Partial<GameState> {
  if (!cursor) {
    return {
      activeDialogue: null,
      seenDialogues: addUnique(state.seenDialogues, id),
      flags: addUnique(state.flags, ...(dialogues[id].setsFlags ?? [])),
    };
  }
  return {
    activeDialogue: { id, cursor },
    knownCharacters: addUnique(state.knownCharacters, ...introducedBy(currentStep(dialogues[id], cursor))),
  };
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

  startDialogue: (id) => set((state) => moveDialogue(state, id, beginDialogue(dialogues[id]))),

  advanceDialogue: () =>
    set((state) => {
      if (!state.activeDialogue) return {};
      const { id, cursor } = state.activeDialogue;
      const next = advanceCursor(dialogues[id], cursor);
      return next === cursor ? {} : moveDialogue(state, id, next);
    }),

  chooseDialogueOption: (index) =>
    set((state) => {
      if (!state.activeDialogue) return {};
      const { id, cursor } = state.activeDialogue;
      const next = chooseOption(dialogues[id], cursor, index);
      return next === cursor ? {} : moveDialogue(state, id, next);
    }),

  recoverMemory: (id) =>
    set(({ recoveredMemories }) => ({
      activeMemory: id,
      recoveredMemories: addUnique(recoveredMemories, id),
    })),

  closeMemory: () => set({ activeMemory: null }),

  chooseEnding: (choice) => set({ endingChoice: choice, phase: "ending" }),
}));

/** O diálogo aberto trava o movimento? (padrão: sim) */
export const selectDialogueBlocksMovement = (state: GameState): boolean =>
  state.activeDialogue !== null && dialogues[state.activeDialogue.id].blocksMovement !== false;

/**
 * O jogador pode andar e olhar agora? Falso durante a abertura, com memória
 * aberta e durante diálogos que travam o movimento.
 */
export const selectCanControl = (state: GameState): boolean =>
  state.controlEnabled && state.activeMemory === null && !selectDialogueBlocksMovement(state);

/** Pode iniciar uma interação? Além de controlar, não pode haver diálogo aberto. */
export const selectCanInteract = (state: GameState): boolean =>
  selectCanControl(state) && state.activeDialogue === null;
