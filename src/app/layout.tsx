import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fontes servidas do próprio projeto: next/font/google quebra o build no Turbopack
// quando o Google responde com URLs do tipo fonts.gstatic.com/l/font?kit=…
const geistSans = localFont({
  variable: "--font-geist-sans",
  src: "./fonts/Geist.woff2",
  weight: "100 900",
});

const cormorant = localFont({
  variable: "--font-cormorant",
  src: [
    { path: "./fonts/CormorantGaramond.woff2", weight: "300 700", style: "normal" },
    { path: "./fonts/CormorantGaramond-Italic.woff2", weight: "300 700", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "Beyond the Hill",
  description: "Uma curta jornada narrativa pelo Além.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  // O navegador já pinta a página de escuro antes de o CSS chegar.
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Fundo escrito no próprio HTML: nenhum instante de tela branca enquanto a
    // folha de estilos carrega.
    <html
      lang="pt-BR"
      style={{ backgroundColor: "#050505" }}
      className={`${geistSans.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
