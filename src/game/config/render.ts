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
    far: 1600,
  },
} as const;

/** Câmera de abertura (y relativo ao chão): entre a grama, olhando a colina; sobe até ficar atrás da Aysha. */
export const cameraIntro = {
  from: { position: [0, 0.75, 24], target: [20, 70, -380] } satisfies CameraPose,
  to: { position: [1.2, 2.6, 8.5], target: [3, 6, -60] } satisfies CameraPose,
  duration: 6,
} as const;

/** Paleta do Além: fim de tarde enevoado, luz quente atrás da colina. */
export const atmosphere = {
  /** Cor do horizonte e da neblina: precisam ser idênticas para o fundo se fundir. */
  horizonColor: "#cfc3a8",
  zenithColor: "#4f6078",
  sunColor: "#ffd49a",
  /** Direção de onde vem a luz: logo acima da crista da colina. */
  sunDirection: [0.05, 0.29, -0.956] as Vec3Tuple,
  fogDensity: 0.0032,
  skyRadius: 1100,
  groundColor: "#434b2c",
  groundColorAlt: "#5a5a36",
  grassBaseColor: "#232c17",
  grassTipColor: "#8c9460",
  moteColor: "#ffe6b8",
} as const;
