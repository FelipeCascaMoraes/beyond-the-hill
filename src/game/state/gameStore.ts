import { create } from "zustand";
import {
  cinematics,
  isChoiceValue,
  dialogues,
  memories,
  type Cinematic,
  type CinematicId,
  type CinematicStep,
  type CharacterId,
  type DialogueId,
  type ChoiceId,
  type MemoryId,
  type MemoryTone,
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
import { canActivate, fragmentTone, isLastFragment, memoryStatus, type MemoryStatus } from "@/game/memory/memoryLogic";
import type { MachineAlert } from "@/game/machine/machineLogic";

export type GamePhase = "title" | "playing" | "ending";

/** Diálogo aberto e o ponto em que está. */
export interface ActiveDialogue {
  id: DialogueId;
  cursor: DialogueCursor;
}

/** Memória em andamento. */
export interface ActiveMemory {
  id: MemoryId;
  fragment: number;
}

/** Cena em andamento e o passo em que está. */
export interface ActiveCinematic {
  id: CinematicId;
  step: number;
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
  /** Memória sendo vivida agora e o fragmento em tela. */
  activeMemory: ActiveMemory | null;
  /** Memórias já vividas até o fim. */
  recoveredMemories: readonly MemoryId[];
  /** Cena em andamento: a câmera é dela, e o controle também. */
  activeCinematic: ActiveCinematic | null;
  /** Cenas que já começaram (cada uma acontece uma vez só). */
  seenCinematics: readonly CinematicId[];
  /** O quanto as máquinas apertam agora: move a UI e o som, nada mais. */
  threat: MachineAlert;
  /** Uma máquina alcançou a Aysha: apagão, sem controle, até ela acordar. */
  captured: boolean;
  /** Zona para onde a Aysha está atravessando agora (tela esvaindo). */
  traveling: ZoneId | null;
  /**
   * Sobe a cada vez que a Aysha precisa renascer no começo da zona. O
   * controlador do jogador observa este número para recriar a pose.
   */
  spawnEpoch: number;
  /** Decisões já tomadas pela Aysha, e o que ela escolheu em cada uma. */
  choices: { readonly [Id in ChoiceId]?: string };
  /** Decisão pedida agora, esperando resposta (trava tudo até vir). */
  activeChoice: ChoiceId | null;
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
  /**
   * Entra em uma memória (trava o controle). Recusa se estiver bloqueada ou
   * se já houver memória ou diálogo em andamento. Retorna se entrou.
   */
  activateMemory: (id: MemoryId) => boolean;
  /** Próximo fragmento; no último não faz nada (a UI encerra após a transição). */
  advanceMemory: () => void;
  /** Encerra a memória: registra como recuperada, aplica marcos e devolve o controle. */
  completeMemory: () => void;
  setThreat: (threat: MachineAlert) => void;
  /** Uma máquina alcançou a Aysha. Não há combate: começa o apagão. */
  captureByMachine: () => void;
  /** Fim do apagão: a Aysha acorda no começo da zona e pensa no que houve. */
  completeCapture: () => void;
  /** Começa a travessia para outra zona (a tela se apaga primeiro). */
  travelTo: (zone: ZoneId) => void;
  /** Fim da travessia: a Aysha chega na nova zona. */
  completeTravel: () => void;
  /**
   * Começa uma cena (tira o controle; uma fala de fundo é interrompida).
   * Recusa se já houver cena, lembrança, apagão ou travessia. Retorna se começou.
   */
  startCinematic: (id: CinematicId) => boolean;
  /** Próximo passo; depois do último, encerra, registra os marcos e devolve o controle. */
  advanceCinematic: () => void;
  /** Registra marcos da história (usado pelos passos das cenas). */
  addFlags: (flags: readonly StoryFlag[]) => void;
  /** Pede uma decisão: tudo para até ela ser tomada. */
  openChoice: (id: ChoiceId) => void;
  /** Toma a decisão aberta. Um valor que não é opção dela é recusado. */
  makeChoice: (value: string) => void;
  /** O jogo terminou: a tela final assume. */
  finishGame: () => void;
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
  activeCinematic: null,
  seenCinematics: [],
  threat: "calm",
  captured: false,
  traveling: null,
  spawnEpoch: 0,
  choices: {},
  activeChoice: null,
};

const addUnique = <T,>(list: readonly T[], ...items: readonly T[]): readonly T[] => {
  const missing = items.filter((item) => !list.includes(item));
  return missing.length ? [...list, ...missing] : list;
};

type DialogueSlice = Pick<GameState, "activeDialogue" | "seenDialogues" | "knownCharacters" | "flags">;

/**
 * Uma fala em andamento foi cortada (por outra conversa, uma lembrança, uma
 * cena, uma captura): conta como vista e deixa os marcos dela mesmo assim. Sem
 * os marcos, cortar a fala errada deixaria a história esperando para sempre
 * por algo que não se repete — apertar E perto dos dois durante "guides-again"
 * bastava para a lembrança seguinte nunca abrir.
 */
function interruptDialogue(state: Pick<GameState, "activeDialogue" | "seenDialogues" | "flags">): Pick<GameState, "seenDialogues" | "flags"> {
  if (!state.activeDialogue) return { seenDialogues: state.seenDialogues, flags: state.flags };
  const { id } = state.activeDialogue;
  return {
    seenDialogues: addUnique(state.seenDialogues, id),
    flags: addUnique(state.flags, ...(dialogues[id].setsFlags ?? [])),
  };
}

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
export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  ...initialState,

  startGame: () => set({ ...initialState, phase: "playing" }),

  enterZone: (zone) => set({ zone }),

  setControlEnabled: (enabled) => set({ controlEnabled: enabled }),

  setInteractionFocus: (focus) => set({ interactionFocus: focus }),

  // Uma fala de fundo em andamento pode ser interrompida: conta como vista (não se repete).
  startDialogue: (id) =>
    set((state) => {
      const interrupted = interruptDialogue(state);
      return { ...interrupted, ...moveDialogue({ ...state, ...interrupted }, id, beginDialogue(dialogues[id])) };
    }),

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

  activateMemory: (id) => {
    const state = get();
    if (state.activeMemory || selectDialogueBlocksMovement(state)) return false;
    if (!canActivate(memoryStatus(id, memories[id], state))) return false;
    // Fala de fundo em andamento: interrompida e contada como vista.
    set({ activeMemory: { id, fragment: 0 }, activeDialogue: null, ...interruptDialogue(state), interactionFocus: null });
    return true;
  },

  advanceMemory: () =>
    set(({ activeMemory }) => {
      if (!activeMemory || isLastFragment(memories[activeMemory.id], activeMemory.fragment)) return {};
      return { activeMemory: { ...activeMemory, fragment: activeMemory.fragment + 1 } };
    }),

  completeMemory: () =>
    set(({ activeMemory, recoveredMemories, flags }) => {
      if (!activeMemory) return {};
      return {
        activeMemory: null,
        recoveredMemories: addUnique(recoveredMemories, activeMemory.id),
        flags: addUnique(flags, ...(memories[activeMemory.id].setsFlags ?? [])),
      };
    }),

  setThreat: (threat) => set((state) => (state.threat === threat ? {} : { threat })),

  captureByMachine: () => {
    const state = get();
    // Durante uma lembrança a máquina fica parada; nada de apagão sobre apagão.
    if (state.captured || state.activeMemory || state.activeCinematic) return;
    set({
      captured: true,
      threat: "calm",
      activeDialogue: null,
      interactionFocus: null,
      ...interruptDialogue(state),
    });
  },

  completeCapture: () => {
    set((state) => ({ captured: false, spawnEpoch: state.spawnEpoch + 1 }));
    get().startDialogue("machine-caught");
  },

  travelTo: (zone) => {
    const state = get();
    if (state.traveling || state.captured || state.activeMemory || state.activeCinematic) return;
    set({ traveling: zone, threat: "calm", activeDialogue: null, interactionFocus: null });
  },

  completeTravel: () =>
    set((state) => {
      if (!state.traveling) return {};
      return { zone: state.traveling, traveling: null, spawnEpoch: state.spawnEpoch + 1 };
    }),

  startCinematic: (id) => {
    const state = get();
    if (state.activeCinematic || state.activeMemory || state.captured || state.traveling) return false;
    set({
      activeCinematic: { id, step: 0 },
      seenCinematics: addUnique(state.seenCinematics, id),
      activeDialogue: null,
      ...interruptDialogue(state),
      interactionFocus: null,
      threat: "calm",
    });
    return true;
  },

  advanceCinematic: () =>
    set(({ activeCinematic, flags }) => {
      if (!activeCinematic) return {};
      const cinematic: Cinematic = cinematics[activeCinematic.id];
      if (activeCinematic.step < cinematic.steps.length - 1) {
        return { activeCinematic: { ...activeCinematic, step: activeCinematic.step + 1 } };
      }
      return { activeCinematic: null, flags: addUnique(flags, ...(cinematic.setsFlags ?? [])) };
    }),

  addFlags: (added) => set(({ flags }) => ({ flags: addUnique(flags, ...added) })),

  openChoice: (id) => set({ activeChoice: id, interactionFocus: null }),

  makeChoice: (value) =>
    set((state) => {
      const id = state.activeChoice;
      if (!id || !isChoiceValue(id, value)) return {};
      return { activeChoice: null, choices: { ...state.choices, [id]: value } };
    }),

  finishGame: () => set({ phase: "ending", interactionFocus: null }),
}));

