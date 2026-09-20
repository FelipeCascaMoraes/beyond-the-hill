import type { DialogueId, MemoryId, StoryFlag, ZoneId } from "@/content";
import { useGameStore } from "@/game/state/gameStore";
import { setMachinesPaused } from "./devFlags";

// Atalhos de teste, só em desenvolvimento: `bth` no console do navegador.
// Servem para entrar em qualquer ponto da história sem refazer o caminho
// inteiro. Nada aqui é usado pelo jogo — é ferramenta de bancada.
//
//   bth.ajuda()            lista tudo
//   bth.etapa("casa")      pula a história até ali
//   bth.ir("porteira")     teleporta para um lugar
//   bth.paz()              desliga as máquinas
//   bth.lembranca("after") toca uma lembrança agora

/** Um ponto da história: o que já aconteceu até ali. */
interface Checkpoint {
  descricao: string;
  zone: ZoneId;
  flags: readonly StoryFlag[];
  memories: readonly MemoryId[];
  /** Conversas dadas como vistas, para os momentos não se repetirem. */
  dialogues: readonly DialogueId[];
}

const BEATS_INICIAIS: readonly DialogueId[] = ["arrival-meeting", "arrival-encourage", "arrival-hill-familiar"];

const etapas = {
  inicio: {
    descricao: "acabou de acordar, antes de falar com Cassandra e Victor",
    zone: "arrival",
    flags: [],
    memories: [],
    dialogues: [],
  },
  porteira: {
    descricao: "a colina já parece familiar: a porteira abre a 1ª lembrança",
    zone: "arrival",
    flags: ["met-guides", "hill-familiar"],
    memories: [],
    dialogues: BEATS_INICIAIS,
  },
  casa: {
    descricao: "1ª lembrança vivida e desenho achado: o cavalinho abre a 2ª (e a máquina ronda o campo)",
    zone: "arrival",
    flags: ["met-guides", "hill-familiar", "first-memory", "found-drawing", "machine-seen"],
    memories: ["childhood-ride"],
    dialogues: [...BEATS_INICIAIS, "machine-arrives", "house-approach", "poi-house-drawing"],
  },
  labirinto: {
    descricao: "as duas primeiras lembranças vividas: a porteira vira passagem para o labirinto",
    zone: "arrival",
    flags: ["met-guides", "hill-familiar", "first-memory", "found-drawing", "machine-seen", "parents-lost"],
    memories: ["childhood-ride", "parents-night"],
    dialogues: [...BEATS_INICIAIS, "machine-arrives", "house-approach", "poi-house-drawing"],
  },
  reconhecimento: {
    descricao: "papel do labirinto lido: chegar perto dos dois dispara a 4ª lembrança",
    zone: "arrival",
    flags: [
      "met-guides",
      "hill-familiar",
      "first-memory",
      "found-drawing",
      "machine-seen",
      "parents-lost",
      "hunt-began",
    ],
    memories: ["childhood-ride", "parents-night", "the-names"],
    dialogues: [...BEATS_INICIAIS, "machine-arrives", "house-approach", "poi-house-drawing", "labyrinth-arrive"],
  },
  pedra: {
    descricao: "os dois já reconhecidos: a pedra virada para a colina abre a 5ª lembrança",
    zone: "arrival",
    flags: [
      "met-guides",
      "hill-familiar",
      "first-memory",
      "found-drawing",
      "machine-seen",
      "parents-lost",
      "hunt-began",
      "saw-them-again",
      "guides-known",
    ],
    memories: ["childhood-ride", "parents-night", "the-names", "the-two"],
    dialogues: [
      ...BEATS_INICIAIS,
      "machine-arrives",
      "house-approach",
      "poi-house-drawing",
      "labyrinth-arrive",
      "guides-again",
    ],
  },
} as const satisfies Record<string, Checkpoint>;

type EtapaId = keyof typeof etapas;

/** Lugares para teleportar: [x, z, para onde olhar (x, z)] e a zona de cada um. */
const lugares = {
  despertar: { zone: "arrival", x: 0, z: 0, olharX: -10, olharZ: -720 },
  guias: { zone: "arrival", x: -2, z: -10, olharX: -2, olharZ: -14 },
  porteira: { zone: "arrival", x: -2.4, z: -27, olharX: -2.4, olharZ: -32 },
  pedra: { zone: "arrival", x: 11, z: -26, olharX: 11, olharZ: -31 },
  casa: { zone: "arrival", x: -39, z: 12, olharX: -44, olharZ: 12 },
  cavalinho: { zone: "arrival", x: -43.6, z: 11, olharX: -43.6, olharZ: 9.5 },
  maquina: { zone: "arrival", x: -22, z: 8, olharX: -30, olharZ: 0 },
  labirinto: { zone: "labyrinth", x: 2, z: -55, olharX: 2, olharZ: -70 },
  camara: { zone: "labyrinth", x: 2, z: -80.6, olharX: 2, olharZ: -78 },
  anel: { zone: "labyrinth", x: 2, z: -60.5, olharX: -15, olharZ: -60.5 },
} as const;

