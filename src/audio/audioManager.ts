import { assetManifest, type AudioId } from "@/assets/manifest";

/**
 * Áudio global (música e ambiente), fora da árvore React.
 * Navegadores bloqueiam autoplay: `unlock()` deve ser chamado no primeiro
 * gesto do usuário (botão "Começar") — é lá que nasce o AudioContext
 * compartilhado pelos sons sintetizados (ver audio/memoryAudio.ts).
 * Sons posicionais 3D ficarão na cena via THREE.PositionalAudio.
 */
class AudioManager {
  private unlocked = false;
  private music: HTMLAudioElement | null = null;
  private volume = 0.8;
  private context: AudioContext | null = null;
  /** Fator sobre o volume da música (1 = normal): usado para abaixá-la. */
  private duck = 1;
  private duckFrame: number | null = null;

  unlock() {
    this.unlocked = true;
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
  }

  /** Contexto para sons sintetizados; null enquanto o áudio não foi liberado. */
  audioContext(): AudioContext | null {
    return this.unlocked ? this.context : null;
  }

  playMusic(id: AudioId) {
    if (!this.unlocked) return;
    this.stopMusic();
    const track = new Audio(assetManifest.audio[id]);
    track.loop = true;
    track.volume = this.volume * this.duck;
    track.play().catch((error: unknown) => {
      console.error(`Error in playMusic(${id}):`, error);
    });
    this.music = track;
  }

  stopMusic() {
    this.music?.pause();
    this.music = null;
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyVolume();
  }

  /**
   * Leva a música a `factor` do volume normal em `seconds` (1 devolve ao
   * normal). Usado para abrir espaço durante as lembranças.
   */
  duckMusic(factor: number, seconds: number) {
    if (this.duckFrame !== null) cancelAnimationFrame(this.duckFrame);
    if (typeof requestAnimationFrame === "undefined" || seconds <= 0) {
      this.duck = factor;
      this.applyVolume();
      return;
    }
    const from = this.duck;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (seconds * 1000));
      this.duck = from + (factor - from) * t;
      this.applyVolume();
      this.duckFrame = t < 1 ? requestAnimationFrame(step) : null;
    };
    this.duckFrame = requestAnimationFrame(step);
  }

  private applyVolume() {
    if (this.music) this.music.volume = this.volume * this.duck;
  }
}

export const audioManager = new AudioManager();
