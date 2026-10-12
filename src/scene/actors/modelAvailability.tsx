import { Component, createContext, useContext, type ReactNode } from "react";
import type { ModelId } from "@/assets/manifest";

/** Os modelos que existem em /public (ver assets/availableModels.ts). */
export const AvailableModelsContext = createContext<readonly ModelId[]>([]);

export const useAvailableModels = (): readonly ModelId[] => useContext(AvailableModelsContext);

interface ModelBoundaryProps {
  /** Para a mensagem no console. */
  model: ModelId;
  /** O que mostrar se o arquivo não puder ser lido. */
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Um arquivo corrompido ou num formato que o jogo não lê não pode derrubar a
 * cena: o personagem volta a ser o que era antes do modelo, e o console diz
 * qual arquivo falhou.
 */
export class ModelBoundary extends Component<ModelBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`Error in ModelBoundary(${this.props.model}): o modelo não pôde ser carregado.`, error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
