// Presets de qualidade. O preset é escolhido uma vez, no cliente, pelo que a
// máquina diz de si mesma; a resolução, essa, ainda se ajusta sozinha durante
// o jogo conforme o FPS medido (ver game/render/resolution.ts).

export interface QualitySettings {
  /** Teto do fator de resolução sobre os pixels CSS. */
  maxDpr: number;
  /**
   * Teto de pixels desenhados por quadro, qualquer que seja o monitor. A grama
   * custa por pixel: num monitor 4K o mesmo campo pesaria quatro vezes mais do
   * que em 1080p, e ninguém vê essa diferença debaixo da neblina.
   */
  pixelBudget: number;
  grassBlades: number;
  grassRadius: number;
  motes: number;
}

const presets = {
  low: { maxDpr: 1.25, pixelBudget: 2_300_000, grassBlades: 28000, grassRadius: 45, motes: 120 },
  high: { maxDpr: 1.5, pixelBudget: 5_000_000, grassBlades: 90000, grassRadius: 70, motes: 280 },
} as const satisfies Record<string, QualitySettings>;

/**
 * Placas que não dão conta do campo cheio: renderização por software e vídeo
 * integrado. Uma Intel Arc é placa dedicada (ou integrada forte) e fica de fora.
 */
const WEAK_GPU = /swiftshader|llvmpipe|software|basic render|intel(?!.*\barc\b)|radeon\(tm\) graphics|radeon.*vega|mali|adreno|powervr/i;

/**
 * Nome da placa de vídeo, ou "" se o navegador não disser. Usa um contexto
 * descartável, com a mesma preferência de energia do jogo — num notebook de
 * duas placas, é a que o jogo vai receber.
 */
function gpuName(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl", { powerPreference: "high-performance" });
    if (!gl) return "";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return "";
  }
}

function detectTier(): keyof typeof presets {
  if (typeof window === "undefined") return "high";
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarsePointer || fewCores || WEAK_GPU.test(gpuName()) ? "low" : "high";
}

let cached: QualitySettings | null = null;

export function getQualitySettings(): QualitySettings {
  cached ??= presets[detectTier()];
  return cached;
}
