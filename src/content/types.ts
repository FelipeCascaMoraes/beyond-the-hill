// Tipos dos dados narrativos. Nada aqui depende de React ou Three.js.

export type Vec3 = readonly [number, number, number];

export interface Character {
  name: string;
  /** Cor provisória usada enquanto não há modelo 3D. */
  placeholderColor: string;
}

/** Área explorável: círculo no plano XZ. */
export interface ZoneBounds {
  center: readonly [number, number];
  radius: number;
}

export interface Zone {
  title: string;
  /** Posição inicial da Aysha ao entrar na zona (y é ignorado: vem do terreno). */
  playerSpawn: Vec3;
  /** Para onde a Aysha olha ao entrar na zona. */
  spawnLookAt: Vec3;
  bounds: ZoneBounds;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface Dialogue {
  lines: readonly DialogueLine[];
}

export interface Memory {
  title: string;
  text: string;
}

export type EndingChoice = "forgive" | "revenge";
