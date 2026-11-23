/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import css from "../styles.css?url";
import { obterConteudoPublico } from "@/lib/api";
import { ConteudoProvider, useConteudo } from "@/lib/contexto";

export const Route = createRootRoute({
  loader: () => obterConteudoPublico(),
  staleTime: 10_000,
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: loaderData?.geral.nome ?? "Igreja" },
      { name: "description", content: loaderData?.geral.descricaoSite ?? "" },
      { name: "theme-color", content: loaderData?.aparencia.corPrimaria ?? "#00416B" },
      { property: "og:title", content: loaderData?.geral.nome ?? "" },
      { property: "og:description", content: loaderData?.geral.descricaoSite ?? "" },
      { property: "og:image", content: "/og-icone.png" },
      { property: "og:locale", content: "pt_BR" },
    ],
    links: [
      { rel: "stylesheet", href: css },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icone-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600&family=Montserrat:wght@500;600;700;800&family=Source+Sans+3:wght@400;600;700&display=swap",
      },
    ],
  }),
  component: Raiz,
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div>
        <img src="/simbolo.svg" alt="" className="mx-auto w-24 opacity-70" />
        <h1 className="mt-6 text-3xl font-bold text-marca">Página não encontrada</h1>
        <a href="/" className="btn-primario mt-6">Voltar ao início</a>
      </div>
    </div>
  ),
});

function Cores() {
  const { aparencia: a } = useConteudo();
  const seguro = (c: string, p: string) => (/^#[0-9a-f]{3,8}$/i.test(c) ? c : p);
  return (
    <style>{`:root{--cor-primaria:${seguro(a.corPrimaria, "#00416B")};--cor-destaque:${seguro(a.corDestaque, "#C1242C")};--cor-fundo:${seguro(a.corFundo, "#F7F5F0")}}`}</style>
  );
}

function Raiz() {
  const conteudo = Route.useLoaderData();
  return (
    <Documento>
      <ConteudoProvider inicial={conteudo}>
        <Cores />
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