/** O diálogo aberto trava o movimento? (padrão: sim) */
export const selectDialogueBlocksMovement = (state: GameState): boolean =>
  state.activeDialogue !== null && dialogues[state.activeDialogue.id].blocksMovement !== false;

/**
 * O jogador pode andar e olhar agora? Falso durante a abertura, no apagão de
 * uma captura, na travessia entre zonas, com memória aberta, durante uma cena
 * e durante diálogos que travam o movimento.
 */
export const selectCanControl = (state: GameState): boolean =>
  state.controlEnabled &&
  !state.captured &&
  state.traveling === null &&
  state.activeMemory === null &&
  state.activeCinematic === null &&
  state.activeChoice === null &&
  !selectDialogueBlocksMovement(state);

/** Estado de uma memória para o progresso atual (bloqueada/desbloqueada/recuperada). */
export const selectMemoryStatus =
  (id: MemoryId) =>
  (state: GameState): MemoryStatus =>
    memoryStatus(id, memories[id], state);

/**
 * Clima da lembrança em andamento (pode virar no meio dela), ou `null` fora
 * de uma. É o que a luz da cena, a câmera e o som seguem.
 */
export const selectActiveMemoryTone = (state: GameState): MemoryTone | null =>
  state.activeMemory ? fragmentTone(memories[state.activeMemory.id], state.activeMemory.fragment) : null;

/** Passo da cena em andamento, ou `null` fora de uma. */
export const selectCinematicStep = (state: GameState): CinematicStep | null => {
  if (!state.activeCinematic) return null;
  const cinematic: Cinematic = cinematics[state.activeCinematic.id];
  return cinematic.steps[state.activeCinematic.step] ?? null;
};

/**
 * Pode iniciar uma interação? Sempre que pode controlar: durante uma fala de
 * fundo (que não trava) também — interagir a interrompe.
 */
export const selectCanInteract = (state: GameState): boolean => selectCanControl(state);

/**
 * Tela livre: pode controlar e não há nenhum diálogo, nem de fundo. É quando o
 * jogo pode disparar algo sozinho (momentos, memórias, gatilhos de área).
 */
export const selectIsFree = (state: GameState): boolean => selectCanControl(state) && state.activeDialogue === null;
