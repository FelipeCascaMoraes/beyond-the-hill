import { existsSync } from "node:fs";
import { join } from "node:path";
import { assetManifest, modelIds, type ModelId } from "./manifest";

/**
 * Quais modelos do manifesto existem de fato em /public. Roda só no servidor
 * (no build, e a cada pedido em desenvolvimento): o jogo fica sabendo de
 * antemão o que pode carregar, em vez de pedir um arquivo e descobrir pelo
 * erro. Um modelo que falta não quebra nada — quem o usaria continua como está.
 */
export function availableModels(): ModelId[] {
  return modelIds.filter((id) => existsSync(join(process.cwd(), "public", assetManifest.models[id])));
}
