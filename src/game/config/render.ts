import type { MemoryTone } from "../../content/types.ts";

// Parâmetros de renderização e atmosfera compartilhados pela cena.

type Vec3Tuple = [number, number, number];

interface CameraPose {
  position: Vec3Tuple;
  target: Vec3Tuple;
}

export const renderConfig = {
  camera: {
    fov: 50,
    near: 0.1,
    far: 2600,
  },
} as const;

/**
 * Abertura (alturas relativas ao chão): Aysha deitada na grama olhando o céu.
 * O destino é a pose inicial do jogador, definida pela zona.
 */
export const cameraIntro = {
  from: { position: [0.25, 0.3, 0.5], target: [6, 40, -18] } satisfies CameraPose,
  duration: 6.5,
} as const;

/** Paleta do Além: fim de tarde enevoado, luz quente atrás da colina. */
export const atmosphere = {
  /** Cor do horizonte e da neblina: precisam ser idênticas para o fundo se fundir. */
  horizonColor: "#cfc3a8",
  zenithColor: "#4f6078",
  sunColor: "#ffd49a",
  /** Direção de onde vem a luz: logo atrás da árvore no cume da colina. */
  sunDirection: [0.08, 0.235, -0.97] as Vec3Tuple,
  /** Neblina exponencial, mais densa rente ao chão (ver shaders/heightFog.ts). */
  fogDensity: 0.0026,
  /** Quanto a neblina afina com a altura (por metro). */
  fogHeightFalloff: 0.02,
  /** Densidade mínima no alto, relativa à do chão. */
  fogMinFactor: 0.3,
  skyRadius: 2300,
  groundColor: "#56603a",
  groundColorAlt: "#6e6c42",
  trailColor: "#6e6844",
  treeColor: "#26261c",
  grassBaseColor: "#232c17",
  grassTipColor: "#8c9460",
  moteColor: "#ffe6b8",
} as const;

/** Intensidade e cor das duas luzes do mundo (ver scene/world/Lighting). */
interface LightMood {
  /** Sol (direcional) e céu (hemisférica). */
  sun: number;
  sky: number;
  sunColor: string;
  skyColor: string;
  /** Luz que sobe do chão, na hemisférica. */
  groundColor: string;
}

/**
 * Como a luz do mundo reage a uma lembrança. A cena não corta para outro lugar:
 * é o mesmo campo que esquenta quando a memória é boa e perde a cor quando não é.
 */
export const memoryMood = {
  idle: { sun: 1.8, sky: 1.9, sunColor: atmosphere.sunColor, skyColor: "#d3d4d0", groundColor: "#4a4430" },
  warm: { sun: 2.7, sky: 1.5, sunColor: "#ffc98a", skyColor: "#e7d4ad", groundColor: "#5c4a26" },
  cold: { sun: 0.6, sky: 0.9, sunColor: "#a6b6c6", skyColor: "#8d9aab", groundColor: "#282d34" },
} as const satisfies Record<"idle" | MemoryTone, LightMood>;

export type MemoryMoodId = keyof typeof memoryMood;
