import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Experiência 100% estática: sem backend, sem servidor em produção.
  output: "export",
  // Existe um package-lock.json no diretório pai; fixa a raiz neste projeto.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
