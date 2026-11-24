import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, LayoutList } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { cn, hojeISO } from "@/lib/utils";
import { CapaPagina } from "@/components/site/Layout";
import { CartaoEvento } from "@/components/site/Blocos";
import { AgendaSemanal } from "@/components/site/AgendaSemanal";
import { CalendarioEventos } from "@/components/site/CalendarioEventos";

export const Route = createFileRoute("/_site/programacao")({ component: Programacao, head: () => ({ meta: [{ title: "Programação" }] }) });

function Programacao() {
  const { programacao: p, eventos: e } = useConteudo();
  const hoje = hojeISO();
  const publicados = e.itens.filter((x) => x.publicado);
  const proximos = publicados.filter((x) => (x.dataFim || x.data) >= hoje).sort((a, b) => a.data.localeCompare(b.data));
  const [visao, setVisao] = useState<"calendario" | "lista">("calendario");
  const passados = publicados.filter((x) => (x.dataFim || x.data) < hoje).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6);
  return (
    <>
      <CapaPagina rotulo="Toda semana" titulo={p.titulo} texto={p.subtitulo} />
      <section className="container-site overflow-hidden py-16">
        <AgendaSemanal />
        {p.aviso && <p className="mt-4 text-center text-sm text-tinta-suave">{p.aviso}</p>}
      </section>
      <section id="eventos" className="scroll-mt-36 border-t border-linha bg-papel">
        <div className="container-site py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="rotulo-secao mb-3">Agenda</p>
              <h2 className="titulo-secao">{e.titulo}</h2>
              {e.subtitulo && <p className="texto-justificado mt-3 text-tinta">{e.subtitulo}</p>}
            </div>
            {publicados.length > 0 && (
              <div className="inline-flex rounded-md border border-linha bg-white p-1" role="tablist" aria-label="Forma de exibir os eventos">
                {([
                  ["calendario", "Calendário", CalendarDays],
                  ["lista", "Lista", LayoutList],
                ] as const).map(([id, rotulo, Icone]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={visao === id}
                    onClick={() => setVisao(id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded px-3.5 text-[14px] font-medium transition-colors",
                      visao === id ? "bg-marca text-white" : "text-tinta-suave hover:text-marca",
                    )}
                  >
                    <Icone size={16} /> {rotulo}
                  </button>
                ))}
              </div>
            )}
          </div>
          {visao === "calendario" && publicados.length > 0 ? (
            <div className="mt-10"><CalendarioEventos eventos={publicados} /></div>
          ) : proximos.length ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{proximos.map((ev) => <CartaoEvento key={ev.id} ev={ev} />)}</div>
          ) : (
            <p className="mt-8 rounded-md bg-white p-8 text-center text-tinta-suave border border-linha">Nenhum evento agendado no momento. Acompanhe nossas redes sociais.</p>
          )}
          {visao === "lista" && passados.length > 0 && (
            <>
              <h3 className="mt-16 text-xl font-bold text-marca">Eventos anteriores</h3>
              <div className="mt-6 grid gap-6 opacity-80 md:grid-cols-2 lg:grid-cols-3">{passados.map((ev) => <CartaoEvento key={ev.id} ev={ev} />)}</div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
