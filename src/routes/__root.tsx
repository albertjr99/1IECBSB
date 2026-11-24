/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import css from "../styles.css?url";
import { obterConteudoPublico } from "@/lib/api";
import { ConteudoProvider } from "@/lib/contexto";

export const Route = createRootRoute({
  loader: () => obterConteudoPublico(),
  staleTime: 10_000,
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: loaderData?.geral.nome ?? "Igreja" },
      { name: "description", content: loaderData?.geral.descricaoSite ?? "" },
      { name: "theme-color", content: "#00436F" },
      { property: "og:title", content: loaderData?.geral.nome ?? "" },
      { property: "og:description", content: loaderData?.geral.descricaoSite ?? "" },
      { property: "og:image", content: "/og-icone.png" },
      { property: "og:locale", content: "pt_BR" },
    ],
    links: [
      { rel: "stylesheet", href: css },
      { rel: "icon", href: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { rel: "icon", href: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "icon", href: "/favicon.svg?v=2", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icone-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,400;1,500&family=Montserrat:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: Raiz,
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div>
        <img src="/marca/logo-simbolo-colorida.svg" alt="" className="mx-auto w-28" />
        <h1 className="mt-6 text-3xl font-bold text-marca">Página não encontrada</h1>
        <a href="/" className="btn-primario mt-6">Voltar ao início</a>
      </div>
    </div>
  ),
});

function Raiz() {
  const conteudo = Route.useLoaderData();
  return (
    <Documento>
      <ConteudoProvider inicial={conteudo}>
        <Outlet />
        <Toaster richColors position="top-center" />
      </ConteudoProvider>
    </Documento>
  );
}

function Documento({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
