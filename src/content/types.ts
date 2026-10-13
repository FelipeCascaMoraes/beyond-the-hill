// Tipos dos dados narrativos. Nada aqui depende de React ou Three.js.
import type { CharacterId } from "./characters";
import type { ChoiceId } from "./choices";
import type { DialogueId } from "./dialogues";
import type { MemoryId } from "./memories";
import type { StoryFlag } from "./story";
import type { ZoneId } from "./zones";

export type Vec3 = readonly [number, number, number];

export interface Character {
  name: string;
  /** Como a Aysha se refere ao personagem antes de ele se apresentar (com artigo: "a mulher..."). */
  epithet: string;
  /** Cor provisória usada enquanto não há modelo 3D. */
  placeholderColor: string;
}

/** Círculo no plano XZ. */
export interface ZoneBounds {
  center: readonly [number, number];
  radius: number;
}

export interface Zone {
  title: string;
  /** Posição inicial da Aysha ao entrar na zona (y é ignorado: vem do terreno). */
  playerSpawn: Vec3;
  /**
   * Onde a malha do terreno é mais densa (XZ). A grade afina depressa com a
   * distância, então cada zona centra o detalhe onde se caminha. Padrão: o
   * ponto de partida — o que basta para zonas pequenas.
   */
  terrainFocus?: readonly [number, number];
  /** Para onde a Aysha olha ao entrar na zona. */
  spawnLookAt: Vec3;
  /** Área explorável: união de círculos (que devem se sobrepor para haver passagem). */
  bounds: readonly ZoneBounds[];
}

/** Ao entrar no círculo pela primeira vez, toca um diálogo (normalmente sem travar o movimento). */
export interface AreaTrigger {
  zone: ZoneId;
  center: readonly [number, number];
  radius: number;
  dialogue: DialogueId;
  /** Enquanto não se cumprir, o lugar não diz nada: o mesmo chão, outra hora. */
  requires?: Requirement;
}

// ── Diálogos ─────────────────────────────────────────────────────────────
// Um diálogo é um pequeno grafo de nós. Cada nó tem uma sequência de falas e,
// ao final, escolhas, um próximo nó ou o encerramento.
//
//   start ─► nó { falas... } ─► escolhas ─► nó ...
//                             └► next ────► nó ...
//                             └► (nada) ──► fim

/** Quem fala: um personagem ou o narrador (descrições curtas de ação, sem nome). */
export type Speaker = CharacterId | "narrator";

export interface DialogueLine {
  speaker: Speaker;
  text: string;
  /** Nesta fala alguém se apresenta: a partir daqui o nome aparece no lugar do epíteto. */
  introduces?: CharacterId | readonly CharacterId[];
}

export interface DialogueChoice {
  /** O que a Aysha diz/decide. */
  text: string;
  /** Nó seguinte; sem `next` a escolha encerra o diálogo. */
  next?: string;
}

export interface DialogueNode {
  lines: readonly DialogueLine[];
  /** Mostradas depois da última fala do nó. */
  choices?: readonly DialogueChoice[];
  /** Sem escolhas: segue para este nó; sem `next`, o diálogo termina. */
  next?: string;
}

export interface Dialogue {
  start: string;
  nodes: Readonly<Record<string, DialogueNode>>;
  /**
   * Trava o movimento enquanto o diálogo está aberto (padrão: `true`).
   * Com `false` as falas avançam sozinhas e o jogador continua andando
   * (comentários de fundo); nesse caso não pode haver escolhas.
   */
  blocksMovement?: boolean;
  /** Marcos da história registrados quando o diálogo termina. */
  setsFlags?: readonly StoryFlag[];
}

// ── Progressão narrativa ─────────────────────────────────────────────────

/** Condição narrativa. Todas as partes presentes precisam ser verdadeiras. */
export interface Requirement {
  /** Marcos que já precisam ter acontecido. */
  flags?: readonly StoryFlag[];
  /** Pelo menos `count` destes diálogos já concluídos. */
  seenAtLeast?: { dialogues: readonly DialogueId[]; count: number };
  /** Memórias que já precisam ter sido recuperadas. */
  memories?: readonly MemoryId[];
  /** Decisões já tomadas, com o valor escolhido (`content/choices.ts`). */
  choices?: { readonly [Id in ChoiceId]?: string };
}

