// Chaves de bancada lidas pelo jogo em tempo real. Em produção ninguém as
// liga: os atalhos que mexem nelas só existem em desenvolvimento (devTools.ts).

let machinesPaused = false;

/** As máquinas estão paradas para teste? */
export const areMachinesPaused = (): boolean => machinesPaused;

export const setMachinesPaused = (paused: boolean): void => {
  machinesPaused = paused;
};
