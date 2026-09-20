import type { MachineAlert } from "@/game/machine/machineLogic";
import { audioManager } from "./audioManager";

/**
 * O zumbido metálico de que o Victor fala, sintetizado na hora (ainda não há
 * trilhas em /public). Duas serras quase afinadas entre si batendo uma na
 * outra: fica mais alto e mais agudo conforme a máquina se aproxima e desconfia.
 *
 *   update(distance, alert) a cada frame ──► stop()
 *
 * Sem o gesto que libera o áudio tudo vira silêncio, sem erro.
 */

/** Até onde o zumbido é ouvido (m). */
const RANGE = 26;
/** Volume no ponto mais próximo. */
const MAX_GAIN = 0.32;
/** Frequência base do zumbido (Hz) e o quanto cada estado a puxa para cima. */
const BASE_FREQUENCY = 62;
const alertTone: Record<MachineAlert, { pitch: number; gain: number; cutoff: number }> = {
  calm: { pitch: 1, gain: 0.7, cutoff: 900 },
  detect: { pitch: 1.18, gain: 1, cutoff: 1500 },
  chase: { pitch: 1.5, gain: 1.25, cutoff: 2600 },
};

/** Tempo das mudanças de volume e de altura (s): curto, mas sem degraus. */
const RAMP = 0.2;

class MachineAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscillators: OscillatorNode[] = [];

  /**
   * Coloca o zumbido onde a máquina está. `distance` em metros, ou `null`
   * quando não há máquina alguma (ou o jogo está parado): silêncio.
   */
  update(distance: number | null, alert: MachineAlert): void {
    if (distance === null || distance > RANGE) {
      this.rampGain(0);
      return;
    }
    if (!this.start()) return;

    const tone = alertTone[alert];
    // Perto = alto; a queda é suave no meio do caminho e some na borda.
    const closeness = Math.max(0, 1 - distance / RANGE) ** 1.6;
    this.rampGain(MAX_GAIN * closeness * tone.gain);

    const now = this.context!.currentTime;
    const frequency = BASE_FREQUENCY * tone.pitch;
    this.oscillators.forEach((oscillator, index) => {
      // A segunda serra fica um triz fora: é o batimento que incomoda.
      oscillator.frequency.setTargetAtTime(frequency * (index === 0 ? 1 : 1.012), now, RAMP);
    });
    this.filter?.frequency.setTargetAtTime(tone.cutoff, now, RAMP);
  }

  /** Desliga o zumbido (ao desmontar a máquina). */
  stop(): void {
    const { context, master } = this;
    const oscillators = this.oscillators;
    this.context = null;
    this.master = null;
    this.filter = null;
    this.oscillators = [];
    if (!context || !master) return;
    const now = context.currentTime;
    master.gain.setTargetAtTime(0, now, 0.2);
    for (const oscillator of oscillators) oscillator.stop(now + 1);
    setTimeout(() => master.disconnect(), 1200);
  }

  /** Monta o zumbido na primeira vez que ele precisa soar. */
  private start(): boolean {
    if (this.master) return true;
    const context = audioManager.audioContext();
    if (!context) return false;
    const now = context.currentTime;

    const master = context.createGain();
    master.gain.setValueAtTime(0, now);
    master.connect(context.destination);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(alertTone.calm.cutoff, now);
    filter.connect(master);

    for (const detune of [1, 1.012]) {
      const oscillator = context.createOscillator();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(BASE_FREQUENCY * detune, now);
      const voice = context.createGain();
      voice.gain.setValueAtTime(0.5, now);
      oscillator.connect(voice).connect(filter);
      oscillator.start(now);
      this.oscillators.push(oscillator);
    }

    this.context = context;
    this.master = master;
    this.filter = filter;
    return true;
  }

  private rampGain(value: number): void {
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(value, this.context.currentTime, RAMP);
  }
}

export const machineAudio = new MachineAudio();
