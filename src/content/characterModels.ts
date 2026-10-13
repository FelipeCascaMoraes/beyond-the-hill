import type { ModelId } from "../assets/manifest";
import type { CharacterId } from "./characters";

// O modelo 3D de cada personagem. Só dados: quem carrega e anima é
// scene/actors/CharacterModel. Um personagem sem entrada aqui (ou cujo arquivo
// ainda não existe) continua com a figura de primitivas de NpcFigure.

export interface CharacterModelConfig {
  /** Arquivo, pelo nome no manifesto de assets. */
  model: ModelId;
  /**
   * Altura total que o modelo deve ter no jogo (m), dos pés ao ponto mais alto
   * — cabelo e chapéu incluídos. O arquivo pode vir em qualquer escala: é por
   * este número que os personagens ficam proporcionais entre si.
   */
  height: number;
  /**
   * Giro para o modelo olhar para +Z, a frente das figuras do jogo (rad). O
   * padrão do glTF já é esse; só preencher se o arquivo vier virado.
   */
  rotationY?: number;
}

export const characterModels = {
  // Só aparece com a câmera em 3ª pessoa (scene/player/AyshaBody).
  // O arquivo é montado por scripts/models/build-aysha.mjs.
  aysha: { model: "aysha", height: 1.7 },
  // Com o coque.
  cassandra: { model: "cassandra", height: 1.76 },
  // Com o chapéu.
  victor: { model: "victor", height: 1.96 },
} as const satisfies Partial<Record<CharacterId, CharacterModelConfig>>;

/** O modelo deste personagem, se ele tiver um declarado. */
export function characterModelOf(id: CharacterId): CharacterModelConfig | null {
  const models: Partial<Record<CharacterId, CharacterModelConfig>> = characterModels;
  return models[id] ?? null;
}
