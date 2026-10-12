import { availableModels } from "@/assets/availableModels";
import { GameShell } from "./GameShell";

export default function Home() {
  return <GameShell availableModels={availableModels()} />;
}
