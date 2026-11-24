/**
 * Agenda semanal em carrossel, no padrão do Manual da Marca: capa em azul-noite
 * com o grafismo Monte, e um cartão por dia com filete azul no topo, nome do dia
 * em azul e horários alinhados à direita.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DiaAgenda } from "@/lib/conteudo";
import { useConteudo } from "@/lib/contexto";
import { cn } from "@/lib/utils";

function CartaoDia({ d, hoje }: { d: DiaAgenda; hoje: boolean }) {
  return (
    <div data-tilt="7" className="flex h-full flex-col border-t-4 border-marca bg-white p-6 shadow-[0_18px_40px_-30px_rgba(0,42,71,0.45)] sm:p-7">
      <div className="flex h-5 items-center justify-end">
        {hoje && <span className="bg-marca px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white">Hoje</span>}
      </div>
      <h3 className="mt-1 text-[2rem] font-bold leading-none tracking-[-0.02em] text-marca">{d.dia}</h3>
      <ul className="mt-5 divide-y divide-linha border-t border-linha">
        {d.itens.map((it) => (
          <li key={it.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-3">
            <span className="text-[14px] font-semibold leading-snug text-tinta">{it.titulo}</span>
            <span className="text-[17px] font-bold tabular-nums text-marca">{it.horario}</span>
            {it.detalhe && <span className="col-span-2 mt-0.5 text-[12.5px] leading-snug text-tinta-suave">{it.detalhe}</span>}
          </li>
        ))}
      </ul>
      {d.observacao && <p className="mt-auto pt-4 text-[12px] text-tinta-suave">{d.observacao}</p>}
    </div>
  );
}

function CartaoCapa() {
  const { programacao: p } = useConteudo();
  return (
    <div className="grafismo-monte-escuro relative flex h-full flex-col overflow-hidden bg-marca-funda p-7 text-white">
      {p.capaImagem && <img src={p.capaImagem} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-25" loading="lazy" />}
      <p className="rotulo-secao !text-white">Toda semana</p>
      <h3 className="mt-5 text-[2.15rem] font-bold leading-[1.05] tracking-[-0.02em]">{p.capaTitulo}</h3>
      {p.capaSubtitulo && <p className="mt-4 text-[13px] leading-relaxed text-white/75">{p.capaSubtitulo}</p>}
      <div className="mt-auto flex items-end justify-between pt-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">Arraste para o lado →</span>
        <img src="/simbolo-negativo.svg" alt="" aria-hidden className="w-16" />
      </div>
    </div>
  );
}

export function AgendaSemanal({ comCapa = true }: { comCapa?: boolean }) {
  const { programacao: p } = useConteudo();
  const trilho = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);
  const [hoje, setHoje] = useState(-1);
  const total = p.dias.length + (comCapa ? 1 : 0);

  useEffect(() => setHoje(new Date().getDay()), []);

  const cartoes = useCallback(() => Array.from(trilho.current?.children ?? []) as HTMLElement[], []);

  const irPara = (i: number) => {
    const el = cartoes()[Math.max(0, Math.min(total - 1, i))];
    const t = trilho.current;
    if (el && t) t.scrollTo({ left: el.offsetLeft - t.offsetLeft - parseFloat(getComputedStyle(t).paddingLeft || "0"), behavior: "smooth" });
  };

  // acompanha o cartão visível
  useEffect(() => {
    const t = trilho.current;
    if (!t) return;
    const f = () => {
      const els = cartoes();
      const base = t.scrollLeft + parseFloat(getComputedStyle(t).paddingLeft || "0");
      let melhor = 0, dist = Infinity;
      els.forEach((el, i) => { const d = Math.abs(el.offsetLeft - t.offsetLeft - base); if (d < dist) { dist = d; melhor = i; } });
      setAtivo(t.scrollLeft + t.clientWidth >= t.scrollWidth - 4 ? els.length - 1 : melhor);
    };
    t.addEventListener("scroll", f, { passive: true });
    return () => t.removeEventListener("scroll", f);
  }, [cartoes]);

  // no celular, abre já no dia de hoje
  useEffect(() => {
    if (hoje < 0 || typeof window === "undefined" || window.innerWidth >= 1024) return;
    const idx = p.dias.findIndex((d) => d.diaSemana === hoje);
    if (idx >= 0) {
      const t = trilho.current;
      const el = cartoes()[idx + (comCapa ? 1 : 0)];
      if (t && el) t.scrollLeft = el.offsetLeft - t.offsetLeft - parseFloat(getComputedStyle(t).paddingLeft || "0");
    }
  }, [hoje]);

  if (!p.dias.length) return null;

  return (
    <div className="relative">
      <div className="mb-4 hidden justify-end gap-2 sm:flex">
        <button onClick={() => irPara(ativo - 1)} disabled={ativo === 0} aria-label="Anterior" className="grid size-11 place-items-center border-2 border-marca bg-white text-marca transition hover:bg-marca hover:text-white disabled:pointer-events-none disabled:opacity-30"><ChevronLeft size={20} /></button>
        <button onClick={() => irPara(ativo + 1)} disabled={ativo >= total - 1} aria-label="Próximo" className="grid size-11 place-items-center border-2 border-marca bg-white text-marca transition hover:bg-marca hover:text-white disabled:pointer-events-none disabled:opacity-30"><ChevronRight size={20} /></button>
      </div>
      <div
        ref={trilho}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto scroll-smooth px-5 pb-6 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:gap-5 sm:px-8 sm:[mask-image:linear-gradient(to_right,black_88%,transparent)] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label="Agenda da semana"
      >
        {comCapa && (
          <div className="w-[78vw] max-w-[310px] shrink-0 snap-start sm:w-[300px]" style={{ minHeight: 400 }}>
            <CartaoCapa />
          </div>
        )}
        {p.dias.map((d) => (
          <div key={d.id} className="w-[78vw] max-w-[310px] shrink-0 snap-start sm:w-[300px]" style={{ minHeight: 400 }}>
            <CartaoDia d={d} hoje={d.diaSemana === hoje} />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i} onClick={() => irPara(i)} aria-label={`Cartão ${i + 1}`} className={cn("h-[3px] transition-all", i === ativo ? "w-8 bg-marca" : "w-4 bg-marca-suave hover:bg-marca-media")} />
        ))}
      </div>
    </div>
  );
}

/** Lista compacta (para barras laterais). */
export function AgendaCompacta() {
  const { programacao: p } = useConteudo();
  return (
    <ul className="grid gap-3">
      {p.dias.map((d) => (
        <li key={d.id} className="border-t border-linha pt-4">
          <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-marca">{d.dia}</p>
          <ul className="mt-2 grid gap-1">
            {d.itens.map((it) => (
              <li key={it.id} className="flex justify-between gap-3 text-[14.5px]"><span className="text-tinta">{it.titulo}</span><span className="font-bold text-marca">{it.horario}</span></li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
