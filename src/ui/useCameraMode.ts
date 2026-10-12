"use client";

import { useSyncExternalStore } from "react";
import { getCameraMode, subscribeCameraMode, type CameraMode } from "@/game/player/cameraMode";

/** A câmera escolhida por quem joga (1ª ou 3ª pessoa). */
export function useCameraMode(): CameraMode {
  return useSyncExternalStore(subscribeCameraMode, getCameraMode, () => "first");
}
