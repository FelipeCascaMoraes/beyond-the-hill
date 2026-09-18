// Caminhos de todos os assets servidos em /public.
// Todo asset precisa ser CC0 e registrado em public/CREDITS.md.

export const assetManifest = {
  models: {},
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