type LugarId = keyof typeof lugares;

interface PlayerDebug {
  teleport: (x: number, z: number, olharX?: number, olharZ?: number, olharY?: number) => void;
}

const jogador = (): PlayerDebug | null => (window as unknown as { __bthPlayer?: PlayerDebug }).__bthPlayer ?? null;

/** Instala `window.bth`. Chamado só em desenvolvimento (ver GameShell). */
export function installDevTools(): void {
  const bth = {
    ajuda() {
      const etapasTexto = (Object.keys(etapas) as EtapaId[]).map((id) => `  bth.etapa("${id}") — ${etapas[id].descricao}`);
      console.log(
        [
          "Atalhos de teste (só em desenvolvimento):",
          "",
          "ETAPAS DA HISTÓRIA",
          ...etapasTexto,
          "",
          "IR ATÉ UM LUGAR",
          `  bth.ir("${Object.keys(lugares).join('" | "')}")`,
          "",
          "OUTROS",
          "  bth.paz()            liga/desliga as máquinas (volta ligado com bth.paz(false))",
          "  bth.zona(\"labyrinth\") troca de zona",
          "  bth.lembranca(\"after\") toca uma lembrança agora",
          "  bth.estado()         mostra marcos, lembranças e ameaça",
          "",
          "Dica: bth.etapa(\"labirinto\") e depois bth.ir(\"porteira\") para testar a travessia.",
        ].join("\n"),
      );
    },

    /** Coloca a história em um ponto conhecido (sem mexer na posição da Aysha). */
    etapa(id: EtapaId) {
      const etapa: Checkpoint = etapas[id];
      if (!etapa) return console.warn(`Etapa desconhecida. Use: ${Object.keys(etapas).join(", ")}`);
      useGameStore.setState({
        zone: etapa.zone,
        flags: [...etapa.flags],
        recoveredMemories: [...etapa.memories],
        seenDialogues: [...etapa.dialogues],
        activeDialogue: null,
        activeMemory: null,
        captured: false,
        traveling: null,
        threat: "calm",
        spawnEpoch: useGameStore.getState().spawnEpoch + 1,
      });
      console.log(`Etapa "${id}": ${etapa.descricao}`);
      return undefined;
    },

    /** Teleporta para um lugar (trocando de zona quando precisa). */
    ir(id: LugarId) {
      const lugar = lugares[id];
      if (!lugar) return console.warn(`Lugar desconhecido. Use: ${Object.keys(lugares).join(", ")}`);
      const { zone, enterZone } = useGameStore.getState();
      if (zone !== lugar.zone) {
        enterZone(lugar.zone);
        // A zona monta no próximo quadro: teleporta depois dela existir.
        requestAnimationFrame(() => jogador()?.teleport(lugar.x, lugar.z, lugar.olharX, lugar.olharZ));
      } else {
        jogador()?.teleport(lugar.x, lugar.z, lugar.olharX, lugar.olharZ);
      }
      console.log(`Indo para "${id}" (${lugar.zone}).`);
      return undefined;
    },

    zona(zone: ZoneId) {
      useGameStore.getState().enterZone(zone);
      useGameStore.setState({ spawnEpoch: useGameStore.getState().spawnEpoch + 1 });
    },

    /** Desliga (ou religa) as máquinas, para andar em paz. */
    paz(desligar = true) {
      setMachinesPaused(desligar);
      console.log(desligar ? "Máquinas paradas." : "Máquinas soltas de novo.");
    },

    /** Toca uma lembrança agora, mesmo que ainda esteja bloqueada. */
    lembranca(id: MemoryId) {
      useGameStore.setState({ activeMemory: { id, fragment: 0 }, activeDialogue: null, interactionFocus: null });
    },

    estado() {
      const { zone, flags, recoveredMemories, seenDialogues, threat, captured, traveling } = useGameStore.getState();
      console.table({ zona: zone, ameaça: threat, capturada: captured, atravessando: traveling ?? "—" });
      console.log("marcos:", flags.join(", ") || "—");
      console.log("lembranças:", recoveredMemories.join(", ") || "—");
      console.log("conversas vistas:", seenDialogues.length);
    },
  };

  Object.assign(window, { bth });
  console.log('Atalhos de teste prontos: digite bth.ajuda() no console.');
}
