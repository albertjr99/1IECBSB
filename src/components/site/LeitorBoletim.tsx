/**
 * Leitor de boletim em tela cheia: páginas lado a lado (no computador) ou uma a
 * uma (no celular), com virada de página, miniaturas, zoom, download e compartilhar.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, Loader2, Share2, X, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { FolhasEscaladas } from "@/components/boletim/Folhas";
import { obterBoletimPublico } from "@/lib/api-boletim";
import { dataPorExtenso, type Boletim } from "@/lib/boletim";
import { cn } from "@/lib/utils";

export type ItemBoletim = {
  data: string;
  titulo: string;
  pdf: string;
  capa?: string;
  /** imagens das páginas (boletins em PDF) — ou nada, para os feitos no editor */
  paginas?: string[];
  /** o boletim já carregado (evita buscar de novo) */
  boletim?: Boletim;
};

function usePar() {
  const [par, setPar] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const f = () => setPar(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return par;
}

export function LeitorBoletim({ item, aoFechar }: { item: ItemBoletim; aoFechar: () => void }) {
  const [editor, setEditor] = useState<Boletim | null>(item.boletim ?? null);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [zoom, setZoom] = useState(false);
  const par = usePar() && !zoom;
  const toque = useRef<number | null>(null);
  const palco = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = palco.current;
    if (!el) return;
    const f = () => setArea({ w: el.clientWidth, h: el.clientHeight });
    f();
    const ro = new ResizeObserver(f);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom]);

  useEffect(() => {
    if (item.paginas || item.boletim) return;
    obterBoletimPublico({ data: { data: item.data } }).then(setEditor).catch(() => toast.error("Não foi possível abrir o boletim."));
  }, [item]);

  const total = item.paginas?.length ?? editor?.paginas.length ?? 0;
  const passo = par ? 2 : 1;
  const inicio = par ? i - (i % 2) : i;
  const visiveis = [inicio, inicio + 1].slice(0, passo).filter((n) => n < total);

  const ir = useCallback((n: number) => {
    const alvo = Math.max(0, Math.min(total - 1, n));
    setDir(alvo >= inicio ? 1 : -1);
    setI(alvo);
  }, [total, inicio]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
      if (e.key === "ArrowRight") ir(inicio + passo);
      if (e.key === "ArrowLeft") ir(inicio - passo);
    };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [ir, inicio, passo, aoFechar]);

  const nome = `${item.titulo} – ${dataPorExtenso(item.data)}`;
  const compartilhar = async () => {
    const url = `${window.location.origin}/boletins?ler=${item.data}`;
    if (navigator.share) { try { await navigator.share({ title: nome, url }); return; } catch { /* cancelado */ } }
    await navigator.clipboard?.writeText(url);
    toast.success("Link do boletim copiado.");
  };

  const pagina = (n: number) => (
    <div key={n} className="leitor-folha relative bg-white shadow-[0_30px_60px_-25px_rgba(0,0,0,0.8)]" style={{ aspectRatio: "210 / 297" }}>
      {item.paginas ? (
        <img src={item.paginas[n]} alt={`Página ${n + 1}`} className="absolute inset-0 size-full object-contain" draggable={false} />
      ) : editor ? (
        <FolhasEscaladas boletim={editor} somentePagina={editor.paginas[n]!.id} espaco={0} />
      ) : null}
    </div>
  );

  return (
    <div className="leitor fixed inset-0 z-[80] flex flex-col bg-[#001626]/95 text-white backdrop-blur-md" role="dialog" aria-modal="true" aria-label={nome}>
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[url('/marca/grafismo-monte-transparente-branco.svg')] bg-[length:1600px_auto] bg-[position:center_bottom_-120px] bg-no-repeat opacity-[0.05]" />

      {/* topo */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-white/[0.04] px-3 py-2.5 backdrop-blur-xl sm:px-5">
        <img src="/simbolo-negativo.svg" alt="" className="hidden w-11 sm:block" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-bold">{item.titulo}</p>
          <p className="truncate text-[12px] text-white/60">{dataPorExtenso(item.data)}</p>
        </div>
        <span className="hidden text-[12px] tabular-nums text-white/60 sm:block">
          {total ? (visiveis.length > 1 ? `Páginas ${visiveis[0]! + 1}–${visiveis[1]! + 1} de ${total}` : `Página ${visiveis[0]! + 1} de ${total}`) : ""}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setZoom((z) => !z)} className="leitor-botao" title={zoom ? "Ver páginas inteiras" : "Ampliar para ler"}>{zoom ? <ZoomOut size={17} /> : <ZoomIn size={17} />}</button>
          <button type="button" onClick={compartilhar} className="leitor-botao" title="Compartilhar"><Share2 size={17} /></button>
          <a href={item.pdf} download className="leitor-botao !w-auto gap-2 px-3 text-[12px] font-bold uppercase tracking-[0.12em]" title="Baixar PDF"><FileDown size={17} /><span className="hidden sm:inline">Baixar</span></a>
          <button type="button" onClick={aoFechar} className="leitor-botao ml-1 !bg-white !text-[#002a47]" title="Fechar (Esc)"><X size={18} /></button>
        </div>
      </header>

      {/* páginas */}
      <div
        className={cn("relative min-h-0 flex-1", zoom ? "overflow-y-auto" : "overflow-hidden")}
        onPointerDown={(e) => { toque.current = e.clientX; }}
        onPointerUp={(e) => {
          if (toque.current === null || zoom) return;
          const dx = e.clientX - toque.current;
          toque.current = null;
          if (Math.abs(dx) > 50) ir(dx < 0 ? inicio + passo : inicio - passo);
        }}
      >
        {!total ? (
          <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-white/60" /></div>
        ) : zoom ? (
          <div className="mx-auto grid max-w-[1000px] gap-6 px-3 py-6">{Array.from({ length: total }, (_, n) => pagina(n))}</div>
        ) : (
          <div className="absolute inset-0 [perspective:2200px]">
            <div ref={palco} className="absolute inset-x-3 inset-y-4 flex items-center justify-center sm:inset-x-24 sm:inset-y-5">
              {area.w > 0 && (() => {
                const n = visiveis.length;
                const h = Math.min(area.h, ((area.w - (n - 1) * 6) / n) * (297 / 210));
                return (
                  <div key={inicio} className={cn("flex gap-1.5", dir > 0 ? "leitor-vira-dir" : "leitor-vira-esq")}>
                    {visiveis.map((p) => <div key={p} style={{ width: h * (210 / 297), height: h }}>{pagina(p)}</div>)}
                  </div>
                );
              })()}
            </div>
            <button type="button" disabled={inicio === 0} onClick={() => ir(inicio - passo)} className="leitor-seta left-2 sm:left-5" aria-label="Anterior"><ChevronLeft size={24} /></button>
            <button type="button" disabled={inicio + passo >= total} onClick={() => ir(inicio + passo)} className="leitor-seta right-2 sm:right-5" aria-label="Próxima"><ChevronRight size={24} /></button>
          </div>
        )}
      </div>

      {/* miniaturas */}
      {total > 0 && !zoom && (
        <footer className="flex shrink-0 justify-center gap-2.5 border-t border-white/10 bg-white/[0.04] px-3 py-3 backdrop-blur-xl">
          {Array.from({ length: total }, (_, n) => (
            <button key={n} type="button" onClick={() => ir(n)} aria-label={`Página ${n + 1}`} className={cn("relative w-11 overflow-hidden bg-white transition sm:w-12", visiveis.includes(n) ? "ring-2 ring-white ring-offset-2 ring-offset-[#001626]" : "opacity-45 hover:opacity-80")} style={{ aspectRatio: "210 / 297" }}>
              {item.paginas ? <img src={item.paginas[n]} alt="" className="size-full object-cover" loading="lazy" /> : <span className="grid size-full place-items-center text-[13px] font-bold text-[#00436f]">{n + 1}</span>}
            </button>
          ))}
        </footer>
      )}
    </div>
  );
}
