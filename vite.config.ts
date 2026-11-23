import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: { port: 3000 },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    // Na Vercel o preset é detectado sozinho; localmente gera um servidor Node.
    nitro({
      // O gerador de PDF do boletim usa um Chromium empacotado: vai inteiro para a função.
      traceDeps: ["@sparticuz/chromium", "puppeteer-core"],
    }),
    viteReact(),
  ],
});
