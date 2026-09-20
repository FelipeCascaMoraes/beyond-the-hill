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

  "poi-gate": linear([
    { speaker: "narrator", text: "Uma porteira de madeira, sozinha no fim da trilha. Não há cerca dos lados." },
    { speaker: "aysha", text: "Nada impede a passagem. Mesmo assim, ela está fechada." },
  ]),

  // ── A casa abandonada ──────────────────────────────────────────────────
  // Pistas: a colina e a árvore desenhadas por uma criança, uma família de
  // três, um lugar ainda esperando alguém. Nada sobre como a família acabou.

  // Ao se aproximar (não trava o movimento).
  "house-approach": linear(
    [
      { speaker: "narrator", text: "Uma casa, sozinha no campo. A porta está entreaberta." },
      { speaker: "aysha", text: "Tem alguém aí?" },
    ],
    { blocksMovement: false },
  ),

  "poi-house-drawing": linear(
    [
      { speaker: "narrator", text: "Um desenho de criança, preso na parede. Uma colina, uma árvore no topo e três pessoas de mãos dadas." },
      { speaker: "aysha", text: "Fui eu que desenhei isso. Como pode estar aqui?" },
      { speaker: "narrator", text: "No parapeito da janela, o cavalinho de madeira parece esperar." },
    ],
    { setsFlags: ["found-drawing"] },
  ),

  "poi-house-table": linear([
    { speaker: "narrator", text: "Uma mesa posta para três. A poeira cobre tudo, menos uma das cadeiras." },
    { speaker: "aysha", text: "Como se alguém ainda se sentasse aqui. Esperando." },
  ]),

  "poi-house-horse": linear([
    { speaker: "narrator", text: "Um cavalinho de madeira no parapeito, virado para a janela." },
    { speaker: "aysha", text: "Alguém o deixou olhando para a colina. De propósito." },
  ]),

  "poi-house-window": linear([
    { speaker: "narrator", text: "Pela janela quebrada, a colina inteira cabe no quadro." },
    { speaker: "aysha", text: "Quem morava aqui acordava todo dia olhando para ela." },
  ]),

  // Depois de viver a memória da noite. A Aysha ainda não tem as palavras:
  // sabe o que perdeu, não sabe como, nem por quem.
  "poi-house-horse-after": linear([
    { speaker: "narrator", text: "O cavalinho cabe na mão dela como se nunca tivesse saído." },
    { speaker: "aysha", text: "Eu esperei a manhã inteira. Eles não subiram." },
    { speaker: "narrator", text: "Ela devolve o cavalinho ao parapeito, virado para a colina." },
  ]),

  // Depois de viver a memória da porteira.
  "poi-gate-after": linear([
    { speaker: "narrator", text: "A madeira está morna sob a mão dela." },
    { speaker: "aysha", text: "Era sempre aqui que ele virava o cavalo." },
  ]),

  // ── O labirinto ────────────────────────────────────────────────────────
  // A orientação é dita em voz alta uma vez: a colina por cima das paredes.
  // Depois disso, o lugar se explica sozinho.

  "labyrinth-arrive": linear(
    [
      { speaker: "narrator", text: "Paredes de pedra, baixas, formando um quadrado grande demais para ser acaso." },
      { speaker: "aysha", text: "A colina aparece por cima delas. Enquanto eu a vir, eu sei voltar." },
      { speaker: "narrator", text: "De algum lugar lá dentro vem um zumbido, dando voltas." },
    ],
    { blocksMovement: false, setsFlags: ["labyrinth-found"] },
  ),

  "poi-lab-return": linear([
    { speaker: "narrator", text: "Pedras empilhadas do lado de fora da muralha, apontando para o campo." },
    { speaker: "aysha", text: "É por ali que eu volto." },
  ]),

  "poi-lab-flowers": linear([
    { speaker: "narrator", text: "Flores amarelas numa fresta da pedra, viradas para cima." },
    { speaker: "aysha", text: "As mesmas do campo. Alguma coisa aqui ainda insiste." },
  ]),

  "poi-lab-mark": linear([
    { speaker: "narrator", text: "Três pedras empilhadas no meio do corredor, com cuidado." },
    { speaker: "aysha", text: "Alguém chegou até aqui antes de mim. E parou de empilhar." },
  ]),

  "poi-lab-exit": linear([
    { speaker: "narrator", text: "A passagem norte está tomada por ferro retorcido. Pela fresta, o campo continua." },
    { speaker: "aysha", text: "Por aqui não. Ainda não." },
  ]),

  "poi-lab-note": linear([
    { speaker: "narrator", text: "No centro, sobre uma pedra baixa, um papel dobrado muitas vezes." },
    { speaker: "aysha", text: "Esta dobra fui eu que fiz." },
  ]),

  "poi-lab-note-after": linear([
    { speaker: "narrator", text: "O papel continua ali, aberto, com os nomes riscados." },
    { speaker: "aysha", text: "Dois. Sempre foram dois." },
    { speaker: "narrator", text: "Ela olha para a saída norte por um tempo longo." },
  ]),

  // ── A pergunta ─────────────────────────────────────────────────────────
  "arrival-hill-familiar": linear(
    [
      { speaker: "narrator", text: "Aysha para. O vento corre pela grama na direção da colina." },
      { speaker: "aysha", text: "Por que aquela colina parece tão familiar?" },
      // Condução natural até o gatilho da primeira memória, sem marcador.
      { speaker: "narrator", text: "O olhar dela desce pela trilha até a velha porteira." },
    ],
    { setsFlags: ["hill-familiar"] },
  ),

  // ── As máquinas ────────────────────────────────────────────────────────
  // Aviso, fuga e captura. Nada de combate: a Aysha só pode correr ou sumir.

  // Quando a primeira máquina passa a rondar o campo (não trava o movimento).
  "machine-arrives": linear(
    [
      { speaker: "narrator", text: "Um zumbido metálico atravessa o campo, longe, indo e voltando." },
      { speaker: "aysha", text: "É disso que o Victor falava." },
      { speaker: "narrator", text: "Alguma coisa se move na altura da grama, entre ela e a casa." },
    ],
    { blocksMovement: false, setsFlags: ["machine-seen"] },
  ),

  // Uma vez só, quando ela escapa de uma perseguição.
  "machine-escaped": linear(
    [
      { speaker: "narrator", text: "O zumbido afina e se afasta. Ela não solta o ar de uma vez." },
      { speaker: "aysha", text: "Ela desistiu. Dessa vez." },
    ],
    { blocksMovement: false },
  ),

  // Depois do apagão: a Aysha acorda onde começou, inteira e sem tempo nenhum.
  "machine-caught": linear(
    [
      { speaker: "narrator", text: "Ela acorda na grama, no mesmo lugar do primeiro instante." },
      { speaker: "aysha", text: "Nem um arranhão. Ela não quis me machucar..." },
      { speaker: "aysha", text: "Ela quis me levar de volta." },
    ],
    { setsFlags: ["machine-caught"] },
  ),

  // ── O reconhecimento ───────────────────────────────────────────────────
  // Nada é dito na cara deles. A Aysha entende, guarda, e passa a olhar
  // diferente — o jogador entende junto, pelas mesmas peças.

  // De volta ao campo, vendo os dois de longe (não trava o movimento).
  "guides-again": linear(
    [
      { speaker: "narrator", text: "Do outro lado do campo, os dois esperam onde sempre estiveram." },
      { speaker: "aysha", text: "Um homem e uma mulher." },
      { speaker: "narrator", text: "O chapéu dele. O casaco dela, comprido até os pés." },
    ],
    { blocksMovement: false, setsFlags: ["saw-them-again"] },
  ),

  "poi-overlook-after": linear([
    { speaker: "narrator", text: "A pedra está morna. Daqui a colina cabe inteira nos olhos." },
    { speaker: "aysha", text: "Foi assim que eu cheguei. Deitada na grama, olhando para cima." },
  ]),

  // Depois da última lembrança. Ela não acusa ninguém ainda: ela conta.
  "guides-lied": linear(
    [
      { speaker: "narrator", text: "Aysha fica muito tempo parada, olhando a trilha onde os dois esperam." },
      { speaker: "aysha", text: "Eles já estavam aqui quando eu cheguei. Esperando." },
      { speaker: "aysha", text: "\"A memória demora a chegar aqui\", ele disse. \"Fica perto da gente\", ela disse." },
      { speaker: "narrator", text: "Ela se lembra do olhar rápido que os dois trocaram quando ela disse o próprio nome." },
      { speaker: "aysha", text: "Eles sabiam. Desde o primeiro instante, eles sabiam quem eu era." },
      { speaker: "narrator", text: "A colina continua lá, do outro lado do campo. Mais perto do que parecia." },
    ],
    { setsFlags: ["they-lied"] },
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

  "victor-house": linear([
    { speaker: "aysha", text: "Tem uma casa lá atrás. Com um desenho meu na parede." },
    { speaker: "narrator", text: "Victor olha na direção da casa por um instante longo demais." },
    { speaker: "victor", text: "O Além guarda pedaços de quem chega. Não quer dizer nada." },
    { speaker: "victor", text: "Não fica muito tempo lá dentro." },
  ]),

  "victor-machine": linear([
    { speaker: "aysha", text: "Ela esteve perto. Aquela coisa." },
    { speaker: "victor", text: "Então você já sabe. Elas não matam. Elas devolvem." },
    { speaker: "aysha", text: "Devolvem para onde?" },
    { speaker: "victor", text: "Para o começo. Sempre para o começo." },
    { speaker: "narrator", text: "Ele diz isso como quem já contou os dias." },
  ]),

  "cassandra-machine": linear([
    { speaker: "cassandra", text: "Você correu. Fez certo." },
    { speaker: "cassandra", text: "Fica deste lado do campo, perto da gente, e ela não te alcança." },
    { speaker: "aysha", text: "E do outro lado?" },
    { speaker: "cassandra", text: "Do outro lado não tem nada que valha a corrida." },
  ]),

  // Depois que a Aysha sabe. Os dois seguem amáveis; é isso que incomoda.
  "cassandra-after-truth": linear([
    { speaker: "cassandra", text: "Você está diferente. Lembrou de alguma coisa?" },
    { speaker: "narrator", text: "Aysha demora a responder." },
    { speaker: "aysha", text: "De um campo. De um cavalo." },
    { speaker: "cassandra", text: "Coisas boas, então. Fica com essas." },
    { speaker: "narrator", text: "A mão dela alisa o casaco comprido, devagar, até o fim." },
  ]),

  "victor-after-truth": linear([
    { speaker: "aysha", text: "Victor. Há quanto tempo vocês dois estão aqui?" },
    { speaker: "narrator", text: "Ele ajeita o chapéu antes de falar." },
    { speaker: "victor", text: "Tempo não conta aqui. Você vai ver." },
    { speaker: "aysha", text: "Mas vocês chegaram antes de mim." },
    { speaker: "victor", text: "Todo mundo chega antes de alguém." },
    { speaker: "narrator", text: "Ele olha para a colina pela primeira vez desde que ela o conhece." },
  ]),

  "victor-idle": linear([{ speaker: "victor", text: "Estou de olho no horizonte. Pode ficar tranquila." }]),
} as const satisfies Record<string, Dialogue>;

export type DialogueId = keyof typeof dialogues;
