// Caminhos de todos os assets servidos em /public.
// Todo asset precisa ser CC0 e registrado em public/CREDITS.md.

export const assetManifest = {
  models: {
    // Personagens: um arquivo por pessoa, com esqueleto e animações dentro
    // (ver public/models/characters/README.md para o que cada um precisa ter).
    aysha: "/models/characters/aysha.glb",
    cassandra: "/models/characters/cassandra.glb",
    victor: "/models/characters/victor.glb",
  },
  textures: {},
  audio: {},
} as const satisfies {
  models: Record<string, `/models/${string}.glb`>;
  textures: Record<string, `/textures/${string}`>;
  audio: Record<string, `/audio/${string}`>;
};

export type ModelId = keyof typeof assetManifest.models;
export type TextureId = keyof typeof assetManifest.textures;
export type AudioId = keyof typeof assetManifest.audio;

export const modelIds = Object.keys(assetManifest.models) as ModelId[];
