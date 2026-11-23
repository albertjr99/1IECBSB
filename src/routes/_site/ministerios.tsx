import { createFileRoute } from "@tanstack/react-router";
import { useConteudo } from "@/lib/contexto";
import { linkWhatsapp } from "@/lib/utils";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/ministerios")({ component: Ministerios, head: () => ({ meta: [{ title: "Ministérios" }] }) });

function Ministerios() {
  const { ministerios: m } = useConteudo();
  return (
    <>
      <CapaPagina titulo={m.titulo} texto={m.introducao} />
      <div className="container-site grid gap-x-10 gap-y-12 py-20 md:grid-cols-2">
        {m.itens.map((x) => (
          <article key={x.id} className="flex flex-col">
            {x.imagem && <img src={x.imagem} alt="" className="mb-5 aspect-[16/10] w-full rounded-lg object-cover" loading="lazy" />}
            <div className="border-t-2 border-marca pt-5">
              <h3 className="text-xl font-semibold text-marca-funda">{x.nome}</h3>
              <p className="texto-justificado mt-2 leading-relaxed text-tinta-suave">{x.descricao}</p>
              {(x.quando || x.lider) && (
                <dl className="mt-4 grid gap-1 text-[15px]">
                  {x.quando && <div className="flex gap-2"><dt className="text-tinta-suave">Quando:</dt><dd className="text-tinta">{x.quando}</dd></div>}
                  {x.lider && <div className="flex gap-2"><dt className="text-tinta-suave">Liderança:</dt><dd className="text-tinta">{x.lider}</dd></div>}
                </dl>
              )}
              {x.contato && (
                <a href={linkWhatsapp(x.contato, `Olá! Quero saber mais sobre o ministério ${x.nome}.`)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-[15px] font-semibold text-marca hover:text-marca-escura">
                  Quero participar →
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
