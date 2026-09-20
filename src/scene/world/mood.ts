import { Color } from "three";
import { playerConfig } from "@/game/config/player";
import { lightMoods, worldMoods, type LightMoodId } from "@/game/config/render";
import { selectActiveMemoryTone, useGameStore } from "@/game/state/gameStore";
import { ascentAt } from "@/game/world/hillside";
import { worldMoodOf } from "@/game/story/worldMood";

// Para onde a luz, o céu e a neblina devem ir agora. Duas coisas mandam nisso:
//
//   a história  — o Além muda de cor quando a Aysha entende quem são os dois;
//   a altura    — na subida, o clima vai virando metro a metro até o cume.
//
// A lembrança em andamento passa na frente das duas: enquanto ela dura, o
// mundo é o clima dela. Aqui só se decide o alvo; quem alcança o alvo devagar
// são os componentes da cena, para nada nunca piscar.

/** Um alvo: a mistura de dois climas. Com `t` em 0, é só o primeiro. */
export interface MoodBlend {
  from: LightMoodId;
  to: LightMoodId;
  t: number;
}

/** Cores de cada clima, criadas uma vez: o loop só interpola. */
const lightColors = Object.fromEntries(
  Object.entries(lightMoods).map(([id, mood]) => [
    id,
    { sun: new Color(mood.sunColor), sky: new Color(mood.skyColor), ground: new Color(mood.groundColor) },
  ]),
) as Record<LightMoodId, { sun: Color; sky: Color; ground: Color }>;

const airColors = Object.fromEntries(
  Object.entries(worldMoods).map(([id, mood]) => [
    id,
    { horizon: new Color(mood.horizonColor), zenith: new Color(mood.zenithColor) },
  ]),
) as Record<keyof typeof worldMoods, { horizon: Color; zenith: Color }>;

/**
 * O quanto da subida já foi vencido (0 a 1), e 0 fora da encosta. Vem da
 * altura do chão sob a câmera — por isso vale mesmo se o jogador sair da
 * trilha, e volta a cair se ele descer.
 */
export function ascentNow(cameraY: number): number {
  const state = useGameStore.getState();
  return state.zone === "hillside" ? ascentAt(cameraY - playerConfig.eyeHeight) : 0;
}

/** Clima das luzes. A lembrança, quando existe, é a única coisa que importa. */
export function lightBlend(cameraY: number): MoodBlend {
  const tone = selectActiveMemoryTone(useGameStore.getState());
  if (tone) return { from: tone, to: tone, t: 0 };
  return { from: worldMoodOf(useGameStore.getState()), to: "summit", t: ascentNow(cameraY) };
}

/**
 * Clima do ar. As lembranças de propósito não mexem na neblina: elas acontecem
 * neste mesmo campo, e o campo continua onde estava.
 */
export function airBlend(cameraY: number): { from: keyof typeof worldMoods; to: keyof typeof worldMoods; t: number } {
  return { from: worldMoodOf(useGameStore.getState()), to: "summit", t: ascentNow(cameraY) };
}

const mix = (from: number, to: number, t: number) => from + (to - from) * t;

/** Alvo das luzes, já misturado. Escreve em `into` para não alocar por quadro. */
export function resolveLight(
  blend: MoodBlend,
  into: { sun: number; sky: number; sunColor: Color; skyColor: Color; groundColor: Color },
): void {
  const from = lightMoods[blend.from];
  const to = lightMoods[blend.to];
  into.sun = mix(from.sun, to.sun, blend.t);
  into.sky = mix(from.sky, to.sky, blend.t);
  into.sunColor.lerpColors(lightColors[blend.from].sun, lightColors[blend.to].sun, blend.t);
  into.skyColor.lerpColors(lightColors[blend.from].sky, lightColors[blend.to].sky, blend.t);
  into.groundColor.lerpColors(lightColors[blend.from].ground, lightColors[blend.to].ground, blend.t);
}

/** Alvo do ar, já misturado. */
export function resolveAir(
  blend: ReturnType<typeof airBlend>,
  into: { density: number; horizon: Color; zenith: Color },
): void {
  into.density = mix(worldMoods[blend.from].fogDensity, worldMoods[blend.to].fogDensity, blend.t);
  into.horizon.lerpColors(airColors[blend.from].horizon, airColors[blend.to].horizon, blend.t);
  into.zenith.lerpColors(airColors[blend.from].zenith, airColors[blend.to].zenith, blend.t);
}
