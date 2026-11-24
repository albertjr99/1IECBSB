import { createFileRoute } from "@tanstack/react-router";
import { useConteudo } from "@/lib/contexto";
import { linkWhatsapp } from "@/lib/utils";
import { iconeMinisterio } from "@/lib/conteudo";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/ministerios")({ component: Ministerios, head: () => ({ meta: [{ title: "Ministérios" }] }) });

function Ministerios() {
  const { ministerios: m } = useConteudo();
  return (
    <>
      <CapaPagina rotulo="Participe" titulo={m.titulo} texto={m.introducao} />
      <div className="container-site grid gap-x-12 gap-y-14 py-20 md:grid-cols-2">
        {m.itens.map((x) => (
          <article key={x.id} className="flex flex-col">
            {x.imagem && <img src={x.imagem} alt="" className="mb-6 aspect-[16/10] w-full object-cover" loading="lazy" />}
            <div className="flex items-center gap-5">
              <span className="grid size-16 shrink-0 place-items-center rounded-full bg-marca">
                <img src={`/marca/icones/icone-${iconeMinisterio(x)}-branco.svg`} alt="" className="size-9" />
              </span>
              <h3 className="text-[1.3rem] font-bold leading-snug text-marca">{x.nome}</h3>
            </div>
            <p className="texto-justificado mt-5 leading-relaxed text-tinta">{x.descricao}</p>
            {(x.quando || x.lider) && (
              <dl className="mt-5 grid gap-2 border-t border-linha pt-4 text-[14.5px]">
                {x.quando && <div className="flex gap-3"><dt className="w-24 shrink-0 text-[11px] font-bold uppercase leading-6 tracking-[0.18em] text-tinta-suave">Quando</dt><dd className="text-tinta">{x.quando}</dd></div>}
                {x.lider && <div className="flex gap-3"><dt className="w-24 shrink-0 text-[11px] font-bold uppercase leading-6 tracking-[0.18em] text-tinta-suave">Liderança</dt><dd className="text-tinta">{x.lider}</dd></div>}
              </dl>
            )}
            {x.contato && (
              <a href={linkWhatsapp(x.contato, `Olá! Quero saber mais sobre o ministério ${x.nome}.`)} target="_blank" rel="noopener noreferrer" className="btn-contorno mt-5 self-start">
                Quero participar
              </a>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
