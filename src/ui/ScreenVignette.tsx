"use client";

/**
 * Uma vinheta leve e permanente nas bordas da tela, morna e escura. Não é
 * efeito: é enquadramento. Ela empurra o olhar para o meio — para a colina, na
 * maior parte do jogo — e dá à imagem a borda gasta de uma lembrança, que é o
 * que o Além inteiro é. Fica abaixo de toda a interface.
 */
export function ScreenVignette() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgba(20,12,4,0.22)_80%,rgba(10,6,2,0.5)_100%)]"
    />
  );
}
