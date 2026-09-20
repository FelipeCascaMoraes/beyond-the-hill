import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { machineAudio } from "@/audio/machineAudio";
import { machines, type MachineId } from "@/content";
import { isSheltered, machineKeepOut } from "@/game/machine/machineEnvironment";
import { areMachinesPaused } from "@/game/debug/devFlags";
import { alertOf, createMachineActor, updateMachine, type MachineAlert } from "@/game/machine/machineLogic";
import { selectDialogueBlocksMovement, useGameStore } from "@/game/state/gameStore";
import { terrainHeight } from "@/game/world/terrain";
import { MachineFigure } from "./MachineFigure";

/** Cor do olho em cada estado: calma, desconfiança, caçada. */
const eyeColors: Record<MachineAlert, Color> = {
  calm: new Color("#ffd89a"),
  detect: new Color("#ff9b4a"),
  chase: new Color("#ff3b2f"),
};

/** Evita saltos absurdos depois de trocar de aba. */
const MAX_FRAME_TIME = 0.1;

/**
 * Uma máquina viva na cena: a lógica pura de `game/machine` movendo uma figura,
 * mais o zumbido e o aviso que a UI usa.
 *
 * Ela congela quando a Aysha não pode se defender do jogo — memória aberta,
 * diálogo que trava, apagão de captura — para nunca alcançar ninguém parado.
 */
export function Machine({ id }: { id: MachineId }) {
  const machine = machines[id];
  const spawnEpoch = useGameStore((state) => state.spawnEpoch);

  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const eyeRef = useRef<Mesh>(null);
  const actorRef = useRef(createMachineActor(machine));
  const keepOut = useRef(machineKeepOut(machine.zone));

  // Depois de uma captura, ela recomeça a ronda do início: um respiro.
  useEffect(() => {
    actorRef.current = createMachineActor(machine);
  }, [machine, spawnEpoch]);

  useEffect(() => () => machineAudio.stop(), []);

  useFrame(({ camera, clock }, delta) => {
    const group = groupRef.current;
    const body = bodyRef.current;
    if (!group || !body) return;

    const state = useGameStore.getState();
    const actor = actorRef.current;
    const frozen =
      state.phase !== "playing" ||
      state.captured ||
      state.traveling !== null ||
      state.activeMemory !== null ||
      selectDialogueBlocksMovement(state) ||
      areMachinesPaused();

    if (!frozen) {
      const target = {
        x: camera.position.x,
        z: camera.position.z,
        sheltered: isSheltered(state.zone, camera.position.x, camera.position.z),
      };
      const before = actor.state;
      const event = updateMachine(actor, target, Math.min(delta, MAX_FRAME_TIME), machine, keepOut.current);

      if (event === "caught") state.captureByMachine();
      else state.setThreat(alertOf(actor.state));

      // Escapou: uma vez só, a Aysha comenta o que acabou de acontecer.
      if (before === "chase" && actor.state === "return" && !state.seenDialogues.includes("machine-escaped")) {
        state.startDialogue("machine-escaped");
      }
    }

    // Pousa a figura sobre o terreno, flutuando e balançando de leve.
    const ground = terrainHeight(actor.x, actor.z);
    const alert = alertOf(actor.state);
    const hover = alert === "chase" ? 0.06 : 0.14;
    group.position.set(actor.x, ground + machine.hover + Math.sin(clock.elapsedTime * 1.3) * hover, actor.z);
    group.rotation.y = actor.yaw;
    body.rotation.y = clock.elapsedTime * (alert === "calm" ? 0.5 : 1.6);

    const eye = eyeRef.current;
    if (eye) {
      const material = eye.material as MeshBasicMaterial;
      material.color.lerp(eyeColors[alert], 1 - Math.exp(-4 * delta));
    }

    const distance = Math.hypot(camera.position.x - actor.x, camera.position.z - actor.z);
    machineAudio.update(frozen ? null : distance, alert);
  });

  return (
    <group ref={groupRef}>
      <MachineFigure bodyRef={bodyRef} eyeRef={eyeRef} />
    </group>
  );
}
