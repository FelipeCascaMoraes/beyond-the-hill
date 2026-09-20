import { machines, type MachineDefinition, type MachineId, type ZoneId } from "@/content";
import { meetsRequirement } from "@/game/story/requirements";
import { useGameStore } from "@/game/state/gameStore";
import { Machine } from "./Machine";

const machineIds = Object.keys(machines) as MachineId[];

const inZone = (zone: ZoneId) => machineIds.filter((id) => machines[id].zone === zone);

/** Uma máquina só existe no mundo quando a história chega até ela. */
function MachineWhenAllowed({ id }: { id: MachineId }) {
  const machine: MachineDefinition = machines[id];
  const allowed = useGameStore((state) => meetsRequirement(machine.requires, state));
  return allowed ? <Machine id={id} /> : null;
}

/** Monta as máquinas da zona definidas em `content/machines.ts`. */
export function ZoneMachines({ zone }: { zone: ZoneId }) {
  return inZone(zone).map((id) => <MachineWhenAllowed key={id} id={id} />);
}
