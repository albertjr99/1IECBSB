import { useEffect, useState } from "react";
import { useConsentimento } from "@/lib/consentimento";
import { CalendarDays, MapPin, X } from "lucide-react";
import { useConteudo, emPrevia } from "@/lib/contexto";
import { hojeISO, periodo } from "@/lib/utils";
import { LinkSite } from "./Link";

/** Janela de destaque para o evento marcado como "destaque" no painel. */
export function AvisoEvento() {
  const { eventos } = useConteudo();
  const [aberto, setAberto] = useState(false);
  const cookies = useConsentimento();
  const hoje = hojeISO();
  const ev = eventos.itens.find((e) => e.publicado && e.destaque && (e.dataFim || e.data) >= hoje);

  useEffect(() => {
    // espera o visitante responder ao aviso de cookies, para não abrir dois avisos juntos
    if (!ev || emPrevia() || !cookies.decidido) return;
    try {
      if (sessionStorage.getItem(`aviso-${ev.id}`)) return;
    } catch { /* sem armazenamento: mostra mesmo assim */ }
    const t = setTimeout(() => setAberto(true), 1200);
    return () => clearTimeout(t);
  }, [ev?.id, cookies.decidido]);

  if (!ev || !aberto) return null;
  const fechar = () => {
    setAberto(false);
    try { sessionStorage.setItem(`aviso-${ev.id}`, "1"); } catch { /* ignora */ }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-marca-funda/70 p-4" onClick={fechar} role="dialog" aria-modal="true" aria-label={ev.titulo}>
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={fechar} className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-white/90 text-tinta shadow hover:bg-white" aria-label="Fechar">
          <X size={18} />
        </button>
        {ev.imagem ? <img src={ev.imagem} alt="" className="aspect-[16/10] w-full object-cover" /> : <div className="h-1.5 bg-marca" />}
        <div className="p-7">
          <h2 className="text-2xl font-bold text-marca">{ev.titulo}</h2>
          <div className="mt-3 grid gap-1.5 text-[15px] text-tinta-suave">
            <span className="inline-flex items-center gap-2"><CalendarDays size={16} className="text-marca" />{periodo(ev.data, ev.dataFim)}{ev.horario && ` · ${ev.horario}`}</span>
            {ev.local && <span className="inline-flex items-center gap-2"><MapPin size={16} className="text-marca" />{ev.local}</span>}
          </div>
          {ev.descricao && <p className="texto-justificado mt-4 text-[15.5px] text-tinta">{ev.descricao}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {ev.link && <LinkSite para={ev.link} className="btn-destaque" onClick={fechar}>{ev.rotuloLink || "Saiba mais"}</LinkSite>}
            <button onClick={fechar} className="btn-contorno">Agora não</button>
          </div>
        </div>
      </div>
    </div>
  );
}
