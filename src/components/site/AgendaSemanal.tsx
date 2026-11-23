/**
 * Agenda semanal em carrossel — inspirada na arte "Conheça os nossos horários"
 * do Instagram da igreja: papel acinzentado com textura, mancha azul difusa,
 * dia da semana em caixa-alta e horários alinhados à direita.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DiaAgenda } from "@/lib/conteudo";
import { useConteudo } from "@/lib/contexto";
import { cn } from "@/lib/utils";

const GRAO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function Papel({ variante = 0, children, className }: { variante?: number; children: React.ReactNode; className?: string }) {
  // a mancha azul muda de lugar de um cartão para outro, como na arte original
  const posicoes = [
    ["78% 8%", "8% 96%"],
    ["92% 22%", "0% 70%"],
    ["70% 0%", "15% 100%"],
    ["100% 35%", "0% 85%"],
  ][variante % 4]!;
  return (
    <div className={cn("relative isolate overflow-hidden rounded-[1.75rem] bg-[#e7e8ec] shadow-[0_18px_40px_-24px_rgba(0,30,70,0.45)] ring-1 ring-black/5", className)}>
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 blur-2xl"
        style={{
          background: `radial-gradient(42% 38% at ${posicoes[0]}, color-mix(in oklab, var(--cor-primaria) 92%, white) 0%, color-mix(in oklab, var(--cor-primaria) 55%, #9fb3c8) 38%, transparent 72%),
                       radial-gradient(38% 30% at ${posicoes[1]}, color-mix(in oklab, var(--cor-primaria) 60%, #b9c6d4) 0%, transparent 70%)`,
        }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.28] mix-blend-multiply" style={{ backgroundImage: GRAO }} />
      {children}
    </div>
  );
}

function CartaoDia({ d, i, hoje }: { d: DiaAgenda; i: number; hoje: boolean }) {
  return (
    <Papel variante={i} className="flex h-full flex-col p-6 pt-[34%] sm:p-7 sm:pt-[34%]">
      {hoje && (
        <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-destaque px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow">
          <span className="size-1.5 rounded-full bg-white" /> Hoje
        </span>
      )}
      <div>
        <h3 className="text-[2.6rem] font-extrabold uppercase leading-none tracking-[-0.01em] text-marca-escura">{d.dia}</h3>
        <ul className="mt-4 grid gap-2.5">
          {d.itens.map((it) => (
            <li key={it.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4">
              <span className="text-[14.5px] font-bold leading-snug text-marca-escura font-[family-name:var(--font-titulo)]">{it.titulo}</span>
              <span className="text-[14.5px] font-extrabold tabular-nums text-marca-escura font-[family-name:var(--font-titulo)]">{it.horario}</span>
              {it.detalhe && <span className="col-span-2 -mt-0.5 text-[12.5px] leading-snug text-marca-escura/70">{it.detalhe}</span>}
            </li>
          ))}
        </ul>
        {d.observacao && <p className="mt-4 text-[11.5px] italic text-marca-escura/65">{d.observacao}</p>}
      </div>
    </Papel>
  );
}

function CartaoCapa() {
  const { programacao: p } = useConteudo();
  // "Conheça os nossos horários" → linha fina + linha forte, como na arte
  const palavras = p.capaTitulo.split(" ");
  const meio = Math.ceil(palavras.length / 2);
  const fina = palavras.slice(0, meio).join(" ");
  const forte = palavras.slice(meio).join(" ");
  return (
    <Papel variante={2} className={cn("flex h-full flex-col p-6 sm:p-7", p.capaImagem ? "" : "pt-[34%] sm:pt-[34%]")}>
      {p.capaImagem && (
        <div className="-mx-1 -mt-1 overflow-hidden rounded-[1.25rem] shadow-lg">
          <img src={p.capaImagem} alt="" className="aspect-[5/4] w-full object-cover object-top" loading="lazy" />
        </div>
      )}
      <div className={p.capaImagem ? "mt-auto pt-5" : ""}>
        <p className="text-[1.45rem] font-medium uppercase leading-none tracking-wide text-marca-escura font-[family-name:var(--font-titulo)]">{fina}</p>
        <p className="mt-1.5 text-[2.1rem] font-extrabold uppercase leading-[0.95] text-marca-escura font-[family-name:var(--font-titulo)]">{forte}</p>
        {p.capaSubtitulo && <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-marca-escura/75">{p.capaSubtitulo}</p>}
      </div>
      {!p.capaImagem && <img src="/simbolo.svg" alt="" aria-hidden className="mt-auto w-16 self-end opacity-80" />}
    </Papel>
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
        <button onClick={() => irPara(ativo - 1)} disabled={ativo === 0} aria-label="Anterior" className="grid size-11 place-items-center rounded-full border border-marca/20 bg-white text-marca shadow-sm transition hover:border-marca disabled:opacity-35"><ChevronLeft size={20} /></button>
        <button onClick={() => irPara(ativo + 1)} disabled={ativo >= total - 1} aria-label="Próximo" className="grid size-11 place-items-center rounded-full border border-marca/20 bg-white text-marca shadow-sm transition hover:border-marca disabled:opacity-35"><ChevronRight size={20} /></button>
      </div>
      <div
        ref={trilho}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto scroll-smooth px-5 pb-6 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:gap-5 sm:px-8 sm:[mask-image:linear-gradient(to_right,black_88%,transparent)] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label="Agenda da semana"
      >
        {comCapa && (
          <div className="w-[78vw] max-w-[310px] shrink-0 snap-start sm:w-[300px]" style={{ aspectRatio: "4 / 5.2" }}>
            <CartaoCapa />
          </div>
        )}
        {p.dias.map((d, i) => (
          <div key={d.id} className="w-[78vw] max-w-[310px] shrink-0 snap-start sm:w-[300px]" style={{ aspectRatio: "4 / 5.2" }}>
            <CartaoDia d={d} i={i} hoje={d.diaSemana === hoje} />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i} onClick={() => irPara(i)} aria-label={`Cartão ${i + 1}`} className={cn("h-1.5 rounded-full transition-all", i === ativo ? "w-6 bg-marca" : "w-1.5 bg-marca/25 hover:bg-marca/50")} />
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
        <li key={d.id} className="rounded-2xl bg-white p-5 ring-1 ring-linha/60">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-destaque">{d.dia}</p>
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
