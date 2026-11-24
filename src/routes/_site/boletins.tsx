import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, FileDown } from "lucide-react";
import { listarBoletinsPublicosCompletos } from "@/lib/api-boletim";
import { dataPorExtenso, type Boletim } from "@/lib/boletim";
import { CapaPagina } from "@/components/site/Layout";
import { FolhasEscaladas } from "@/components/boletim/Folhas";
import { LeitorBoletim, type ItemBoletim } from "@/components/site/LeitorBoletim";

export const Route = createFileRoute("/_site/boletins")({
  loader: () => listarBoletinsPublicosCompletos(),
  head: () => ({ meta: [{ title: "Boletins" }, { name: "description", content: "Boletim dominical da 1ª IEC Brasília: leia no site ou baixe em PDF." }] }),
  component: Boletins,
});

const paraItem = (b: Boletim): ItemBoletim => ({ data: b.data, titulo: b.titulo, pdf: `/api/boletim/${b.data}/pdf?baixar=1&v=${encodeURIComponent(b.atualizadoEm)}`, boletim: b });

/** A primeira página de verdade, em miniatura, com profundidade. */
function Capa({ b }: { b: Boletim }) {
  return (
    <div className="capa-3d relative w-full overflow-hidden bg-white" style={{ aspectRatio: "210 / 297" }}>
      <div className="pointer-events-none absolute inset-0">
        <FolhasEscaladas boletim={b} somentePagina={b.paginas[0]?.id} espaco={0} />
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/10 to-transparent" />
    </div>
  );
}

function Boletins() {
  const lista = Route.useLoaderData();
  const [aberto, setAberto] = useState<ItemBoletim | null>(null);
  const itens = useMemo(() => [...lista].sort((a, b) => b.data.localeCompare(a.data)), [lista]);

  // link direto: /boletins?ler=AAAA-MM-DD
  useEffect(() => {
    const ler = new URLSearchParams(window.location.search).get("ler");
    const b = ler && itens.find((x) => x.data === ler);
    if (b) setAberto(paraItem(b));
  }, [itens]);

  const [atual, ...anteriores] = itens;
  return (
    <>
      <CapaPagina rotulo="Semanal" titulo="Boletim dominical" texto="Pastoral, avisos, escala, agenda e motivos de oração da semana. Leia aqui mesmo ou baixe em PDF." />
      {!atual ? (
        <section className="container-site py-16"><p className="border border-linha bg-white p-10 text-center text-tinta-suave">Nenhum boletim publicado ainda.</p></section>
      ) : (
        <>
          <section className="overflow-hidden border-b border-linha bg-papel">
            <div className="container-site grid items-center gap-12 py-16 md:grid-cols-[minmax(0,330px)_1fr] lg:gap-20">
              <button type="button" onClick={() => setAberto(paraItem(atual))} className="group mx-auto w-full max-w-[300px] md:max-w-none" aria-label="Ler o boletim desta semana">
                <Capa b={atual} />
              </button>
              <div>
                <p className="rotulo-secao">Desta semana</p>
                <h2 className="mt-4 text-[2.1rem] font-bold leading-tight tracking-[-0.02em] text-marca sm:text-[2.6rem]">{dataPorExtenso(atual.data)}</h2>
                {atual.versiculo && (
                  <blockquote className="mt-5 max-w-lg border-l-[3px] border-destaque pl-5">
                    <p className="escritura text-[1.25rem] leading-snug text-marca-funda">“{atual.versiculo.replace(/^[“"]|[”"]$/g, "")}”</p>
                    {atual.versiculoRef && <cite className="referencia mt-2 block not-italic text-tinta-suave">{atual.versiculoRef}</cite>}
                  </blockquote>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setAberto(paraItem(atual))} className="btn-primario"><BookOpen size={17} /> Ler agora</button>
                  <a href={paraItem(atual).pdf} className="btn-contorno"><FileDown size={17} /> Baixar PDF</a>
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
                  <li key={b.id} className="group">
                    <button type="button" onClick={() => setAberto(paraItem(b))} className="block w-full" aria-label={`Ler o boletim de ${dataPorExtenso(b.data)}`}>
                      <Capa b={b} />
                    </button>
                    <p className="mt-5 text-[15px] font-bold text-marca">{dataPorExtenso(b.data)}</p>
                    <div className="mt-2 flex gap-4 text-[12px] font-bold uppercase tracking-[0.14em]">
                      <button type="button" onClick={() => setAberto(paraItem(b))} className="text-marca hover:text-marca-funda">Ler</button>
                      <a href={paraItem(b).pdf} className="text-tinta-suave hover:text-marca">PDF</a>
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
