import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, FileDown, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { obterBoletimPublico } from "@/lib/api-boletim";
import { dataPorExtenso } from "@/lib/boletim";
import { FolhasEscaladas } from "@/components/boletim/Folhas";
import { LeituraCelular } from "@/components/boletim/LeituraCelular";
import { IconeWhatsapp } from "@/components/site/Icones";

export const Route = createFileRoute("/_site/boletim/$data")({
  loader: async ({ params }) => {
    const b = await obterBoletimPublico({ data: { data: params.data } });
    if (!b) throw notFound();
    return b;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.titulo} – ${dataPorExtenso(loaderData.data)}` },
          { property: "og:title", content: `${loaderData.titulo} – ${dataPorExtenso(loaderData.data)}` },
          { name: "description", content: "Boletim dominical da Primeira Igreja Evangélica Congregacional de Brasília." },
        ]
      : [],
  }),
  component: BoletimPagina,
});

function BoletimPagina() {
  const b = Route.useLoaderData();
  const titulo = `${b.titulo} – ${dataPorExtenso(b.data)}`;
  const pdf = `/api/boletim/${b.data}/pdf?v=${encodeURIComponent(b.atualizadoEm)}`;
  // no celular, o boletim abre em modo leitura (texto corrido); no computador, nas folhas
  const [modo, setModo] = useState<"leitura" | "folhas">("folhas");
  useEffect(() => { if (window.innerWidth < 640) setModo("leitura"); }, []);
  // as abas do modo leitura grudam logo abaixo do cabeçalho do site
  const [topo, setTopo] = useState(0);
  useEffect(() => {
    const h = document.querySelector("header");
    const medir = () => setTopo(h?.getBoundingClientRect().height ?? 0);
    medir(); window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  const compartilhar = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: titulo, url }); return; } catch { /* cancelado */ }
    }
    await navigator.clipboard?.writeText(url);
    toast.success("Link copiado.");
  };

  return (
    <section className="bg-slate-200/60">
      <div className="container-site py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link to="/boletins" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-tinta-suave hover:text-marca"><ArrowLeft size={16} /> Boletins</Link>
          <h1 className="w-full text-2xl font-bold text-marca-funda sm:w-auto sm:flex-1 sm:text-center sm:text-[1.6rem]">{titulo}</h1>
          <div className="flex flex-wrap gap-2">
            <a href={`${pdf}&baixar=1`} className="btn-primario !px-4 !py-2.5"><FileDown size={16} /> Baixar PDF</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${titulo}\n${typeof window !== "undefined" ? window.location.href : ""}`)}`} target="_blank" rel="noopener noreferrer" className="btn-contorno !px-4 !py-2.5"><IconeWhatsapp size={16} /> WhatsApp</a>
            <button onClick={compartilhar} className="btn-contorno !px-4 !py-2.5"><Share2 size={16} /> Compartilhar</button>
            <a href={`/impressao/boletim/${b.data}?imprimir=1`} target="_blank" rel="noopener" className="btn-contorno !hidden !px-4 !py-2.5 lg:!inline-flex"><Printer size={16} /> Imprimir</a>
          </div>
        </div>
        <div className="mb-4 flex justify-center">
          <div className="flex border border-linha bg-white">
            {(["leitura", "folhas"] as const).map((m) => (
              <button key={m} onClick={() => setModo(m)} className={`px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.14em] transition ${modo === m ? "bg-marca text-white" : "text-tinta-suave hover:text-marca"}`}>{m === "leitura" ? "Leitura" : "Folhas"}</button>
            ))}
          </div>
        </div>
        <div className={modo === "leitura" ? "mx-auto max-w-[680px] shadow-[0_20px_50px_-30px_rgba(0,42,71,0.5)]" : "mx-auto max-w-[860px]"}>
          {modo === "leitura" ? <div style={{ ["--bl-topo" as string]: `${topo}px` }}><LeituraCelular boletim={b} /></div> : <FolhasEscaladas boletim={b} espaco={20} />}
        </div>
      </div>
    </section>
  );
}
