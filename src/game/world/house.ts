// Planta da casa abandonada. Fonte única para a geometria (scene) e a colisão
// (jogador): as paredes desenhadas são exatamente as paredes que bloqueiam.
//
// Coordenadas locais em metros, origem no centro do piso, sem rotação:
//   x: oeste (-) → leste (+)   z: norte (-, lado da colina) → sul (+)
//
//            janela (vista para a colina)
//        ┌──────────┐ ┌──────────┐   norte (z = -2.5)
//        │                        │
//  oeste │   desenho      mesa    ▯ porta (leste)
//        │                        │
//        └────┐ rombo ┌───────────┘   sul (z = +2.5)

/** Onde a casa está no mundo. */
export const HOUSE = {
  zone: "arrival",
  x: -44,
  z: 12,
  width: 6,
  depth: 5,
  wallHeight: 2.5,
  wallThickness: 0.2,
  ridgeHeight: 3.7,
  floorThickness: 0.12,
} as const;

/** Um bloco de parede local (centro + tamanho), da altura `y0` até `y0 + height`. */
export interface WallBlock {
  x: number;
  z: number;
  sizeX: number;
  sizeZ: number;
  y0: number;
  height: number;
}

const T = HOUSE.wallThickness;
const H = HOUSE.wallHeight;
const HALF_W = HOUSE.width / 2;
const HALF_D = HOUSE.depth / 2;

/** Janela na parede norte, virada para a colina. */
export const HOUSE_WINDOW = { x: 0, width: 1.6, sill: 0.9, top: 2.15 } as const;
/** Porta na parede leste, virada para o campo. */
export const HOUSE_DOOR = { z: 0, width: 1.1, height: 2.05 } as const;
/** Rombo na parede sul (parte de baixo caiu). */
const BREACH = { from: -2.1, to: -1.1, height: 1.7 } as const;

const northZ = -HALF_D;
const southZ = HALF_D;
const eastX = HALF_W;
const westX = -HALF_W;
const winL = HOUSE_WINDOW.x - HOUSE_WINDOW.width / 2;
const winR = HOUSE_WINDOW.x + HOUSE_WINDOW.width / 2;
const doorN = HOUSE_DOOR.z - HOUSE_DOOR.width / 2;
const doorS = HOUSE_DOOR.z + HOUSE_DOOR.width / 2;

/** Segmento de parede ao longo de X (paredes norte/sul). */
const alongX = (z: number, from: number, to: number, y0: number = 0, top: number = H): WallBlock => ({
  x: (from + to) / 2,
  z,
  sizeX: to - from,
  sizeZ: T,
  y0,
  height: top - y0,
});

/** Segmento de parede ao longo de Z (paredes leste/oeste). */
const alongZ = (x: number, from: number, to: number, y0: number = 0, top: number = H): WallBlock => ({
  x,
  z: (from + to) / 2,
  sizeX: T,
  sizeZ: to - from,
  y0,
  height: top - y0,
});

export const HOUSE_WALLS: readonly WallBlock[] = [
  // Norte: janela para a colina.
  alongX(northZ, westX, winL),
  alongX(northZ, winR, eastX),
  alongX(northZ, winL, winR, 0, HOUSE_WINDOW.sill),
  alongX(northZ, winL, winR, HOUSE_WINDOW.top),
  // Sul: rombo na parte de baixo.
  alongX(southZ, westX, BREACH.from),
  alongX(southZ, BREACH.to, eastX),
  alongX(southZ, BREACH.from, BREACH.to, BREACH.height),
  // Leste: porta.
  alongZ(eastX, northZ, doorN),
  alongZ(eastX, doorS, southZ),
  alongZ(eastX, doorN, doorS, HOUSE_DOOR.height),
  // Oeste: inteira (o desenho fica pendurado aqui por dentro).
  alongZ(westX, northZ, southZ),
];

/** Paredes que tocam o chão, em coordenadas do mundo, para colisão. */
export function houseWallBoxes() {
  return HOUSE_WALLS.filter((wall) => wall.y0 === 0).map((wall) => ({
    minX: HOUSE.x + wall.x - wall.sizeX / 2,
    maxX: HOUSE.x + wall.x + wall.sizeX / 2,
    minZ: HOUSE.z + wall.z - wall.sizeZ / 2,
    maxZ: HOUSE.z + wall.z + wall.sizeZ / 2,
  }));
}

/** O ponto (mundo) está dentro das paredes da casa? */
export function isInsideHouse(x: number, z: number): boolean {
  return Math.abs(x - HOUSE.x) < HALF_W && Math.abs(z - HOUSE.z) < HALF_D;
}
