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
    // Depois das duas primeiras lembranças, a porteira deixa de ser lembrança
    // e vira caminho: é por ela que a Aysha segue para o labirinto.
    travel: {
      zone: "labyrinth",
      prompt: "Abrir a porteira",
      requires: { memories: ["childhood-ride", "parents-night"] },
    },
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
    memory: { id: "parents-night", prompt: "Pegar o cavalinho", afterDialogue: "poi-house-horse-after" },
  },
  houseWindow: {
    zone: "arrival",
    kind: "window",
    position: [-44.15, 9.5],
    prompt: "Olhar pela janela",
    dialogue: "poi-house-window",
  },
  // ── No labirinto (planta em game/world/labyrinth.ts) ──────────────────────
  // A pilha de pedras fica do lado de fora, na chegada: a marca do caminho de
  // volta. As outras estão nos corredores e na câmara do meio.
  labyrinthReturn: {
    zone: "labyrinth",
    kind: "cairn",
    position: [-1.6, -55],
    prompt: "Examinar",
    dialogue: "poi-lab-return",
    travel: { zone: "arrival", prompt: "Voltar para o campo" },
  },
  labyrinthFlowers: {
    zone: "labyrinth",
    kind: "flowers",
    // Corredor oeste do segundo anel.
    position: [-8.4, -80.6],
    prompt: "Observar",
    dialogue: "poi-lab-flowers",
  },
  labyrinthMark: {
    zone: "labyrinth",
    kind: "cairn",
    // Corredor leste do segundo anel.
    position: [12.4, -80.6],
    prompt: "Examinar",
    dialogue: "poi-lab-mark",
  },
  labyrinthNote: {
    zone: "labyrinth",
    kind: "note",
    // O centro exato: a câmara com uma entrada só.
    position: [2, -78],
    prompt: "Examinar",
    dialogue: "poi-lab-note",
    memory: { id: "the-names", prompt: "Ler o papel", afterDialogue: "poi-lab-note-after" },
  },
  // A saída norte. Tomada por ferro retorcido enquanto a Aysha acredita nos
  // dois; no instante em que ela para de acreditar, o ferro não está mais lá —
  // e é por aqui que se vai para a colina.
  labyrinthExit: {
    zone: "labyrinth",
    kind: "boulder",
    position: [2, -96.2],
    prompt: "Examinar",
    dialogue: "poi-lab-exit",
    travel: {
      zone: "hillside",
      prompt: "Seguir para a colina",
      requires: { flags: ["they-lied"] },
      clears: true,
    },
    obstacleRadius: 1.3,
  },
  // A pedra virada para a colina, como um banco. Depois de reconhecer os dois,
  // é sentada aqui que a Aysha lembra do resto — inclusive do fim.
  overlook: {
    zone: "arrival",
    kind: "boulder",
    position: [11, -29],
    prompt: "Olhar a colina",
    dialogue: "poi-overlook",
    memory: { id: "after", prompt: "Sentar na pedra", afterDialogue: "poi-overlook-after" },
    obstacleRadius: 1.3,
  },
  // ── Na encosta (caminho em game/world/terrain.ts) ─────────────────────────
  // Sete paradas ao longo de meio quilômetro de subida. Nenhuma delas guarda
  // resposta nenhuma: a esta altura a Aysha já sabe tudo que precisava saber.
  // Elas existem para dar ritmo à caminhada e para ela poder olhar para trás.
  hillsideFlowers: {
    zone: "hillside",
    kind: "flowers",
    // No fundo do vale, onde a água junta.
    position: [19.5, -404],
    prompt: "Observar",
    dialogue: "poi-hill-flowers",
  },
  hillsideFence: {
    zone: "hillside",
    kind: "fence",
    // Os últimos postes, no pé da subida: a cerca do campo acabava aqui.
    position: [29, -462],
    prompt: "Examinar",
    dialogue: "poi-hill-fence",
  },
  hillsideCairn: {
    zone: "hillside",
    kind: "cairn",
    position: [4, -522],
    prompt: "Examinar",
    dialogue: "poi-hill-cairn",
  },
  // A curva do caminho, no ponto mais a oeste: daqui se vê a subida inteira
  // já andada, e o campo lá embaixo virou um detalhe.
  hillsideLookout: {
    zone: "hillside",
    kind: "boulder",
    position: [-14, -566],
    prompt: "Olhar para trás",
    dialogue: "poi-hill-lookout",
    obstacleRadius: 1.3,
  },
  hillsideHorseshoe: {
    zone: "hillside",
    kind: "horseshoe",
    position: [17, -664],
    prompt: "Examinar",
    dialogue: "poi-hill-horseshoe",
  },
  // A árvore do cume: o desenho da parede, de perto. O tronco é parte do
  // mundo (scene/world/LoneTree); aqui existe só o ponto de interação.
  summitTree: {
    zone: "hillside",
    kind: "tree",
    position: [38.6, -715.5],
    prompt: "Tocar a árvore",
    dialogue: "poi-summit-tree",
  },
  // No fundo da concha, do outro lado do cume.
  hollowStone: {
    zone: "hillside",
    kind: "boulder",
    position: [45, -789],
    prompt: "Examinar",
    dialogue: "poi-hollow-stone",
    obstacleRadius: 1.3,
  },
} as const satisfies Record<string, PointOfInterest>;

export type PointOfInterestId = keyof typeof pointsOfInterest;
