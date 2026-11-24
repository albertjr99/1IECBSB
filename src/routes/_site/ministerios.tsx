import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { iconeMinisterio } from "@/lib/conteudo";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/ministerios")({ component: Ministerios, head: () => ({ meta: [{ title: "Ministérios" }] }) });

function Ministerios() {
  const { ministerios: m } = useConteudo();
  return (
    <>
      <CapaPagina rotulo="Participe" titulo={m.titulo} texto={m.introducao} />
      <div className="container-site grid gap-5 py-20 sm:grid-cols-2 lg:grid-cols-3">
        {m.itens.map((x) => (
          <Link
            key={x.id}
            to="/ministerios/$id"
            params={{ id: x.id }}
            data-tilt="7"
            className="group relative flex flex-col overflow-hidden border border-linha bg-white hover:border-marca"
          >
            <div className="h-1 bg-marca transition-all duration-300 group-hover:h-1.5" />
            {x.imagem && <div className="overflow-hidden"><img src={x.imagem} alt="" className="zoom-foto aspect-[16/9] w-full object-cover" loading="lazy" /></div>}
            <div className="flex flex-1 flex-col p-7">
              <span data-z style={{ "--z": "36px" } as React.CSSProperties} className="grid size-14 place-items-center rounded-full bg-marca shadow-[0_12px_24px_-10px_rgba(0,67,111,0.7)] transition-transform duration-300 group-hover:scale-110">
                <img src={`/marca/icones/icone-${iconeMinisterio(x)}-branco.svg`} alt="" className="size-8" />
              </span>
              <h2 className="mt-6 text-[1.25rem] font-bold leading-snug text-marca">{x.nome}</h2>
              <p className="texto-justificado mt-3 line-clamp-3 text-[15px] leading-relaxed text-tinta">{x.descricao}</p>
              {x.quando && <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.14em] text-tinta-suave">{x.quando}</p>}
              <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[12px] font-bold uppercase tracking-[0.14em] text-marca">
                Conhecer <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
