import type { SpawnPose } from "./playerController.ts";

// Um pedido para pôr a Aysha em outro lugar, fora do renascimento da zona.
// Quem pede é uma cena, no fim: o controle volta exatamente onde o último
// enquadramento estava, e a câmera não precisa emendar nada. O controlador do
// jogador pega o pedido no quadro seguinte.

let pending: SpawnPose | null = null;

export function requestPlacement(pose: SpawnPose): void {
  pending = pose;
}

/** O pedido em aberto, se houver — e ele deixa de estar em aberto. */
export function takePlacement(): SpawnPose | null {
  const pose = pending;
  pending = null;
  return pose;
}
