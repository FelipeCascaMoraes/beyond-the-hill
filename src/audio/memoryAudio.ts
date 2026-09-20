import type { MemoryTone } from "@/content";
import { audioManager } from "./audioManager";

/**
 * O som das lembranças, sintetizado na hora (ainda não há trilhas em /public).
 * Cada clima é um acorde parado que respira; a lembrança troca de acorde
 * quando vira de clima, com uma batida grave marcando a virada.
 *
 *   start(tone) ──► setTone(tone) / strike(tone) ──► stop()
 *
 * Sem o gesto que libera o áudio (`audioManager.unlock()`) tudo vira silêncio,
 * sem erro: a lembrança continua funcionando.
 */

/** Uma nota sustentada do acorde. */
interface Voice {
  frequency: number;
  type: OscillatorType;
  gain: number;
  /** Respiração do volume: velocidade (Hz) e profundidade (0–1). */
  breath: { rate: number; depth: number };
}

interface Bed {
  voices: readonly Voice[];
  /** Corte dos agudos (Hz): quanto mais baixo, mais abafado e distante. */
  cutoff: number;
  /** Batida da virada: cai da primeira frequência até a segunda. */
  strike: { from: number; to: number; gain: number; duration: number };
}

const beds: Record<MemoryTone, Bed> = {
  // Dourada: uma quinta aberta, com um agudo frágil tremendo por cima.
  warm: {
    voices: [
      { frequency: 146.8, type: "sine", gain: 0.3, breath: { rate: 0.13, depth: 0.35 } },
      { frequency: 220.5, type: "sine", gain: 0.2, breath: { rate: 0.09, depth: 0.45 } },
      { frequency: 440.9, type: "triangle", gain: 0.05, breath: { rate: 0.17, depth: 0.8 } },
    ],
    cutoff: 1400,
    strike: { from: 330, to: 165, gain: 0.18, duration: 1.1 },
  },
  // Fria: graves quase iguais brigando entre si — o mal-estar vem daí.
  cold: {
    voices: [
      { frequency: 55, type: "sine", gain: 0.36, breath: { rate: 0.07, depth: 0.25 } },
      { frequency: 82.9, type: "sine", gain: 0.24, breath: { rate: 0.05, depth: 0.4 } },
      { frequency: 207.6, type: "triangle", gain: 0.04, breath: { rate: 0.23, depth: 0.9 } },
    ],
    cutoff: 700,
    strike: { from: 150, to: 42, gain: 0.34, duration: 1.6 },
  },
};

/** Volume do leito inteiro. */
const VOLUME = 0.5;
/** Entrada, virada de clima e saída (s). */
const FADE_IN = 1.4;
const CROSSFADE = 1.1;
const FADE_OUT = 1.2;
/** Quanto sobra da música enquanto a lembrança acontece. */
const MUSIC_DUCK = 0.2;

const rampTo = (param: AudioParam, value: number, now: number, seconds: number) => {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + seconds);
};

class MemoryAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  /** Um ganho por clima já montado: virar de clima é cruzar entre eles. */
  private layers = new Map<MemoryTone, GainNode>();
  private oscillators: OscillatorNode[] = [];

  /** Começa o leito no clima dado e abre espaço na música. */
  start(tone: MemoryTone) {
    this.stop(0);
    const context = audioManager.audioContext();
    if (!context) return;
    this.context = context;
    const master = context.createGain();
    master.gain.setValueAtTime(0, context.currentTime);
    master.connect(context.destination);
    this.master = master;
    rampTo(master.gain, VOLUME, context.currentTime, FADE_IN);
    this.setTone(tone, FADE_IN);
    audioManager.duckMusic(MUSIC_DUCK, FADE_IN);
  }

  /** Cruza para outro clima (sem efeito se o leito não estiver tocando). */
  setTone(tone: MemoryTone, seconds = CROSSFADE) {
    const { context, master } = this;
    if (!context || !master) return;
    const now = context.currentTime;
    for (const [id, layer] of this.layers) {
      if (id !== tone) rampTo(layer.gain, 0, now, seconds);
    }
    const layer = this.layers.get(tone) ?? this.createLayer(tone, context, master);
    rampTo(layer.gain, 1, now, seconds);
  }

  /** A batida da virada: o baque que a lembrança leva ao mudar de clima. */
  strike(tone: MemoryTone) {
    const { context, master } = this;
    if (!context || !master) return;
    const now = context.currentTime;
    const { from, to, gain: peak, duration } = beds[tone].strike;

    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);

    // Ataque curto e queda longa: uma porta fechando longe, um coração batendo.
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
  }

  /** Desliga o leito e devolve a música ao volume normal. */
  stop(seconds = FADE_OUT) {
    const { context, master } = this;
    const oscillators = this.oscillators;
    this.context = null;
    this.master = null;
    this.oscillators = [];
    this.layers.clear();
    if (!context || !master) return;

    const now = context.currentTime;
    rampTo(master.gain, 0, now, seconds);
    for (const oscillator of oscillators) oscillator.stop(now + seconds + 0.05);
    setTimeout(() => master.disconnect(), (seconds + 0.2) * 1000);
    audioManager.duckMusic(1, seconds);
  }

  /** Monta o acorde de um clima, começando mudo. */
  private createLayer(tone: MemoryTone, context: AudioContext, master: GainNode): GainNode {
    const bed = beds[tone];
    const now = context.currentTime;

    const layer = context.createGain();
    layer.gain.setValueAtTime(0, now);
    layer.connect(master);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(bed.cutoff, now);
    filter.connect(layer);

    for (const voice of bed.voices) {
      const oscillator = context.createOscillator();
      oscillator.type = voice.type;
      oscillator.frequency.setValueAtTime(voice.frequency, now);

      const gain = context.createGain();
      gain.gain.setValueAtTime(voice.gain * (1 - voice.breath.depth), now);

      // A respiração: um oscilador lento somando e subtraindo do ganho da nota.
      const breath = context.createOscillator();
      breath.type = "sine";
      breath.frequency.setValueAtTime(voice.breath.rate, now);
      const breathDepth = context.createGain();
      breathDepth.gain.setValueAtTime(voice.gain * voice.breath.depth, now);
      breath.connect(breathDepth).connect(gain.gain);

      oscillator.connect(gain).connect(filter);
      oscillator.start(now);
      breath.start(now);
      this.oscillators.push(oscillator, breath);
    }

    this.layers.set(tone, layer);
    return layer;
  }
}

export const memoryAudio = new MemoryAudio();
