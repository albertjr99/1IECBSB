import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
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
      <CapaPagina rotulo="Semanal" titulo="Boletim dominical" texto="Pastoral, avisos, escala, agenda e motivos de oração da semana." />
      <section className="container-site py-16">
        {!atual ? (
          <p className="rounded-lg bg-white p-10 text-center text-tinta-suave border border-linha">Nenhum boletim publicado ainda.</p>
        ) : (
          <>
            <div className="flex flex-col gap-6 border-t-[3px] border-marca bg-papel p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div>
                <p className="text-tinta-suave">Boletim desta semana</p>
                <h2 className="mt-1 text-[1.75rem] font-bold text-marca">{dataPorExtenso(atual.data)}</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/boletim/$data" params={{ data: atual.data }} className="btn-primario">Ler o boletim</Link>
                <a href={`/api/boletim/${atual.data}/pdf?baixar=1`} className="btn-contorno"><FileDown size={17} /> PDF</a>
              </div>
            </div>
            {anteriores.length > 0 && (
              <>
                <h2 className="mt-14 text-xl font-bold text-marca">Boletins anteriores</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {anteriores.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 rounded-md bg-white p-4 border border-linha">
                      <Link to="/boletim/$data" params={{ data: b.data }} className="flex-1 font-semibold text-tinta hover:text-marca">{dataPorExtenso(b.data)}</Link>
                      <a href={`/api/boletim/${b.data}/pdf?baixar=1`} className="rounded-md p-2 text-marca hover:bg-marca-clara" title="Baixar PDF"><FileDown size={18} /></a>
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