/** Momento que o jogo dispara sozinho, uma única vez, quando o jogador está livre. */
export interface StoryBeat {
  zone: ZoneId;
  dialogue: DialogueId;
  requires: Requirement;
  /** Espera (s) depois que as condições se cumprem, para não ser abrupto. */
  delay: number;
}

/** Entrada da conversa de um NPC: sempre disponível, ou só com uma condição. */
export type ConversationEntry = DialogueId | { dialogue: DialogueId; requires: Requirement };

/** Um NPC no mundo: onde está e o que tem a dizer. */
export interface NpcDefinition {
  zone: ZoneId;
  /** Posição no plano XZ (a altura vem do terreno). */
  position: readonly [number, number];
  /** Para onde olha quando a Aysha está longe. */
  restLookAt: readonly [number, number];
  /**
   * Conversas em ordem: cada interação toca a próxima ainda não vista e
   * disponível; quando não há mais, repete a última disponível.
   */
  conversation: readonly ConversationEntry[];
  /** Enquanto esta condição não se cumprir, o NPC ainda não está no mundo. */
  requires?: Requirement;
  /** Quando esta condição se cumprir, o NPC não está mais no mundo. */
  leavesWhen?: Requirement;
  /** Texto do prompt no lugar de "Falar com {nome}". */
  prompt?: string;
  /**
   * Quem é, se não for o próprio id: a mesma pessoa pode estar em dois
   * lugares da história (Cassandra no campo e, no fim, na beira do refúgio).
   */
  character?: Exclude<CharacterId, "aysha">;
  /**
   * Como vai embora quando `leavesWhen` se cumpre. Padrão: some de uma vez,
   * sem ser visto indo. `fade`: recua alguns passos e se apaga, à vista.
   */
  exit?: "fade";
}

/** Algo no campo que a Aysha pode examinar. */
export interface PointOfInterest {
  zone: ZoneId;
  /** Aparência (definida em scene/poi). */
  kind:
    | "horseshoe"
    | "fence"
    | "cairn"
    | "flowers"
    | "boulder"
    | "gate"
    | "drawing"
    | "table"
    | "toy-horse"
    | "window"
    | "note"
    | "tree";
  position: readonly [number, number];
  /** Giro no eixo vertical (rad). */
  rotation?: number;
  /** Texto do prompt: "[ E ] {prompt}". */
  prompt: string;
  /** Pensamento da Aysha ao examinar. */
  dialogue: DialogueId;
  /**
   * Gatilho de memória: enquanto a memória estiver desbloqueada e não vivida,
   * a interação abre a memória (com outro prompt). Depois de vivida, usa
   * `afterDialogue` (se houver) no lugar do pensamento original.
   */
  memory?: { id: MemoryId; prompt: string; afterDialogue?: DialogueId };
  /**
   * Passagem para outra zona. Enquanto a condição não se cumpre, o ponto se
   * comporta normalmente (é só uma porteira); depois, atravessá-la é a ação
   * principal — vem antes da memória e do pensamento.
   *
   * `clears`: o que fechava a passagem deixa de existir ao abrir — some da
   * cena e para de barrar o caminho (o ferro da saída norte). Uma porteira,
   * que continua de pé e se abre, não usa isto.
   */
  travel?: { zone: ZoneId; prompt: string; requires?: Requirement; clears?: boolean };
  /** Se bloqueia a passagem, o raio (m). */
  obstacleRadius?: number;
}

// ── Memórias ─────────────────────────────────────────────────────────────
// Estado de uma memória (derivado, nunca armazenado à mão):
//   bloqueada ──(condição `unlock` cumprida)──► desbloqueada ──(vivida)──► recuperada

/** Como a memória é ativada depois de desbloqueada. */
export type MemoryTrigger =
  /** Por um objeto interativo com a ação `{ type: "memory" }`. */
  | { type: "interaction" }
  /** Sozinha, assim que desbloqueia e o jogador está livre, após `delay` segundos. */
  | { type: "auto"; delay: number }
  /** Por uma cena (`content/cinematics.ts`): nunca sozinha, nunca por um objeto. */
  | { type: "scene" };

