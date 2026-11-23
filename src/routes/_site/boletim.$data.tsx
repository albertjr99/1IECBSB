import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, FileDown, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { obterBoletimPublico } from "@/lib/api-boletim";
import { dataPorExtenso } from "@/lib/boletim";
import { FolhasEscaladas } from "@/components/boletim/Folhas";
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
        <div className="mx-auto max-w-[860px]">
          <FolhasEscaladas boletim={b} espaco={20} />
        </div>
      </div>
    </section>
  );
}
