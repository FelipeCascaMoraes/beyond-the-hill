import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Object3D } from "three";
import { registerInteractable } from "@/game/interaction/registry";
import type { InteractableDefinition, InteractableEntry, Point3 } from "@/game/interaction/types";

/** Posição fixa no mundo, ou um objeto da cena (acompanha seu movimento: NPCs, portas...). */
export type InteractableSource = readonly [number, number, number] | RefObject<Object3D | null>;

const worldPosition = new Vector3();

/**
 * Torna qualquer coisa da cena interativa. Exemplo:
 *
 *   useInteractable(
 *     { id: "carta", prompt: "Examinar", action: { type: "examine", text: "..." } },
 *     [x, y, z],
 *   );
 *
 * A definição pode mudar entre renders (ex.: `enabled`); o registro é refeito só se o `id` mudar.
 */
export function useInteractable(definition: InteractableDefinition, source: InteractableSource): void {
  const definitionRef = useRef(definition);
  const positionRef = useRef<Point3>({ x: 0, y: 0, z: 0 });
  const id = definition.id;

  // Mantém a definição e a posição fixa atualizadas sem re-registrar.
  useEffect(() => {
    definitionRef.current = definition;
    if (isFixedPosition(source)) {
      positionRef.current.x = source[0];
      positionRef.current.y = source[1];
      positionRef.current.z = source[2];
    }
  });

  useEffect(() => {
    const entry: InteractableEntry = {
      get definition() {
        return definitionRef.current;
      },
      position: positionRef.current,
      used: false,
    };
    return registerInteractable(id, entry);
  }, [id]);

  // Objetos que se movem: lê a posição no mundo a cada frame.
  useFrame(() => {
    if (isFixedPosition(source) || !source.current) return;
    source.current.getWorldPosition(worldPosition);
    positionRef.current.x = worldPosition.x;
    positionRef.current.y = worldPosition.y;
    positionRef.current.z = worldPosition.z;
  });
}

function isFixedPosition(source: InteractableSource): source is readonly [number, number, number] {
  return Array.isArray(source);
}
