import type { PointOfInterest } from "./types";

// Pontos de interesse: pequenas coisas no campo que despertam lembranças.
// Posições no plano XZ (a altura vem do terreno); a aparência de cada `kind`
// fica em scene/poi. Todos dentro da área explorável da chegada.

export const pointsOfInterest = {
  horseshoe: {
    zone: "arrival",
    kind: "horseshoe",
    position: [-2.6, -21.5],
    prompt: "Examinar",
    dialogue: "poi-horseshoe",
  },
  fence: {
    zone: "arrival",
    kind: "fence",
    position: [-15.5, -19],
    prompt: "Examinar",
    dialogue: "poi-fence",
  },
  cairn: {
    zone: "arrival",
    kind: "cairn",
    position: [15, -6],
    prompt: "Examinar",
    dialogue: "poi-cairn",
    obstacleRadius: 0.5,
  },
  flowers: {
    zone: "arrival",
    kind: "flowers",
    position: [-19, 10],
    prompt: "Observar",
    dialogue: "poi-flowers",
  },
  overlook: {
    zone: "arrival",
    kind: "boulder",
    position: [11, -29],
    prompt: "Olhar a colina",
    dialogue: "poi-overlook",
    obstacleRadius: 1.3,
  },
} as const satisfies Record<string, PointOfInterest>;

export type PointOfInterestId = keyof typeof pointsOfInterest;
