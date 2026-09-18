import type { Dialogue, DialogueLine } from "./types";

// Roteiro das conversas: só texto e estrutura, nenhuma lógica de componente.
//
// Neste ponto da história Cassandra e Victor devem parecer amigáveis, úteis e
// confiáveis. As pistas ficam só nas entrelinhas: reconhecem o nome da Aysha,
// desencorajam lembranças e desviam o olhar dela da colina.
//
// Os pontos de interesse do campo apontam, sem dizer, para a infância da Aysha
// (cavalos, uma cerca que ninguém devia passar, a forma da colina).

type LinearOptions = Pick<Dialogue, "blocksMovement" | "setsFlags">;

/** Diálogo sem ramificações: uma sequência de falas. */
function linear(lines: readonly DialogueLine[], options: LinearOptions = {}): Dialogue {
  return { start: "main", nodes: { main: { lines } }, ...options };
}

export const dialogues = {
  // ── Encontro ───────────────────────────────────────────────────────────
  "arrival-meeting": linear(
    [
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
    ],
    { setsFlags: ["met-guides"] },
  ),

  // Fala de fundo logo após o encontro: não trava o movimento.
  "arrival-encourage": linear(
    [
      { speaker: "cassandra", text: "Pode andar um pouco, se quiser. Só não vai longe." },
      { speaker: "victor", text: "A gente fica por aqui." },
    ],
    { blocksMovement: false },
  ),

  // ── Pontos de interesse ────────────────────────────────────────────────
  "poi-horseshoe": linear([
    { speaker: "narrator", text: "Uma ferradura velha, meio enterrada na terra." },
    { speaker: "aysha", text: "Eu sei o peso disso na mão. Como é que eu sei?" },
  ]),

  "poi-fence": linear([
    { speaker: "narrator", text: "Restos de uma cerca. Ela segue na direção da colina e some no meio da grama." },
    { speaker: "aysha", text: "Alguém não queria que se passasse daqui." },
  ]),

  "poi-cairn": linear([
    { speaker: "narrator", text: "Pedras empilhadas com cuidado, uma sobre a outra." },
    { speaker: "aysha", text: "Uma marca de caminho. Alguém passou por aqui antes de mim... e voltou?" },
  ]),

  "poi-flowers": linear([
    { speaker: "narrator", text: "Flores amarelas, pequenas, crescendo juntas no meio do campo." },
    { speaker: "aysha", text: "Tinha flores assim em algum lugar. Eu era pequena." },
  ]),

  "poi-overlook": linear([
    { speaker: "narrator", text: "Uma pedra grande, virada para a colina, como um banco esperando alguém." },
    { speaker: "aysha", text: "Eu conheço essa forma. O jeito que ela desce pela esquerda..." },
  ]),

  // ── A pergunta ─────────────────────────────────────────────────────────
  "arrival-hill-familiar": linear(
    [
      { speaker: "narrator", text: "Aysha para. O vento corre pela grama na direção da colina." },
      { speaker: "aysha", text: "Por que aquela colina parece tão familiar?" },
    ],
    { setsFlags: ["hill-familiar"] },
  ),

  // ── Conversas seguintes ────────────────────────────────────────────────
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

  "victor-hill": linear([
    { speaker: "aysha", text: "Você já foi até aquela colina?" },
    { speaker: "narrator", text: "Victor demora a responder." },
    { speaker: "victor", text: "Não. Daqui ela parece perto. Não é." },
  ]),

  "victor-idle": linear([{ speaker: "victor", text: "Estou de olho no horizonte. Pode ficar tranquila." }]),
} as const satisfies Record<string, Dialogue>;

export type DialogueId = keyof typeof dialogues;
