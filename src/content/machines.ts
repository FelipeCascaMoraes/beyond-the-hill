import type { MachineDefinition } from "./types";

// As máquinas do Além: só dados. A lógica (patrulha, detecção, perseguição)
// é genérica e vive em game/machine/machineLogic.ts.
//
// Victor avisa sobre elas antes de existir alguma ("victor-machines"): um
// zumbido metálico, campo aberto é perigo, o jeito é se esconder.

export const machines = {
  /**
   * A primeira: guarda o trecho do campo entre a trilha e a casa abandonada.
   * Só aparece depois da primeira lembrança — o Além deixa de ser só bonito.
   *
   * Duas saídas, as duas que o Victor descreveu: correr de volta para o leste,
   * até fora do território dela, ou entrar na casa e esperar passar.
   */
  "field-sentinel": {
    zone: "arrival",
    title: "a máquina",
    requires: { flags: ["first-memory"] },
    route: [
      [-30, -2],
      [-32, 16],
      [-18, 20],
      [-14, 2],
    ],
    pause: 2.6,
    // Não alcança nem a trilha onde Cassandra e Victor esperam, nem a colina.
    territory: { center: [-24, 8], radius: 22 },
    vision: { range: 17, halfAngle: 0.7, awareness: 4.5 },
    // Perseguição mais rápida que a caminhada (2.4) e mais lenta que a corrida (3.8).
    speed: { patrol: 1.5, chase: 3, return: 2.2 },
    timing: { detect: 1.3, lose: 3.5 },
    reach: 1.6,
    hover: 1.9,
  },
} as const satisfies Record<string, MachineDefinition>;

export type MachineId = keyof typeof machines;
