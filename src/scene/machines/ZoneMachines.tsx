import { machines, type MachineDefinition, type MachineId, type ZoneId } from "@/content";
import { isPresent } from "@/game/story/presence";
import { useGameStore } from "@/game/state/gameStore";
import { Machine } from "./Machine";

const machineIds = Object.keys(machines) as MachineId[];

const inZone = (zone: ZoneId) => machineIds.filter((id) => machines[id].zone === zone);

/** Uma máquina existe no mundo entre o ponto da história em que ela chega e aquele em que deixa de ter o que vigiar. */
function MachineWhenPresent({ id }: { id: MachineId }) {
  const machine: MachineDefinition = machines[id];
  const present = useGameStore((state) => isPresent(machine, state));
  return present ? <Machine id={id} /> : null;
}

/** Monta as máquinas da zona definidas em `content/machines.ts`. */
export function ZoneMachines({ zone }: { zone: ZoneId }) {
  return inZone(zone).map((id) => <MachineWhenPresent key={id} id={id} />);
}
