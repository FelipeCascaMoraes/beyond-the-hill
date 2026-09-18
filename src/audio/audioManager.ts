import { assetManifest, type AudioId } from "@/assets/manifest";

/**
 * Áudio global (música e ambiente), fora da árvore React.
 * Navegadores bloqueiam autoplay: `unlock()` deve ser chamado no primeiro
 * gesto do usuário (botão "Começar").
 * Sons posicionais 3D ficarão na cena via THREE.PositionalAudio.
 */
class AudioManager {
  private unlocked = false;
  private music: HTMLAudioElement | null = null;
  private volume = 0.8;

  unlock() {
    this.unlocked = true;
  }

  playMusic(id: AudioId) {
    if (!this.unlocked) return;
    this.stopMusic();
    const track = new Audio(assetManifest.audio[id]);
    track.loop = true;
    track.volume = this.volume;
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
    if (this.music) this.music.volume = this.volume;
  }
}

export const audioManager = new AudioManager();
