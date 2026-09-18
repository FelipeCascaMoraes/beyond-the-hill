import type { CharacterId } from "../../content/characters.ts";
import type { Dialogue, DialogueChoice, DialogueLine } from "../../content/types.ts";

// Motor de diálogo: percorre o grafo de nós. Lógica pura, sem React e sem dados
// importados. O estado do jogo guarda só o cursor.

/** Onde o diálogo está. `line === lines.length` significa "aguardando escolha". */
export interface DialogueCursor {
  node: string;
  line: number;
}

export type DialogueStep =
  | {
      kind: "line";
      line: DialogueLine;
      /** Avançar a partir desta fala encerra o diálogo. */
      isFinal: boolean;
    }
  | { kind: "choices"; choices: readonly DialogueChoice[] };

function getNode(dialogue: Dialogue, nodeId: string) {
  const node = dialogue.nodes[nodeId];
  if (!node) throw new Error(`Nó de diálogo inexistente: "${nodeId}".`);
  return node;
}

/** Entra em um nó; nós vazios (sem falas nem escolhas) são atravessados. */
function enterNode(dialogue: Dialogue, nodeId: string, guard = 0): DialogueCursor | null {
  if (guard > 32) throw new Error("Ciclo de nós vazios no diálogo.");
  const node = getNode(dialogue, nodeId);
  if (node.lines.length > 0 || node.choices?.length) return { node: nodeId, line: 0 };
  return node.next ? enterNode(dialogue, node.next, guard + 1) : null;
}

export function beginDialogue(dialogue: Dialogue): DialogueCursor | null {
  return enterNode(dialogue, dialogue.start);
}

export function currentStep(dialogue: Dialogue, cursor: DialogueCursor): DialogueStep {
  const node = getNode(dialogue, cursor.node);
  if (cursor.line < node.lines.length) {
    const isLastLine = cursor.line === node.lines.length - 1;
    return {
      kind: "line",
      line: node.lines[cursor.line],
      isFinal: isLastLine && !node.choices?.length && !node.next,
    };
  }
  return { kind: "choices", choices: node.choices ?? [] };
}

/** Próxima fala. Diante de escolhas, não avança: é preciso escolher. `null` = fim. */
export function advanceCursor(dialogue: Dialogue, cursor: DialogueCursor): DialogueCursor | null {
  const node = getNode(dialogue, cursor.node);
  if (cursor.line >= node.lines.length) return cursor;
  if (cursor.line < node.lines.length - 1) return { node: cursor.node, line: cursor.line + 1 };
  if (node.choices?.length) return { node: cursor.node, line: node.lines.length };
  return node.next ? enterNode(dialogue, node.next) : null;
}

/** Aplica uma escolha. Índice inválido ou fora do momento de escolha não muda nada. */
export function chooseOption(dialogue: Dialogue, cursor: DialogueCursor, index: number): DialogueCursor | null {
  const step = currentStep(dialogue, cursor);
  if (step.kind !== "choices") return cursor;
  const choice = step.choices[index];
  if (!choice) return cursor;
  return choice.next ? enterNode(dialogue, choice.next) : null;
}

/** Personagens apresentados na fala atual (para trocar epíteto por nome). */
export function introducedBy(step: DialogueStep): readonly CharacterId[] {
  if (step.kind !== "line" || !step.line.introduces) return [];
  const { introduces } = step.line;
  return typeof introduces === "string" ? [introduces] : introduces;
}

/** Problemas estruturais de um diálogo (vazio = ok). Usado pelos testes de dados. */
export function validateDialogue(dialogue: Dialogue): string[] {
  const problems: string[] = [];
  const exists = (id: string | undefined) => id === undefined || id in dialogue.nodes;
  if (!(dialogue.start in dialogue.nodes)) problems.push(`start "${dialogue.start}" não existe`);
  for (const [id, node] of Object.entries(dialogue.nodes)) {
    if (!exists(node.next)) problems.push(`nó "${id}": next "${node.next}" não existe`);
    if (node.choices?.length && node.next) problems.push(`nó "${id}": use escolhas ou next, não os dois`);
    node.choices?.forEach((choice, index) => {
      if (!exists(choice.next)) problems.push(`nó "${id}": escolha ${index} aponta para "${choice.next}", que não existe`);
      if (!choice.text.trim()) problems.push(`nó "${id}": escolha ${index} sem texto`);
    });
    node.lines.forEach((line, index) => {
      if (!line.text.trim()) problems.push(`nó "${id}": fala ${index} sem texto`);
    });
    if (dialogue.blocksMovement === false && node.choices?.length) {
      problems.push(`nó "${id}": diálogo que não trava o movimento não pode ter escolhas`);
    }
  }
  return problems;
}
