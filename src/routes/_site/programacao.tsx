import { createFileRoute } from "@tanstack/react-router";
import { useConteudo } from "@/lib/contexto";
import { hojeISO } from "@/lib/utils";
import { CapaPagina } from "@/components/site/Layout";
import { CartaoEvento } from "@/components/site/Blocos";
import { AgendaSemanal } from "@/components/site/AgendaSemanal";

export const Route = createFileRoute("/_site/programacao")({ component: Programacao, head: () => ({ meta: [{ title: "Programação" }] }) });

function Programacao() {
  const { programacao: p, eventos: e } = useConteudo();
  const hoje = hojeISO();
  const publicados = e.itens.filter((x) => x.publicado);
  const proximos = publicados.filter((x) => (x.dataFim || x.data) >= hoje).sort((a, b) => a.data.localeCompare(b.data));
  const passados = publicados.filter((x) => (x.dataFim || x.data) < hoje).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6);
  return (
    <>
      <CapaPagina rotulo="Agenda" titulo={p.titulo} texto={p.subtitulo} />
      <section className="container-site overflow-hidden py-16">
        <AgendaSemanal />
        {p.aviso && <p className="mt-4 text-center text-sm text-tinta-suave">{p.aviso}</p>}
      </section>
      <section id="eventos" className="scroll-mt-24 bg-papel">
        <div className="container-site py-20">
          <p className="rotulo-secao">Especiais</p>
          <h2 className="titulo-secao mt-3">{e.titulo}</h2>
          {e.subtitulo && <p className="mt-3 text-tinta-suave">{e.subtitulo}</p>}
          {proximos.length ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{proximos.map((ev) => <CartaoEvento key={ev.id} ev={ev} />)}</div>
          ) : (
            <p className="mt-8 rounded-2xl bg-white p-8 text-center text-tinta-suave ring-1 ring-linha/60">Nenhum evento agendado no momento. Acompanhe nossas redes sociais.</p>
          )}
          {passados.length > 0 && (
            <>
              <h3 className="mt-16 text-xl font-bold text-marca-funda">Eventos anteriores</h3>
              <div className="mt-6 grid gap-6 opacity-80 md:grid-cols-2 lg:grid-cols-3">{passados.map((ev) => <CartaoEvento key={ev.id} ev={ev} />)}</div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