/** Um trecho do conteúdo de uma memória, mostrado um de cada vez. */
export interface MemoryFragment {
  text: string;
  /** `narration` (padrão): descrição. `voice`: uma fala ouvida na lembrança, sem nome. */
  kind?: "narration" | "voice";
  /** Fala mais baixa e leve (uma voz de criança, um sussurro). */
  soft?: boolean;
  /** Tempo em tela (s) quando a memória avança sozinha. */
  duration?: number;
  /**
   * Vira o clima da lembrança a partir daqui: luz, som e câmera acompanham.
   * Sem isto, o fragmento herda o clima do fragmento anterior.
   */
  tone?: MemoryTone;
}

/** Clima visual da lembrança. */
export type MemoryTone = "warm" | "cold";

export interface Memory {
  /** Nome curto, mostrado ao entrar na lembrança. */
  title: string;
  /** Resumo para listas futuras (diário de memórias); não aparece durante a lembrança. */
  description: string;
  /** Condição para desbloquear. Sem condição: desbloqueada desde o início. */
  unlock?: Requirement;
  trigger: MemoryTrigger;
  /** `warm` (padrão): dourada, afetiva. `cold`: dessaturada, dolorosa. */
  tone?: MemoryTone;
  /** Fragmentos avançam sozinhos (E ainda adianta). Padrão: o jogador avança. */
  autoplay?: boolean;
  fragments: readonly MemoryFragment[];
  /** Marcos da história registrados ao terminar a memória. */
  setsFlags?: readonly StoryFlag[];
}

// ── Máquinas ─────────────────────────────────────────────────────────────
// A ameaça do Além. Elas patrulham, detectam, perseguem e desistem — não
// atacam: alcançar a Aysha a devolve ao começo da zona. Ver game/machine.

export interface MachineDefinition {
  zone: ZoneId;
  /** Nome curto, para textos que falem dela. */
  title: string;
  /** Só existe no mundo quando a história chegar até aqui. */
  requires?: Requirement;
  /** E deixa de existir quando ela passar daqui: não há mais o que vigiar. */
  leavesWhen?: Requirement;
  /** Pontos da patrulha (XZ), percorridos em ciclo. */
  route: readonly (readonly [number, number])[];
  /** Quanto para em cada ponto da rota (s). */
  pause: number;
  /** A área que ela guarda: se a Aysha sair dela, a máquina desiste. */
  territory: ZoneBounds;
  vision: {
    /** Até onde enxerga (m). */
    range: number;
    /** Meia-abertura do cone de visão (rad). */
    halfAngle: number;
    /** Dentro deste raio percebe a Aysha mesmo de costas (m). */
    awareness: number;
  };
  /** Velocidades (m/s). A de perseguição fica entre andar e correr. */
  speed: { patrol: number; chase: number; return: number };
  /** Tempo olhando antes de partir para cima e tempo sem ver antes de desistir (s). */
  timing: { detect: number; lose: number };
  /** Distância em que alcança a Aysha (m). */
  reach: number;
  /** Altura em que flutua sobre o terreno (m). */
  hover: number;
}

// ── Cenas ────────────────────────────────────────────────────────────────
// Uma cena tira a câmera do jogador e conta um momento em passos, um depois
// do outro. Enquanto dura, a Aysha não anda nem interage; no fim, a câmera
// volta e o controle também. Ver game/cinematic e scene/cinematic.

/** Ponto com altura relativa ao chão sob ele: [x, altura, z]. */
export type GroundPoint = readonly [number, number, number];

/** Um enquadramento: de onde a câmera olha e para onde. */
export interface CameraShot {
  position: GroundPoint;
  target: GroundPoint;
}

