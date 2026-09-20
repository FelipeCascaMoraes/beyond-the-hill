// Ajuste fino da sensação de caminhar. Unidades: metros, segundos, radianos.

export interface PlayerConfig {
  eyeHeight: number;
  /** Velocidade de caminhada (m/s): ritmo de exploração, sem pressa. */
  walkSpeed: number;
  /** Velocidade de corrida (m/s): só para fugir. Precisa vencer as máquinas. */
  runSpeed: number;
  /** Rapidez para atingir a velocidade (maior = mais responsivo). */
  acceleration: number;
  /** Rapidez para parar ao soltar as teclas. */
  deceleration: number;
  /** Radianos por pixel de mouse. */
  lookSensitivity: number;
  /** Suavização do olhar (maior = menos atraso). */
  lookSmoothing: number;
  /** Limite para olhar para cima/baixo. */
  maxPitch: number;
  /** Suavização da altura ao subir/descer o terreno. */
  groundSmoothing: number;
  /** Faixa antes do limite em que o passo vai perdendo força. */
  boundsSoftMargin: number;
  /** Raio do corpo da Aysha para colisão com obstáculos (m). */
  bodyRadius: number;
  /**
   * O passo encurta na subida. Até `easySlope` não muda nada; em `hardSlope`
   * sobra `minFactor` da velocidade. Descer não acelera: a Aysha não corre
   * morro abaixo.
   */
  climb: { easySlope: number; hardSlope: number; minFactor: number };
  headBob: {
    /** Amplitude vertical do passo (m). */
    amplitude: number;
    /** Passos por metro caminhado. */
    stepsPerMeter: number;
  };
}

export const playerConfig: PlayerConfig = {
  eyeHeight: 1.62,
  walkSpeed: 2.4,
  runSpeed: 3.8,
  acceleration: 6,
  deceleration: 8,
  lookSensitivity: 0.0016,
  lookSmoothing: 18,
  maxPitch: 1.3,
  groundSmoothing: 10,
  boundsSoftMargin: 5,
  bodyRadius: 0.3,
  // Até 8° é campo; 30° é a encosta da colina, onde ela sobe a 60% do passo.
  climb: { easySlope: 0.14, hardSlope: 0.52, minFactor: 0.6 },
  headBob: {
    amplitude: 0.02,
    stepsPerMeter: 0.85,
  },
};
