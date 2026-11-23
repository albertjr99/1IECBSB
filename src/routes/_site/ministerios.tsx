import { createFileRoute } from "@tanstack/react-router";
import { Clock, MessageCircle, User } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { linkWhatsapp } from "@/lib/utils";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/ministerios")({ component: Ministerios, head: () => ({ meta: [{ title: "Ministérios" }] }) });

function Ministerios() {
  const { ministerios: m } = useConteudo();
  return (
    <>
      <CapaPagina rotulo="Sirva conosco" titulo={m.titulo} texto={m.introducao} />
      <div className="container-site grid gap-6 py-20 md:grid-cols-2">
        {m.itens.map((x, i) => (
          <article key={x.id} className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-linha/60 sm:flex-row">
            <div className="relative sm:w-2/5">
              {x.imagem ? (
                <img src={x.imagem} alt="" className="aspect-[4/3] size-full object-cover sm:aspect-auto" loading="lazy" />
              ) : (
                <div className={`grid aspect-[4/3] size-full place-items-center sm:aspect-auto ${i % 2 ? "bg-destaque" : "bg-marca"}`}>
                  <img src="/simbolo-branco.svg" alt="" className="w-1/2 opacity-80" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-7">
              <h3 className="text-xl font-bold text-marca-funda">{x.nome}</h3>
              <p className="mt-2 text-[15.5px] text-tinta-suave">{x.descricao}</p>
              <div className="mt-auto grid gap-1.5 pt-5 text-[14.5px] text-tinta-suave">
                {x.quando && <span className="inline-flex items-center gap-2"><Clock size={15} className="text-destaque" />{x.quando}</span>}
                {x.lider && <span className="inline-flex items-center gap-2"><User size={15} className="text-destaque" />{x.lider}</span>}
                {x.contato && (
                  <a href={linkWhatsapp(x.contato, `Olá! Quero saber mais sobre o ministério ${x.nome}.`)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 font-bold text-marca hover:text-destaque">
                    <MessageCircle size={15} /> Quero participar
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
