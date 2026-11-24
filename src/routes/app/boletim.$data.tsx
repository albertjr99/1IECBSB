import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronLeft, FileDown, Share2 } from "lucide-react";
import { obterBoletimPublico } from "@/lib/api-boletim";
import { dataPorExtenso, type Boletim } from "@/lib/boletim";
import { FolhasEscaladas } from "@/components/boletim/Folhas";
import { LeituraCelular } from "@/components/boletim/LeituraCelular";

export const Route = createFileRoute("/app/boletim/$data")({ component: BoletimApp });

function BoletimApp() {
  const { data } = Route.useParams();
  const router = useRouter();
  const [b, setB] = useState<Boletim | null | undefined>(undefined);
  const [modo, setModo] = useState<"leitura" | "folhas">("leitura");
  useEffect(() => { obterBoletimPublico({ data: { data } }).then(setB).catch(() => setB(null)); }, [data]);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-[var(--a-borda)] bg-[color-mix(in_srgb,var(--a-sup)_90%,transparent)] px-2 pb-2 pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur-xl">
        <button onClick={() => router.history.back()} className="flex items-center gap-1 px-2 py-2 text-[14px] font-semibold text-[var(--a-azul)]"><ChevronLeft size={19} /> Voltar</button>
        <span className="min-w-0 flex-1 truncate text-center text-[14px] font-bold">Boletim · {dataPorExtenso(data)}</span>
        <a href={`/api/boletim/${data}/pdf`} className="grid size-10 place-items-center text-[var(--a-suave)]" aria-label="Baixar PDF"><FileDown size={19} /></a>
        <button onClick={async () => { const url = `${location.origin}/boletim/${data}`; if (navigator.share) { try { await navigator.share({ title: `Boletim ${dataPorExtenso(data)}`, url }); } catch { /* cancelado */ } } else await navigator.clipboard?.writeText(url); }} className="grid size-10 place-items-center text-[var(--a-suave)]" aria-label="Compartilhar"><Share2 size={18} /></button>
      </header>
      <div className="flex justify-center px-4 pt-3">
        <div className="flex border border-[var(--a-borda)]">
          {(["leitura", "folhas"] as const).map((m) => <button key={m} onClick={() => setModo(m)} className={`px-5 py-2 text-[11.5px] font-bold uppercase tracking-[0.12em] ${modo === m ? "bg-[#00436f] text-white" : "text-[var(--a-suave)]"}`}>{m === "leitura" ? "Leitura" : "Folhas"}</button>)}
        </div>
      </div>
      <div className={modo === "folhas" ? "px-3 py-4" : "pt-3"}>
        {b === undefined ? <div className="mx-auto aspect-[210/297] w-full animate-pulse bg-[var(--a-borda)]" /> : !b ? <p className="py-16 text-center text-[var(--a-suave)]">Boletim não encontrado.</p> : modo === "leitura" ? <LeituraCelular boletim={b} /> : <FolhasEscaladas boletim={b} espaco={14} />}
      </div>
    </div>
  );
}
