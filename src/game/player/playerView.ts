// Onde a Aysha está agora, publicado pelo controlador do jogador a cada quadro
// para o resto da cena. Em 1ª pessoa isto é a própria câmera; em 3ª pessoa a
// câmera fica metros atrás, e quem precisa saber onde *ela* está — as
// máquinas, os gatilhos de lugar, o alcance da mão — não pode mais perguntar à
// câmera. Um objeto só, reescrito no lugar: nada é alocado por quadro.

export const playerView = {
  /**
   * A posição abaixo vale como "onde a Aysha está". Falso na abertura e
   * durante as cenas, quando quem conta a história é a câmera.
   */
  tracked: false,
  x: 0,
  /** Altura dos olhos (m, no mundo). */
  y: 0,
  z: 0,
  /** Altura do chão debaixo dela, suavizada como os olhos. */
  groundY: 0,
  /** Para onde ela olha (a câmera olha para -Z com yaw 0). */
  yaw: 0,
  velocityX: 0,
  velocityZ: 0,
  /** Fase do passo, em passos. */
  stepPhase: 0,
  /** Distância atual da câmera até os olhos dela (m): 0 em 1ª pessoa. */
  cameraDistance: 0,
};

interface Point {
  x: number;
  y: number;
  z: number;
}

/** Onde a Aysha está — ou, enquanto ninguém a controla, onde a câmera está. */
export const ayshaPosition = (camera: Point): Point => (playerView.tracked ? playerView : camera);
