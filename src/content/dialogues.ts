import type { Dialogue, DialogueLine } from "./types";

// Roteiro das conversas: só texto e estrutura, nenhuma lógica de componente.
//
// Neste ponto da história Cassandra e Victor devem parecer amigáveis, úteis e
// confiáveis. As pistas ficam só nas entrelinhas: reconhecem o nome da Aysha,
// desencorajam lembranças e desviam o olhar dela da colina.

/** Diálogo sem ramificações: uma sequência de falas. */
function linear(lines: readonly DialogueLine[], options: Pick<Dialogue, "blocksMovement"> = {}): Dialogue {
  return { start: "main", nodes: { main: { lines } }, ...options };
}

export const dialogues = {
  "arrival-meeting": linear([
    { speaker: "cassandra", text: "Ei... devagar. Você acabou de acordar, não foi?" },
    { speaker: "aysha", text: "Onde eu estou?" },
    { speaker: "cassandra", text: "No Além. É assim que a gente chama este lugar." },
    { speaker: "aysha", text: "Além... de quê?" },
    { speaker: "victor", text: "Todo mundo pergunta isso. Ninguém tem uma boa resposta." },
    { speaker: "cassandra", text: "Eu sou Cassandra. Esse é o Victor. E você?", introduces: ["cassandra", "victor"] },
    { speaker: "aysha", text: "Aysha. Eu acho... Não lembro de quase nada." },
    { speaker: "narrator", text: "Cassandra e Victor trocam um olhar rápido." },
    { speaker: "victor", text: "É normal. A memória demora a chegar aqui." },
    { speaker: "cassandra", text: "Fica perto da gente. Conhecemos este lugar. Podemos te ajudar." },
    { speaker: "aysha", text: "Por que vocês me ajudariam?" },
    { speaker: "cassandra", text: "Porque ninguém deveria passar por isso sozinha." },
  ]),

  "cassandra-hill": linear([
    { speaker: "aysha", text: "Aquela colina... eu sinto que já estive lá." },
    { speaker: "cassandra", text: "Todo mundo que chega olha primeiro para ela." },
    { speaker: "cassandra", text: "Com o tempo, a gente aprende a olhar para outras coisas." },
  ]),

  "cassandra-idle": linear([{ speaker: "cassandra", text: "Descansa um pouco. Aqui o tempo não tem pressa." }]),

  "victor-machines": linear([
    { speaker: "aysha", text: "Vocês disseram que podem me ajudar. Ajudar com o quê?" },
    { speaker: "victor", text: "Com as máquinas. Ninguém sabe ao certo quem as fez... dizem que algo acima de tudo isto." },
    { speaker: "victor", text: "Elas caçam quem vive no Além. Se ouvir um zumbido metálico, sai do campo aberto e se esconde." },
  ]),

  "victor-idle": linear([{ speaker: "victor", text: "Estou de olho no horizonte. Pode ficar tranquila." }]),
} as const satisfies Record<string, Dialogue>;

export type DialogueId = keyof typeof dialogues;
