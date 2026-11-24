import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Conteudo } from "./conteudo";

const Ctx = createContext<Conteudo | null>(null);

export const CANAL_PREVIA = "iecb-previa";

/**
 * Fornece o conteúdo às páginas. Dentro do painel, a página é aberta com
 * ?previa=1 num iframe e recebe o rascunho a cada alteração — a prévia é o
 * próprio site, não uma imitação dele.
 */
export function ConteudoProvider({ inicial, children }: { inicial: Conteudo; children: ReactNode }) {
  const [conteudo, setConteudo] = useState(inicial);

  useEffect(() => setConteudo(inicial), [inicial]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("previa") !== "1" || window.parent === window) return;
    const ouvir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.tipo === CANAL_PREVIA && e.data.conteudo) setConteudo(e.data.conteudo as Conteudo);
    };
    window.addEventListener("message", ouvir);
    let desfazer = () => {};
    import("./foco-previa").then((m) => { desfazer = m.instalarFocoPrevia(CANAL_PREVIA); });
    window.parent.postMessage({ tipo: `${CANAL_PREVIA}-pronta` }, window.location.origin);
    return () => { window.removeEventListener("message", ouvir); desfazer(); };
  }, []);

  return <Ctx.Provider value={conteudo}>{children}</Ctx.Provider>;
}

export function useConteudo(): Conteudo {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConteudo fora do ConteudoProvider");
  return c;
}

export function emPrevia() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("previa") === "1";
}
