import { audioManager } from "./audioManager";

/**
 * O som da subida, sintetizado na hora (não há nenhuma trilha em /public).
 * Duas camadas, ambas comandadas por um número só — o quanto já se subiu:
 *
 *   vento  ruído filtrado, que cresce e fica mais agudo com a altura, e cai
 *          quase a zero dentro da concha, onde não venta;
 *   leito  um acorde parado que vai abrindo: no vale só a fundamental, e a
 *          cada trecho de subida entra uma voz nova, até o acorde inteiro no
 *          cume. Não há melodia nenhuma — é a colina ficando maior.
 *
 *   start() ──► setAscent(subida, abrigo) ──► stop()
 *
 * Sem o gesto que libera o áudio (`audioManager.unlock()`) tudo vira silêncio,
 * sem erro: a subida continua funcionando.
 */

/** Uma voz do acorde e em que ponto da subida ela entra. */
interface Voice {
  frequency: number;
  type: OscillatorType;
  gain: number;
  /** Fração da subida em que a voz começa a aparecer e em que está inteira. */
  from: number;
  to: number;
}

// Um acorde aberto, em quintas, subindo: dó — sol — dó — sol — mi.
const VOICES: readonly Voice[] = [
  { frequency: 65.4, type: "sine", gain: 0.34, from: 0, to: 0.12 },
  { frequency: 98.0, type: "sine", gain: 0.2, from: 0, to: 0.25 },
  { frequency: 196.0, type: "sine", gain: 0.13, from: 0.22, to: 0.55 },
  { frequency: 293.7, type: "triangle", gain: 0.05, from: 0.5, to: 0.8 },
  { frequency: 392.0, type: "sine", gain: 0.045, from: 0.72, to: 1 },
  { frequency: 659.3, type: "triangle", gain: 0.022, from: 0.88, to: 1 },
];

/** Volume geral de cada camada. */
const BED_VOLUME = 0.42;
const WIND_VOLUME = 0.3;
/** Corte do vento (Hz) embaixo e em cima: no alto ele fica fino e sibilante. */
const WIND_CUTOFF = { low: 420, high: 1500 };
/** Quanto de vento sobra no fundo da concha (é o silêncio que a define). */
const WIND_SHELTERED = 0.12;
/** Entrada e saída (s). Longas: nada aqui deve começar nem acabar de repente. */
const FADE_IN = 4;
const FADE_OUT = 2.5;
/** Quanto sobra da música enquanto a subida acontece. */
const MUSIC_DUCK = 0.35;
/** Tempo (s) que os parâmetros levam para alcançar um valor novo. */
const FOLLOW = 0.6;
/** Segundos de ruído gerado; o laço é longo o bastante para não se ouvir. */
const NOISE_SECONDS = 4;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const rampTo = (param: AudioParam, value: number, now: number, seconds: number) => {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + seconds);
};

/** Ruído rosado barato: ruído branco passado por um filtro de uma linha. */
function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  return buffer;
}

class HillsideAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private voiceGains: GainNode[] = [];
  private sources: (OscillatorNode | AudioBufferSourceNode)[] = [];

  /** Começa vento e leito no pé da subida e abre espaço na música. */
  start(): void {
    this.stop(0);
    const context = audioManager.audioContext();
    if (!context) return;
    this.context = context;
    const now = context.currentTime;

    const master = context.createGain();
    master.gain.setValueAtTime(0, now);
    master.connect(context.destination);
    this.master = master;

    this.createWind(context, master, now);
    this.createBed(context, master, now);

    rampTo(master.gain, 1, now, FADE_IN);
    audioManager.duckMusic(MUSIC_DUCK, FADE_IN);
  }

  /**
   * `climbed` (0 a 1) abre o acorde e levanta o vento; `sheltered` (0 a 1)
   * abafa o vento dentro da concha. Chamado a cada quadro: tudo é rampa curta,
   * nunca salto.
   */
  setAscent(climbed: number, sheltered: number): void {
    const { context, windGain, windFilter } = this;
    if (!context || !windGain || !windFilter) return;
    const now = context.currentTime;

    // O vento cresce com a altura e morre no abrigo.
    const exposure = (0.25 + 0.75 * climbed) * (1 - (1 - WIND_SHELTERED) * sheltered);
    rampTo(windGain.gain, WIND_VOLUME * exposure, now, FOLLOW);
    rampTo(windFilter.frequency, WIND_CUTOFF.low + (WIND_CUTOFF.high - WIND_CUTOFF.low) * climbed, now, FOLLOW);

    VOICES.forEach((voice, index) => {
      const gain = this.voiceGains[index];
      if (gain) rampTo(gain.gain, voice.gain * smoothstep(voice.from, voice.to, climbed), now, FOLLOW);
    });
  }

  /** Desliga tudo e devolve a música ao volume normal. */
  stop(seconds = FADE_OUT): void {
    const { context, master, sources } = this;
    this.context = null;
    this.master = null;
    this.windGain = null;
    this.windFilter = null;
    this.voiceGains = [];
    this.sources = [];
    if (!context || !master) return;

    const now = context.currentTime;
    rampTo(master.gain, 0, now, seconds);
    for (const source of sources) source.stop(now + seconds + 0.05);
    setTimeout(() => master.disconnect(), (seconds + 0.2) * 1000);
    audioManager.duckMusic(1, seconds);
  }

  private createWind(context: AudioContext, master: GainNode, now: number): void {
    const source = context.createBufferSource();
    source.buffer = createNoiseBuffer(context);
    source.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(WIND_CUTOFF.low, now);
    filter.Q.setValueAtTime(0.6, now);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);

    // Rajadas: um oscilador lento somando ao volume, para o vento respirar.
    const gust = context.createOscillator();
    gust.type = "sine";
    gust.frequency.setValueAtTime(0.07, now);
    const gustDepth = context.createGain();
    gustDepth.gain.setValueAtTime(WIND_VOLUME * 0.35, now);
    gust.connect(gustDepth).connect(gain.gain);

    source.connect(filter).connect(gain).connect(master);
    source.start(now);
    gust.start(now);
    this.sources.push(source, gust);
    this.windGain = gain;
    this.windFilter = filter;
  }

  private createBed(context: AudioContext, master: GainNode, now: number): void {
    const bed = context.createGain();
    bed.gain.setValueAtTime(BED_VOLUME, now);
    bed.connect(master);

    for (const voice of VOICES) {
      const oscillator = context.createOscillator();
      oscillator.type = voice.type;
      oscillator.frequency.setValueAtTime(voice.frequency, now);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);

      oscillator.connect(gain).connect(bed);
      oscillator.start(now);
      this.sources.push(oscillator);
      this.voiceGains.push(gain);
    }
  }
}

export const hillsideAudio = new HillsideAudio();