/** O que um passo faz. */
type CinematicAction =
  /**
   * Leva a câmera a um enquadramento em `move` segundos. O passo termina
   * depois de `wait` segundos (padrão: `move`); com `wait: 0` a câmera segue
   * andando enquanto os próximos passos já acontecem.
   */
  | { type: "shot"; shot: CameraShot; move: number; wait?: number }
  | { type: "pause"; seconds: number }
  /** Registra marcos da história (alguém aparece, algo muda no mundo). */
  | { type: "flags"; flags: readonly StoryFlag[] }
  /** Abre um diálogo e espera ele terminar. */
  | { type: "dialogue"; dialogue: DialogueId }
  /** Abre uma lembrança e espera ela terminar. */
  | { type: "memory"; memory: MemoryId }
  /** Uma frase sozinha na tela, sobre o mundo escurecido. */
  | { type: "title"; text: string; seconds: number }
  /** Pede uma decisão (`content/choices.ts`) e espera ela ser tomada. */
  | { type: "choice"; choice: ChoiceId }
  /**
   * O fim do jogo: a tela escurece sobre o último enquadramento e mostra o
   * título e a palavra final. Não termina — é o último passo que existe.
   */
  | { type: "finale"; title: string; subtitle: string };

/**
 * Um passo da cena. Com `when`, só acontece se a condição se cumprir no
 * instante em que a cena chega nele — é assim que uma escolha feita num passo
 * decide quais passos vêm depois, dentro da mesma cena.
 */
export type CinematicStep = CinematicAction & { when?: Requirement };

export interface Cinematic {
  zone: ZoneId;
  /**
   * Começa ao entrar neste círculo, uma vez só. Com `delay`, só depois de a
   * Aysha ficar esse tempo (s) dentro dele, livre e com a condição cumprida.
   */
  trigger: { center: readonly [number, number]; radius: number; delay?: number };
  requires?: Requirement;
  steps: readonly CinematicStep[];
  /**
   * Onde a Aysha fica quando o controle volta: posição (XZ) e para onde olha.
   * Deve coincidir com o último enquadramento, para a volta não ter emenda.
   * Uma cena que termina o jogo (`finale`) não devolve o controle, e não tem.
   */
  release?: { position: readonly [number, number]; lookAt: GroundPoint };
  /** Marcos registrados no fim. */
  setsFlags?: readonly StoryFlag[];
}

// ── Escolhas ─────────────────────────────────────────────────────────────
// Uma decisão da Aysha que o jogo guarda e que muda o que vem depois. Quem a
// pede é um passo de cena; quem a lê é qualquer `Requirement` (`choices`).

export interface ChoiceOption {
  /** O que fica guardado no estado do jogo. */
  value: string;
  /** O que o jogador lê. */
  label: string;
}

export interface Choice {
  /** Uma linha curta acima das opções (opcional: às vezes o silêncio basta). */
  prompt?: string;
  options: readonly ChoiceOption[];
}

// ── Roteiro ──────────────────────────────────────────────────────────────
// O que fazer agora, dito na tela: um passo de cada vez, com a direção e sem a
// resposta. Ver content/guide.ts e game/guide.

/** Para onde a seta do roteiro aponta. */
export type GuideTarget =
  /** Um lugar só. */
  | { type: "point"; position: readonly [number, number] }
  /** Vários lugares que servem: aponta para o mais perto ainda não examinado. */
  | { type: "any"; points: readonly { position: readonly [number, number]; dialogue: DialogueId }[] }
  /** Um caminho: aponta alguns metros adiante nele, até o fim. */
  | { type: "trail"; path: readonly { x: number; z: number }[] };

/** Um passo do roteiro. Vale o primeiro, na ordem declarada, ainda não cumprido. */
export interface GuideStep {
  /** A zona onde o passo se cumpre. Em outra zona, o roteiro diz como chegar lá. */
  zone: ZoneId;
  /** O passo está cumprido quando esta condição vale. */
  until: Requirement;
  /** O que fazer, em uma linha. */
  title: string;
  /** Como: a direção, sem a resposta. */
  hint: string;
  /** Sem alvo, o passo só pede para esperar. */
  target?: GuideTarget;
  /** Contagem mostrada ao lado do título ("2 de 3"). */
  tally?: { dialogues: readonly DialogueId[]; of: number };
}

/** Como ir de uma zona para onde o passo atual se cumpre. */
export interface GuidePassage {
  from: ZoneId;
  /** Zonas a que esta passagem leva (direto ou seguindo adiante). */
  to: readonly ZoneId[];
  title: string;
  hint: string;
  position: readonly [number, number];
}
