import type { Memory } from "./types";

// Memórias da Aysha: só dados. Para criar uma nova, basta adicionar uma
// entrada aqui; a lógica (desbloqueio, ativação, apresentação) é genérica.
//
// As lembranças voltam em fragmentos: sensações antes de fatos. Os nomes, o
// passado criminoso e as mortes só devem aparecer bem mais tarde na jornada.

/**
 * Todas as memórias do jogo. Os ids vêm desta lista, e não das chaves do objeto
 * abaixo: uma memória pode exigir outra em `unlock.memories`, e aí derivar
 * `MemoryId` do próprio objeto seria circular. O `satisfies` cobra que a lista
 * e os dados continuem iguais.
 */
export const memoryIds = ["childhood-ride", "parents-night", "the-names"] as const;
export type MemoryId = (typeof memoryIds)[number];

export const memories = {
  // Primeira memória real: a infância, o pai e a colina que nunca se alcançava.
  // Ativada pela porteira no fim da trilha, depois que a colina parece familiar.
  // ~16 s de fragmentos, avançando sozinhos (~19 s com as transições).
  "childhood-ride": {
    title: "O campo dourado",
    description: "Uma menina, o pai, um cavalo e uma colina que ele nunca a deixava alcançar.",
    unlock: { flags: ["hill-familiar"] },
    trigger: { type: "interaction" },
    tone: "warm",
    autoplay: true,
    fragments: [
      { text: "Um campo igual a este. Mãos pequenas agarradas à crina de um cavalo.", duration: 2.9 },
      { kind: "voice", text: "Segura firme. Eu estou aqui.", duration: 2.1 },
      { text: "Ele ri. Ela ri mais alto.", duration: 1.9 },
      { kind: "voice", text: "Quero que você lembre deste dia.", duration: 2.3 },
      { kind: "voice", soft: true, text: "Pai... o que tem depois da colina?", duration: 2.4 },
      { kind: "voice", text: "Hoje não, pequena.", duration: 1.9 },
      { text: "Ele vira o cavalo. A colina fica para trás.", duration: 2.5 },
    ],
    setsFlags: ["first-memory"],
  },

  // Segunda memória: a infância dentro de casa e a noite em que ela acabou.
  // Ativada pelo cavalinho de madeira, depois do desenho e da primeira memória.
  // Vira de clima no meio (warm → cold): a lembrança boa não termina bem.
  // ~23 s de fragmentos (~27 s com as transições).
  //
  // O que o jogador deve entender: os pais foram tirados dela numa noite, por
  // alguém que entrou na casa. Quem, e por quê, fica para muito mais tarde.
  // Nada é mostrado: só o que uma criança trancada no quarto ouviria.
  "parents-night": {
    title: "A porta encostada",
    description: "A casa cheia, a canção na cozinha e a noite em que as vozes lá embaixo não eram conhecidas.",
    unlock: { flags: ["found-drawing"], memories: ["childhood-ride"] },
    trigger: { type: "interaction" },
    tone: "warm",
    autoplay: true,
    fragments: [
      { text: "Esta casa. Cheirando a pão quente, com alguém cantando baixinho na cozinha.", duration: 2.8 },
      { kind: "voice", soft: true, text: "Mãe, o cavalinho pode dormir comigo?", duration: 2.3 },
      { kind: "voice", text: "Pode. Amanhã ele volta pra janela.", duration: 2.2 },
      { text: "O pai apaga a lamparina. A porta do quarto fica encostada.", duration: 2.5 },
      // A virada: a mesma casa, agora fria. Só som e sombra.
      { tone: "cold", text: "No meio da noite, vozes lá embaixo. Nenhuma delas era conhecida.", duration: 2.8 },
      { kind: "voice", text: "Fica no quarto. Não importa o que você ouvir.", duration: 2.8 },
      { text: "Uma faixa de luz na fresta da porta. Sombras atravessando.", duration: 2.6 },
      { kind: "voice", soft: true, text: "Mãe? Pai?", duration: 2.2 },
      { text: "Depois, só o silêncio. De manhã, a mesa continuava posta.", duration: 3.0 },
    ],
    setsFlags: ["parents-lost"],
  },

  // Terceira memória: guardada na câmara do labirinto. A menina cresceu e foi
  // atrás de quem entrou na casa. Fria do começo ao fim — não há nada de doce
  // aqui. Dois vultos ganham forma: um homem e uma mulher. Nenhum nome ainda.
  // ~23 s de fragmentos.
  "the-names": {
    title: "A lista",
    description: "Anos depois: portas fechadas, um copo empurrado em troca de um nome, e a certeza de que eram dois.",
    unlock: { memories: ["parents-night"] },
    trigger: { type: "interaction" },
    tone: "cold",
    autoplay: true,
    fragments: [
      { text: "Anos depois. A mesma mão, maior, batendo numa porta que não era dela.", duration: 2.8 },
      { kind: "voice", text: "Ninguém vai te contar nada, menina. Deixa isso quieto.", duration: 2.6 },
      { text: "Um papel dobrado muitas vezes. Nomes riscados, um por um.", duration: 2.6 },
      { kind: "voice", soft: true, text: "Eu não vou deixar quieto.", duration: 2.2 },
      { text: "Um copo empurrado por cima de uma mesa, em troca de uma frase.", duration: 2.8 },
      { kind: "voice", text: "Eram dois. Um homem e uma mulher. Viviam desse tipo de serviço.", duration: 3.0 },
      { text: "Ela escreve. A letra treme, e ela escreve assim mesmo.", duration: 2.4 },
      { kind: "voice", text: "Por que você quer tanto saber?", duration: 2.0 },
      { kind: "voice", soft: true, text: "Porque eu estava em cima da escada. Eu vi os pés deles.", duration: 3.0 },
    ],
    setsFlags: ["hunt-began"],
  },
} as const satisfies Record<MemoryId, Memory>;
