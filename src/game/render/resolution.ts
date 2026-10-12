// Resolução adaptativa: com quantos pixels o jogo desenha cada quadro. Só
// lógica — quem mede os quadros e aplica o resultado é a cena
// (scene/AdaptiveResolution.tsx).
//
// O teto vem da máquina e do tamanho da janela. Dali o jogo só desce, um
// degrau por vez, quando o FPS medido fica baixo por tempo bastante — e volta
// a subir, com cautela, se sobrar folga. A resolução é a única coisa que se
// ajusta: é o que mais pesa na grama e o que menos se nota debaixo da neblina.

/** Piso absoluto do fator de resolução: abaixo disto a imagem vira borrão. */
export const MIN_DPR = 0.75;

interface ResolutionLimits {
  maxDpr: number;
  pixelBudget: number;
}

/**
 * O fator de resolução de partida para uma janela deste tamanho (em pixels
 * CSS): o do monitor, limitado pelo preset e pelo teto de pixels por quadro.
 */
export function resolutionCeiling(width: number, height: number, devicePixelRatio: number, limits: ResolutionLimits): number {
  const wanted = Math.min(Math.max(devicePixelRatio, 1), limits.maxDpr);
  const area = Math.max(1, width * height);
  const affordable = Math.sqrt(limits.pixelBudget / area);
  return Math.max(MIN_DPR, Math.min(wanted, affordable));
}

/** Os degraus, como fração do teto. */
export const RESOLUTION_STEPS = [1, 0.85, 0.72, 0.6] as const;

/** De quanto em quanto tempo o FPS é avaliado (s). */
const WINDOW = 1;
/** Um quadro mais longo que isto é um tranco (troca de aba, zona nascendo): não conta. */
const HITCH = 0.25;
/** Abaixo disto o jogo está lento; acima disto, com folga. */
const SLOW_FPS = 48;
const FAST_FPS = 57;
/** Quantas janelas seguidas até agir: descer é rápido, subir é desconfiado. */
const SLOW_WINDOWS = 2;
const FAST_WINDOWS = 8;
/** Uma descida precisa render pelo menos isto, ou a resolução não era o gargalo. */
const WORTH_IT = 1.08;
/** Quanto tempo o ajuste fica parado depois de descobrir que não adianta (janelas). */
const GIVE_UP_FOR = 60;
/** Subir e ter de descer de novo logo em seguida gasta uma das tentativas de subida. */
const RAISE_TRIALS = 2;
const RAISE_REGRET = 20;

export interface ResolutionMonitor {
  /** Degrau atual (índice em RESOLUTION_STEPS). */
  level: number;
  time: number;
  frames: number;
  slow: number;
  fast: number;
  /** Janelas a ignorar: o quadro seguinte a uma troca de resolução não vale. */
  settling: number;
  /** FPS antes da última descida, enquanto se espera para ver se ela adiantou. */
  before: number | null;
  /** Janelas restantes sem mexer em nada. */
  paused: number;
  raisesLeft: number;
  sinceRaise: number;
}

export const createResolutionMonitor = (): ResolutionMonitor => ({
  level: 0,
  time: 0,
  frames: 0,
  slow: 0,
  fast: 0,
  settling: 0,
  before: null,
  paused: 0,
  raisesLeft: RAISE_TRIALS,
  sinceRaise: Infinity,
});

/** Esquece a janela em andamento (o jogo parou de medir por um instante). */
export function interruptResolutionMonitor(monitor: ResolutionMonitor): void {
  monitor.time = 0;
  monitor.frames = 0;
  monitor.slow = 0;
  monitor.fast = 0;
}

/**
 * Conta um quadro. Devolve `true` quando o degrau mudou — é só então que a
 * cena precisa trocar a resolução.
 */
export function sampleResolution(monitor: ResolutionMonitor, delta: number): boolean {
  if (delta > HITCH) {
    interruptResolutionMonitor(monitor);
    return false;
  }
  monitor.time += delta;
  monitor.frames++;
  if (monitor.time < WINDOW) return false;

  const fps = monitor.frames / monitor.time;
  monitor.time = 0;
  monitor.frames = 0;
  monitor.sinceRaise++;

  if (monitor.settling > 0) {
    monitor.settling--;
    return false;
  }
  if (monitor.paused > 0) {
    monitor.paused--;
    return false;
  }

  // A última descida adiantou? Se não, quem segura o FPS é outra coisa (o
  // processador, o monitor, o modo de economia): devolve a nitidez e espera.
  if (monitor.before !== null) {
    const helped = fps >= monitor.before * WORTH_IT;
    monitor.before = null;
    if (!helped) {
      monitor.level--;
      monitor.settling = 1;
      monitor.paused = GIVE_UP_FOR;
      monitor.slow = 0;
      monitor.fast = 0;
      return true;
    }
  }

  if (fps < SLOW_FPS) {
    monitor.fast = 0;
    if (++monitor.slow < SLOW_WINDOWS || monitor.level >= RESOLUTION_STEPS.length - 1) return false;
    if (monitor.sinceRaise <= RAISE_REGRET) monitor.raisesLeft--;
    monitor.level++;
    monitor.before = fps;
    monitor.settling = 1;
    monitor.slow = 0;
    return true;
  }

  monitor.slow = 0;
  if (fps <= FAST_FPS) {
    monitor.fast = 0;
    return false;
  }
  if (++monitor.fast < FAST_WINDOWS || monitor.level === 0 || monitor.raisesLeft <= 0) return false;
  monitor.level--;
  monitor.settling = 1;
  monitor.fast = 0;
  monitor.sinceRaise = 0;
  return true;
}

/** O fator de resolução do degrau atual, para um teto. */
export function resolutionAt(monitor: ResolutionMonitor, ceiling: number): number {
  return Math.max(MIN_DPR, Math.round(ceiling * RESOLUTION_STEPS[monitor.level] * 100) / 100);
}
