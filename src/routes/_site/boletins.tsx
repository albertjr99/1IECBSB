import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown, Newspaper } from "lucide-react";
import { listarBoletinsPublicos } from "@/lib/api-boletim";
import { dataPorExtenso } from "@/lib/boletim";
import { CapaPagina } from "@/components/site/Layout";

export const Route = createFileRoute("/_site/boletins")({
  loader: () => listarBoletinsPublicos(),
  head: () => ({ meta: [{ title: "Boletins" }] }),
  component: Boletins,
});

function Boletins() {
  const lista = Route.useLoaderData();
  const [atual, ...anteriores] = lista;
  return (
    <>
      <CapaPagina rotulo="Toda semana" titulo="Boletim dominical" texto="Pastoral, avisos, escala, agenda e motivos de oração da semana." />
      <section className="container-site py-16">
        {!atual ? (
          <p className="rounded-3xl bg-white p-10 text-center text-tinta-suave ring-1 ring-linha/60">Nenhum boletim publicado ainda.</p>
        ) : (
          <>
            <Link to="/boletim/$data" params={{ data: atual.data }} className="group flex flex-col gap-6 overflow-hidden rounded-3xl bg-marca p-8 text-white sm:flex-row sm:items-center sm:p-10">
              <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-white/10"><Newspaper size={36} /></span>
              <span className="flex-1">
                <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/70">Boletim desta semana</span>
                <span className="mt-1 block text-2xl font-bold sm:text-3xl font-[family-name:var(--font-titulo)]">{dataPorExtenso(atual.data)}</span>
              </span>
              <span className="btn-destaque">Ler o boletim</span>
            </Link>
            {anteriores.length > 0 && (
              <>
                <h2 className="mt-14 text-xl font-bold text-marca-funda">Boletins anteriores</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {anteriores.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-linha/60">
                      <Link to="/boletim/$data" params={{ data: b.data }} className="flex-1 font-semibold text-tinta hover:text-marca">{dataPorExtenso(b.data)}</Link>
                      <a href={`/api/boletim/${b.data}/pdf?baixar=1`} className="rounded-full p-2 text-marca hover:bg-marca-clara" title="Baixar PDF"><FileDown size={18} /></a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}
