// Presets de qualidade. Detectados uma vez no cliente, sem medir FPS por enquanto.

export interface QualitySettings {
  dpr: [number, number];
  grassBlades: number;
  grassRadius: number;
  motes: number;
}

const presets = {
  low: { dpr: [1, 1.25], grassBlades: 28000, grassRadius: 45, motes: 120 },
  high: { dpr: [1, 1.5], grassBlades: 90000, grassRadius: 70, motes: 280 },
} as const satisfies Record<string, QualitySettings>;

function detectTier(): keyof typeof presets {
  if (typeof window === "undefined") return "high";
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarsePointer || fewCores ? "low" : "high";
}

let cached: QualitySettings | null = null;

export function getQualitySettings(): QualitySettings {
  cached ??= presets[detectTier()];
  return cached;
}
