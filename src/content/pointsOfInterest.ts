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
  // A porteira no fim da trilha, no limite do campo, virada para a colina:
  // o lugar onde o pai sempre dava meia-volta. Gatilho da primeira memória.
  gate: {
    zone: "arrival",
    kind: "gate",
    position: [-2.45, -30],
    rotation: -0.08,
    prompt: "Examinar",
    dialogue: "poi-gate",
    memory: { id: "childhood-ride", prompt: "Tocar a porteira", afterDialogue: "poi-gate-after" },
    obstacleRadius: 1.4,
  },
  // ── Dentro da casa abandonada (centro em -44, 12; ver game/world/house.ts) ──
  houseDrawing: {
    zone: "arrival",
    kind: "drawing",
    // Pendurado por dentro da parede oeste, virado para a porta.
    position: [-46.86, 12.6],
    rotation: Math.PI / 2,
    prompt: "Examinar",
    dialogue: "poi-house-drawing",
  },
  houseTable: {
    zone: "arrival",
    kind: "table",
    position: [-44.3, 12.9],
    prompt: "Examinar",
    dialogue: "poi-house-table",
    obstacleRadius: 0.85,
  },
  houseHorse: {
    zone: "arrival",
    kind: "toy-horse",
    // No parapeito da janela norte, olhando para a colina.
    position: [-43.62, 9.5],
    rotation: Math.PI,
    prompt: "Examinar",
    dialogue: "poi-house-horse",
  },
  houseWindow: {
    zone: "arrival",
    kind: "window",
    position: [-44.15, 9.5],
    prompt: "Olhar pela janela",
    dialogue: "poi-house-window",
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
