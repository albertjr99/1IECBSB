import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, FileDown } from "lucide-react";
import { listarBoletinsPublicos } from "@/lib/api-boletim";
import { dataPorExtenso } from "@/lib/boletim";
import { BOLETINS_ARQUIVO } from "@/lib/boletins-arquivo";
import { CapaPagina } from "@/components/site/Layout";
import { LeitorBoletim, type ItemBoletim } from "@/components/site/LeitorBoletim";

export const Route = createFileRoute("/_site/boletins")({
  loader: () => listarBoletinsPublicos(),
  head: () => ({ meta: [{ title: "Boletins" }, { name: "description", content: "Boletim dominical da 1ª IEC Brasília: leia no site ou baixe em PDF." }] }),
  component: Boletins,
});

function Capa({ item, grande = false }: { item: ItemBoletim; grande?: boolean }) {
  const [, mes, dia] = item.data.split("-");
  return (
    <div className="capa-3d relative w-full overflow-hidden bg-white" style={{ aspectRatio: "210 / 297" }}>
      {item.capa ? (
        <img src={item.capa} alt={`Capa do boletim de ${dataPorExtenso(item.data)}`} className="absolute inset-0 size-full object-cover" loading={grande ? "eager" : "lazy"} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 border-t-4 border-marca p-6 text-center">
          <img src="/simbolo.svg" alt="" className="w-2/5" />
          <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-tinta-suave">Boletim Dominical</span>
          <span className="text-[2.2rem] font-bold leading-none text-marca">{dia}/{mes}</span>
        </div>
      )}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/10 to-transparent" />
    </div>
  );
}

function Boletins() {
  const publicados = Route.useLoaderData();
  const [aberto, setAberto] = useState<ItemBoletim | null>(null);

  // PDFs oficiais + os publicados pelo editor (o PDF oficial vale quando há os dois na mesma data)
  const lista = useMemo<ItemBoletim[]>(() => {
    const porData = new Map<string, ItemBoletim>();
    for (const b of publicados) porData.set(b.data, { data: b.data, titulo: b.titulo, pdf: `/api/boletim/${b.data}/pdf?baixar=1` });
    for (const a of BOLETINS_ARQUIVO) porData.set(a.data, a);
    return [...porData.values()].sort((a, b) => b.data.localeCompare(a.data));
  }, [publicados]);

  // link direto: /boletins?ler=AAAA-MM-DD
  useEffect(() => {
    const ler = new URLSearchParams(window.location.search).get("ler");
    const item = ler && lista.find((x) => x.data === ler);
    if (item) setAberto(item);
  }, [lista]);

  const [atual, ...anteriores] = lista;
  return (
    <>
      <CapaPagina rotulo="Semanal" titulo="Boletim dominical" texto="Pastoral, avisos, escala, agenda e motivos de oração da semana. Leia aqui mesmo ou baixe em PDF." />
      {!atual ? (
        <section className="container-site py-16"><p className="border border-linha bg-white p-10 text-center text-tinta-suave">Nenhum boletim publicado ainda.</p></section>
      ) : (
        <>
          <section className="overflow-hidden border-b border-linha bg-papel">
            <div className="container-site grid items-center gap-12 py-16 md:grid-cols-[minmax(0,320px)_1fr] lg:gap-20">
              <button type="button" onClick={() => setAberto(atual)} className="group mx-auto w-full max-w-[300px] md:max-w-none" aria-label="Ler o boletim desta semana">
                <Capa item={atual} grande />
              </button>
              <div>
                <p className="rotulo-secao">Desta semana</p>
                <h2 className="mt-4 text-[2.1rem] font-bold leading-tight tracking-[-0.02em] text-marca sm:text-[2.6rem]">{dataPorExtenso(atual.data)}</h2>
                <p className="texto-justificado mt-4 max-w-lg text-tinta">A pastoral do domingo, os avisos da igreja, a escala de serviços, os aniversariantes e a agenda das próximas semanas.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setAberto(atual)} className="btn-primario"><BookOpen size={17} /> Ler agora</button>
                  <a href={atual.pdf} download className="btn-contorno"><FileDown size={17} /> Baixar PDF</a>
                </div>
              </div>
            </div>
          </section>

          {anteriores.length > 0 && (
            <section className="container-site py-16">
              <p className="rotulo-secao">Arquivo</p>
              <h2 className="titulo-secao mt-3">Boletins anteriores</h2>
              <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
                {anteriores.map((b) => (
                  <li key={b.data} className="group">
                    <button type="button" onClick={() => setAberto(b)} className="block w-full" aria-label={`Ler o boletim de ${dataPorExtenso(b.data)}`}>
                      <Capa item={b} />
                    </button>
                    <p className="mt-5 text-[15px] font-bold text-marca">{dataPorExtenso(b.data)}</p>
                    <div className="mt-2 flex gap-4 text-[12px] font-bold uppercase tracking-[0.14em]">
                      <button type="button" onClick={() => setAberto(b)} className="text-marca hover:text-marca-funda">Ler</button>
                      <a href={b.pdf} download className="text-tinta-suave hover:text-marca">PDF</a>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {aberto && <LeitorBoletim item={aberto} aoFechar={() => { setAberto(null); if (window.location.search.includes("ler=")) window.history.replaceState(null, "", "/boletins"); }} />}
    </>
  );
}
