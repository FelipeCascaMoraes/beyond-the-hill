import type { Choice } from "./types";

// Escolhas: decisões da Aysha que o jogo guarda. Só dados. Para criar uma
// nova, basta uma entrada aqui e um passo `{ type: "choice" }` numa cena; o
// que vem depois se decide com `when: { choices: { id: valor } }` nos passos
// seguintes — ou em qualquer outra condição da história.

export const choices = {
  // O fim. Nenhuma das duas é a certa: os dois lados da tela têm o mesmo peso,
  // o mesmo tamanho, e nenhum vem marcado.
  ending: {
    prompt: "Aysha olha para os dois.",
    options: [
      { value: "forgive", label: "Perdoar" },
      { value: "revenge", label: "Vingar-se" },
    ],
  },
} as const satisfies Record<string, Choice>;

export type ChoiceId = keyof typeof choices;

/** Os valores possíveis de uma escolha. */
export type ChoiceValue<Id extends ChoiceId> = (typeof choices)[Id]["options"][number]["value"];

/** Os dois finais. */
export type EndingChoice = ChoiceValue<"ending">;

/** O valor pertence a esta escolha? */
export function isChoiceValue<Id extends ChoiceId>(id: Id, value: string): value is ChoiceValue<Id> {
  const options: Choice["options"] = choices[id].options;
  return options.some((option) => option.value === value);
}
