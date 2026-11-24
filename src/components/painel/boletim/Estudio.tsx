/**
 * Estúdio do boletim: as folhas A4 de verdade, editáveis no lugar (como num
 * Word), com a estrutura ao lado, uma barra flutuante na seção selecionada e
 * janelas completas para cada tipo de seção.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Check, ChevronDown, CircleDot, Copy, Eye, EyeOff, FileDown, Globe, Link2, Loader2,
  Maximize2, Minus, MousePointerClick, PenLine, Plus, Redo2, Share2, Trash2, Undo2, X,
} from "lucide-react";
import { toast } from "sonner";
import { FolhasEscaladas } from "@/components/boletim/Folhas";
import { EdicaoCtx, type Edicao } from "@/components/boletim/Editavel";
import { textoPuro } from "@/components/boletim/marcacao";
import { blocoNovo, dataPorExtenso, LARGURA_ROTULO, novoIdB, TIPO_ROTULO, type Bloco, type Boletim, type Largura, type TipoBloco } from "@/lib/boletim";
import { obterBoletimPainel, publicarBoletim, salvarBoletim } from "@/lib/api-boletim";
import { cn } from "@/lib/utils";
import { IconeWhatsapp } from "@/components/site/Icones";
import { ICONE_TIPO } from "./comum";
import { JanelaBloco, JanelaNovaSecao, SeloOcupacao } from "./Janelas";

type Estado = "salvo" | "pendente" | "salvando" | "erro";
const A4 = 793.7;

function resumoBloco(b: Bloco): string {
  switch (b.tipo) {
    case "artigo": return textoPuro(b.titulo || b.rotulo);
    case "avisos": return b.itens.map((i) => textoPuro(i.titulo)).filter(Boolean).join(" · ");
    case "escala": return `${b.linhas.length} funções · ${b.porteiros.length} porteiros`;
    case "aniversariantes": return textoPuro(b.titulo);
    case "agenda": return b.grupos.map((g) => g.titulo).join(", ");
    case "expediente": return "Igreja, pastores e diretoria";
    default: return "titulo" in b ? textoPuro(String(b.titulo)) : "";
  }
}

function localizar(b: Boletim, id: string | null) {
  if (!id) return null;
  for (let pi = 0; pi < b.paginas.length; pi++) {
    const bi = b.paginas[pi]!.blocos.findIndex((x) => x.id === id);
    if (bi >= 0) return { pi, bi };
  }
  return null;
}

export function EstudioBoletim({ id, aoVoltar }: { id: string; aoVoltar: () => void }) {
  const [b, setBEstado] = useState<Boletim | null>(null);
  const bRef = useRef<Boletim | null>(null);
  const hist = useRef({ passado: [] as Boletim[], futuro: [] as Boletim[], quando: 0, chave: "" });
  const [, setVersaoHist] = useState(0);
  const [estado, setEstado] = useState<Estado>("salvo");
  const [sel, setSel] = useState<string | null>(null);
  const [janela, setJanela] = useState<string | null>(null);
  const [novaSecao, setNovaSecao] = useState<{ pagina: string; depoisDe?: string } | null>(null);
  const [ocupacao, setOcupacao] = useState<Record<string, number>>({});
  const [publicando, setPublicando] = useState(false);
  const [zoom, setZoom] = useState<number | "ajustar">("ajustar");
  const [largCanvas, setLargCanvas] = useState(900);
  const [compartilhar, setCompartilhar] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const carregado = useRef(false);

  const definir = (novo: Boletim) => { bRef.current = novo; setBEstado(novo); };

  useEffect(() => {
    obterBoletimPainel({ data: { id } }).then((r) => { bRef.current = r.boletim; setBEstado(r.boletim); }).catch((e) => { toast.error(e.message); aoVoltar(); });
  }, [id]);

  /** Toda mudança passa por aqui: guarda o histórico (desfazer) e agrupa a digitação. */
  const mudar = useCallback((fn: (d: Boletim) => void, chave = "") => {
    const ant = bRef.current;
    if (!ant) return;
    const h = hist.current;
    const agora = Date.now();
    if (!chave || chave !== h.chave || agora - h.quando > 1200) {
      h.passado.push(ant);
      if (h.passado.length > 150) h.passado.shift();
    }
    h.quando = agora;
    h.chave = chave;
    h.futuro = [];
    const d = structuredClone(ant);
    fn(d);
    definir(d);
    setVersaoHist((v) => v + 1);
  }, []);

  const mudarBloco = useCallback((blocoId: string, fn: (x: Bloco) => void, chave?: string) => {
    mudar((d) => {
      for (const p of d.paginas) { const x = p.blocos.find((y) => y.id === blocoId); if (x) { fn(x); return; } }
    }, chave ?? "");
  }, [mudar]);

  const desfazer = useCallback(() => {
    const h = hist.current;
    const ant = h.passado.pop();
    if (!ant || !bRef.current) return;
    h.futuro.push(bRef.current);
    h.chave = "";
    definir(ant);
    setVersaoHist((v) => v + 1);
  }, []);
  const refazer = useCallback(() => {
    const h = hist.current;
    const prox = h.futuro.pop();
    if (!prox || !bRef.current) return;
    h.passado.push(bRef.current);
    h.chave = "";
    definir(prox);
    setVersaoHist((v) => v + 1);
  }, []);

  // salvamento automático
  const salvarAgora = useCallback(async () => {
    if (!bRef.current) return;
    setEstado("salvando");
    try { await salvarBoletim({ data: { boletim: bRef.current } }); setEstado("salvo"); }
    catch (e) { setEstado("erro"); toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
  }, []);
  useEffect(() => {
    if (!b) return;
    if (!carregado.current) { carregado.current = true; return; }
    setEstado("pendente");
    const t = setTimeout(salvarAgora, 900);
    return () => clearTimeout(t);
  }, [b, salvarAgora]);

  // atalhos
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) refazer(); else desfazer(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); refazer(); return; }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); salvarAgora(); return; }
      if (janela || novaSecao) return;
      const editando = (document.activeElement as HTMLElement | null)?.closest?.(".bol-ed, input, textarea, select");
      if (e.key === "Escape" && !editando) setSel(null);
      if (e.key === "Enter" && sel && !editando) { e.preventDefault(); setJanela(sel); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [desfazer, refazer, salvarAgora, janela, novaSecao, sel]);

  // largura disponível para o zoom "ajustar"
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargCanvas(el.clientWidth));
    ro.observe(el);
    setLargCanvas(el.clientWidth);
    return () => ro.disconnect();
  }, [b === null]);
  const escala = zoom === "ajustar" ? Math.max(0.5, Math.min(1.2, (largCanvas - 96) / A4)) : zoom;

  const edicao = useMemo<Edicao>(() => ({
    mudar: (blocoId, fn) => mudarBloco(blocoId, fn, `ed:${blocoId}`),
    adicionar: (pagina) => setNovaSecao({ pagina }),
    mudarBoletim: (fn) => mudar(fn, "capa"),
  }), [mudarBloco, mudar]);

  const aoOcupacao = useCallback((pagina: string, pct: number) => {
    setOcupacao((o) => (o[pagina] === pct ? o : { ...o, [pagina]: pct }));
  }, []);

  if (!b) return <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-p-acento" /></div>;

  const linkSite = typeof window !== "undefined" ? `${window.location.origin}/boletim/${b.data}` : `/boletim/${b.data}`;
  const linkPdf = `/api/boletim/${b.publicado ? b.data : b.id}/pdf`;
  const loc = localizar(b, sel);
  const selBloco = loc ? b.paginas[loc.pi]!.blocos[loc.bi]! : null;

  const irPara = (blocoId: string) => {
    setSel(blocoId);
    requestAnimationFrame(() => canvas.current?.querySelector(`[data-bloco="${blocoId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const moverBloco = (de: { pi: number; bi: number }, para: { pi: number; bi: number }) => mudar((d) => {
    const [bl] = d.paginas[de.pi]!.blocos.splice(de.bi, 1);
    let alvo = para.bi;
    if (de.pi === para.pi && para.bi > de.bi) alvo--;
    d.paginas[para.pi]!.blocos.splice(alvo, 0, bl!);
  });

  const passo = (dir: -1 | 1) => {
    if (!loc) return;
    const pag = b.paginas[loc.pi]!;
    if (dir < 0) {
      if (loc.bi > 0) moverBloco(loc, { pi: loc.pi, bi: loc.bi - 1 });
      else if (loc.pi > 0) moverBloco(loc, { pi: loc.pi - 1, bi: b.paginas[loc.pi - 1]!.blocos.length });
    } else {
      if (loc.bi < pag.blocos.length - 1) moverBloco(loc, { pi: loc.pi, bi: loc.bi + 2 });
      else if (loc.pi < b.paginas.length - 1) moverBloco(loc, { pi: loc.pi + 1, bi: 0 });
    }
    requestAnimationFrame(() => irPara(sel!));
  };

  const excluir = (blocoId: string) => {
    const l = localizar(b, blocoId);
    if (!l) return;
    const nome = TIPO_ROTULO[b.paginas[l.pi]!.blocos[l.bi]!.tipo];
    mudar((d) => { d.paginas[l.pi]!.blocos.splice(l.bi, 1); });
    setSel(null);
    toast(`“${nome}” excluída`, { action: { label: "Desfazer", onClick: desfazer } });
  };

  const duplicar = (blocoId: string) => {
    const l = localizar(b, blocoId);
    if (!l) return;
    const c = structuredClone(b.paginas[l.pi]!.blocos[l.bi]!);
    c.id = novoIdB(c.tipo.slice(0, 3));
    mudar((d) => { d.paginas[l.pi]!.blocos.splice(l.bi + 1, 0, c); });
    irPara(c.id);
  };

  const inserir = (t: TipoBloco) => {
    if (!novaSecao) return;
    const n = blocoNovo(t);
    mudar((d) => {
      const pi = d.paginas.findIndex((p) => p.id === novaSecao.pagina);
      const pag = d.paginas[pi < 0 ? d.paginas.length - 1 : pi]!;
      const depois = novaSecao.depoisDe ? pag.blocos.findIndex((x) => x.id === novaSecao.depoisDe) : -1;
      pag.blocos.splice(depois >= 0 ? depois + 1 : pag.blocos.length, 0, n);
    });
    setNovaSecao(null);
    irPara(n.id);
    setTimeout(() => setJanela(n.id), 120);
  };

  const alternarPublicacao = async () => {
    setPublicando(true);
    try {
      await salvarBoletim({ data: { boletim: b } });
      const r = await publicarBoletim({ data: { id: b.id, publicar: !b.publicado } });
      definir({ ...b, publicado: !b.publicado, ...(r.publicadoEm ? { publicadoEm: r.publicadoEm } : {}) });
      toast.success(b.publicado ? "Boletim retirado do site." : "Boletim publicado no site!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } finally { setPublicando(false); }
  };

  const compartilharNativo = async () => {
    const texto = `${b.titulo} – ${dataPorExtenso(b.data)}`;
    if (navigator.share) { try { await navigator.share({ title: texto, text: texto, url: linkSite }); return; } catch { /* cancelado */ } }
    await navigator.clipboard?.writeText(linkSite);
    toast.success("Link copiado.");
  };

  const podeDesfazer = hist.current.passado.length > 0;
  const podeRefazer = hist.current.futuro.length > 0;
  const paginaNova = novaSecao ? Math.max(1, b.paginas.findIndex((p) => p.id === novaSecao.pagina) + 1) : 1;

  return (
    <div className="flex h-full min-h-0 flex-col bg-p-fundo">
      {/* ── barra superior ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-p-borda bg-p-superficie px-3 py-2 sm:px-4">
        <button onClick={aoVoltar} className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold text-p-texto-2 hover:bg-p-hover"><ArrowLeft size={16} /> Boletins</button>
        <span className="h-6 w-px bg-p-borda" />
        <div className="flex min-w-0 items-center gap-2 pl-1">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold leading-tight text-p-texto">{b.titulo}</p>
            <label className="relative inline-flex cursor-pointer items-center gap-1 text-[12px] text-p-suave hover:text-p-acento">
              <CalendarDays size={12} /> {dataPorExtenso(b.data)} <ChevronDown size={11} />
              <input type="date" value={b.data} onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()} onChange={(e) => e.target.value && mudar((d) => { d.data = e.target.value; })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Data do boletim" />
            </label>
          </div>
          <span className="ml-2 hidden items-center gap-1.5 text-[12px] text-p-suave sm:flex">
            {estado === "salvando" && <><Loader2 size={12} className="animate-spin" /> Salvando…</>}
            {estado === "pendente" && <><CircleDot size={12} className="text-amber-500" /> Editando…</>}
            {estado === "salvo" && <><Check size={12} className="text-emerald-600 dark:text-emerald-400" /> Salvo</>}
            {estado === "erro" && <span className="text-red-600 dark:text-red-400">Não salvo — tente Ctrl+S</span>}
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-md border border-p-borda">
            <button title="Desfazer (Ctrl+Z)" disabled={!podeDesfazer} onClick={desfazer} className="grid size-8 place-items-center text-p-texto-2 hover:bg-p-hover disabled:opacity-30"><Undo2 size={15} /></button>
            <button title="Refazer (Ctrl+Shift+Z)" disabled={!podeRefazer} onClick={refazer} className="grid size-8 place-items-center border-l border-p-borda text-p-texto-2 hover:bg-p-hover disabled:opacity-30"><Redo2 size={15} /></button>
          </div>
          <div className="hidden items-center rounded-md border border-p-borda md:flex">
            <button title="Diminuir" onClick={() => setZoom(Math.max(0.5, Math.round((escala - 0.1) * 10) / 10))} className="grid size-8 place-items-center text-p-texto-2 hover:bg-p-hover"><Minus size={14} /></button>
            <button title="Ajustar à tela" onClick={() => setZoom("ajustar")} className={cn("h-8 min-w-14 border-x border-p-borda px-2 text-[12px] font-semibold tabular-nums", zoom === "ajustar" ? "text-p-acento" : "text-p-texto-2 hover:bg-p-hover")}>{Math.round(escala * 100)}%</button>
            <button title="Aumentar" onClick={() => setZoom(Math.min(1.6, Math.round((escala + 0.1) * 10) / 10))} className="grid size-8 place-items-center text-p-texto-2 hover:bg-p-hover"><Plus size={14} /></button>
          </div>
          <a href={linkPdf} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-p-borda px-3 text-[12.5px] font-semibold text-p-texto-2 hover:bg-p-hover"><FileDown size={15} /> PDF</a>
          {b.publicado && (
            <div className="relative">
              <button onClick={() => setCompartilhar((v) => !v)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-p-borda px-3 text-[12.5px] font-semibold text-p-texto-2 hover:bg-p-hover"><Share2 size={15} /> Compartilhar <ChevronDown size={13} /></button>
              {compartilhar && (
                <div className="absolute right-0 top-full z-40 mt-1 w-60 rounded-lg border border-p-borda bg-p-superficie p-1 shadow-xl" onMouseLeave={() => setCompartilhar(false)}>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${b.titulo} – ${dataPorExtenso(b.data)}\n${linkSite}`)}`} target="_blank" rel="noopener" className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-p-texto hover:bg-p-hover"><IconeWhatsapp size={15} /> Enviar no WhatsApp</a>
                  <button onClick={() => { navigator.clipboard?.writeText(linkSite).then(() => toast.success("Link copiado.")); setCompartilhar(false); }} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-p-texto hover:bg-p-hover"><Link2 size={15} /> Copiar link</button>
                  <button onClick={() => { compartilharNativo(); setCompartilhar(false); }} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-p-texto hover:bg-p-hover"><Share2 size={15} /> Outras opções…</button>
                  <a href={`/boletim/${b.data}`} target="_blank" rel="noopener" className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-p-texto hover:bg-p-hover"><Globe size={15} /> Ver no site</a>
                </div>
              )}
            </div>
          )}
          <button disabled={publicando} onClick={alternarPublicacao} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-3.5 text-[12.5px] font-bold transition disabled:opacity-60", b.publicado ? "border border-p-borda text-p-texto-2 hover:bg-p-hover" : "bg-p-acento text-white hover:opacity-90")}>
            {publicando ? <Loader2 size={14} className="animate-spin" /> : b.publicado ? <EyeOff size={14} /> : <Eye size={14} />}
            {b.publicado ? "Retirar do site" : "Publicar no site"}
          </button>
        </div>
      </div>
      {b.publicado && (
        <div className="flex shrink-0 items-center gap-2 bg-emerald-500/10 px-4 py-1.5 text-[12px] text-emerald-800 dark:text-emerald-300">
          <Globe size={13} /> No ar em <a className="font-semibold underline" href={`/boletim/${b.data}`} target="_blank" rel="noopener">{linkSite.replace(/^https?:\/\//, "")}</a> — o que você salva aparece no site na hora.
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <Estrutura b={b} sel={sel} ocupacao={ocupacao} irPara={irPara} abrir={setJanela} moverBloco={moverBloco} mudar={mudar} novaSecao={(pagina) => setNovaSecao({ pagina })} />

        {/* ── as folhas ── */}
        <div className="relative min-w-0 flex-1">
          <div ref={canvas} className="absolute inset-0 overflow-auto" onClick={() => setSel(null)}>
            <div className="mx-auto py-8" style={{ width: A4 * escala }}>
              <EdicaoCtx.Provider value={edicao}>
                <div className="bol-editando">
                  <FolhasEscaladas boletim={b} marcarTransbordo aoSelecionar={setSel} aoAbrir={setJanela} aoOcupacao={aoOcupacao} selecionado={sel} espaco={36} />
                </div>
              </EdicaoCtx.Provider>
              <button onClick={(e) => { e.stopPropagation(); mudar((d) => { d.paginas.push({ id: novoIdB("pg"), blocos: [] }); }); }} className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-p-borda-forte py-4 text-[13.5px] font-semibold text-p-texto-2 hover:border-p-acento hover:text-p-acento">
                <Plus size={16} /> Adicionar página
              </button>
            </div>
          </div>
          {selBloco && loc && !janela && (
            <BarraFlutuante
              canvas={canvas} bloco={selBloco} versao={b} escala={escala}
              paginas={b.paginas.length} pi={loc.pi}
              abrir={() => setJanela(selBloco.id)}
              subir={() => passo(-1)} descer={() => passo(1)}
              paraPagina={(pi) => { moverBloco(loc, { pi, bi: b.paginas[pi]!.blocos.length }); requestAnimationFrame(() => irPara(selBloco.id)); }}
              largura={(l) => mudarBloco(selBloco.id, (x) => { x.largura = l; })}
              letras={(d) => mudarBloco(selBloco.id, (x) => { x.ajuste = Math.max(85, Math.min(100, (x.ajuste || 100) + d)); }, `aj:${selBloco.id}`)}
              inserir={() => setNovaSecao({ pagina: b.paginas[loc.pi]!.id, depoisDe: selBloco.id })}
              duplicar={() => duplicar(selBloco.id)}
              excluir={() => excluir(selBloco.id)}
              fechar={() => setSel(null)}
            />
          )}
          <Dicas />
        </div>
      </div>

      {janela && <JanelaBloco boletim={b} blocoId={janela} mudar={mudarBloco} aoFechar={() => setJanela(null)} />}
      {novaSecao && <JanelaNovaSecao pagina={paginaNova} aoEscolher={inserir} aoFechar={() => setNovaSecao(null)} />}
    </div>
  );
}

// ─── Estrutura (lateral) ────────────────────────────────────────────────────

function Estrutura({ b, sel, ocupacao, irPara, abrir, moverBloco, mudar, novaSecao }: {
  b: Boletim; sel: string | null; ocupacao: Record<string, number>;
  irPara: (id: string) => void; abrir: (id: string) => void;
  moverBloco: (de: { pi: number; bi: number }, para: { pi: number; bi: number }) => void;
  mudar: (fn: (d: Boletim) => void) => void; novaSecao: (pagina: string) => void;
}) {
  const arrastando = useRef<{ pi: number; bi: number } | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const soltar = (pi: number, bi: number) => {
    const de = arrastando.current;
    arrastando.current = null;
    setAlvo(null);
    if (!de || (de.pi === pi && (de.bi === bi || de.bi + 1 === bi))) return;
    moverBloco(de, { pi, bi });
  };
  const zona = (pi: number, bi: number) => ({
    onDragOver: (e: React.DragEvent) => { if (!arrastando.current) return; e.preventDefault(); e.stopPropagation(); setAlvo(`${pi}:${bi}`); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); soltar(pi, bi); },
  });

  return (
    <aside className="hidden w-[272px] shrink-0 flex-col border-r border-p-borda bg-p-superficie lg:flex">
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-p-suave">Estrutura</span>
        <span className="text-[11.5px] text-p-suave">{b.paginas.length} páginas</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
        {b.paginas.map((pg, pi) => {
          const oc = ocupacao[pg.id] ?? null;
          return (
            <section key={pg.id} className="group/p mb-2 rounded-lg border border-p-borda bg-p-sutil/60" {...zona(pi, pg.blocos.length)}>
              <header className="flex items-center gap-2 px-2.5 py-2">
                <button onClick={() => document.querySelector(`[data-pagina-id="${pg.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="grid size-6 shrink-0 place-items-center rounded bg-p-acento text-[11px] font-bold text-white">{pi + 1}</span>
                  <span className="whitespace-nowrap text-[12.5px] font-semibold text-p-texto">{pi === 0 ? "Capa" : `Página ${pi + 1}`}</span>
                </button>
                <SeloOcupacao pct={oc} compacto />
                <span className="flex opacity-0 transition group-hover/p:opacity-100">
                  <button title="Subir página" disabled={pi === 0} onClick={() => mudar((d) => { const [p] = d.paginas.splice(pi, 1); d.paginas.splice(pi - 1, 0, p!); })} className="grid size-6 place-items-center rounded text-p-suave hover:bg-p-hover disabled:opacity-30"><ArrowUp size={13} /></button>
                  <button title="Descer página" disabled={pi === b.paginas.length - 1} onClick={() => mudar((d) => { const [p] = d.paginas.splice(pi, 1); d.paginas.splice(pi + 1, 0, p!); })} className="grid size-6 place-items-center rounded text-p-suave hover:bg-p-hover disabled:opacity-30"><ArrowDown size={13} /></button>
                  <button title="Excluir página" disabled={b.paginas.length === 1} onClick={() => { if (pg.blocos.length === 0 || confirm(`Excluir a página ${pi + 1} e tudo o que há nela?`)) mudar((d) => { d.paginas.splice(pi, 1); }); }} className="grid size-6 place-items-center rounded text-p-suave hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                </span>
              </header>
              <ul className="grid gap-0.5 px-1.5 pb-1.5">
                {pg.blocos.map((bl, bi) => {
                  const I = ICONE_TIPO[bl.tipo];
                  const ativo = sel === bl.id;
                  return (
                    <li key={bl.id} {...zona(pi, bi)} className={cn("relative", alvo === `${pi}:${bi}` && "before:absolute before:inset-x-1 before:-top-[2px] before:h-[3px] before:rounded-full before:bg-p-acento")}>
                      <button
                        draggable
                        onDragStart={(e) => { arrastando.current = { pi, bi }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", bl.id); }}
                        onDragEnd={() => { arrastando.current = null; setAlvo(null); }}
                        onClick={() => irPara(bl.id)}
                        onDoubleClick={() => abrir(bl.id)}
                        className={cn("flex w-full cursor-grab items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition active:cursor-grabbing", ativo ? "bg-p-acento text-white shadow-sm" : "hover:bg-p-hover")}
                      >
                        <I size={15} className={cn("shrink-0", ativo ? "text-white" : "text-p-acento")} />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-[12.5px] font-semibold", ativo ? "text-white" : "text-p-texto")}>{TIPO_ROTULO[bl.tipo]}</span>
                          <span className={cn("block truncate text-[11px]", ativo ? "text-white/75" : "text-p-suave")}>{resumoBloco(bl) || "—"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                <li className={cn("relative", alvo === `${pi}:${pg.blocos.length}` && "before:absolute before:inset-x-1 before:-top-[2px] before:h-[3px] before:rounded-full before:bg-p-acento")}>
                  <button onClick={() => novaSecao(pg.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-semibold text-p-suave opacity-70 transition hover:bg-p-realce hover:text-p-acento hover:opacity-100 group-hover/p:opacity-100">
                    <Plus size={14} /> Adicionar seção
                  </button>
                </li>
              </ul>
            </section>
          );
        })}
        <button onClick={() => mudar((d) => { d.paginas.push({ id: novoIdB("pg"), blocos: [] }); })} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-p-borda-forte py-2.5 text-[12.5px] font-semibold text-p-texto-2 hover:border-p-acento hover:text-p-acento">
          <Plus size={14} /> Nova página
        </button>
        <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-p-suave">Arraste as seções para mudar a ordem ou levar para outra página. Clique duas vezes para abrir o editor completo.</p>
      </div>
    </aside>
  );
}

// ─── Barra flutuante da seção selecionada ───────────────────────────────────

const LARGURAS: Largura[] = ["inteira", "dois-tercos", "larga", "estreita", "um-terco"];

function BarraFlutuante({ canvas, bloco, versao, escala, paginas, pi, abrir, subir, descer, paraPagina, largura, letras, inserir, duplicar, excluir, fechar }: {
  canvas: RefObject<HTMLDivElement | null>; bloco: Bloco; versao: unknown; escala: number; paginas: number; pi: number;
  abrir: () => void; subir: () => void; descer: () => void; paraPagina: (pi: number) => void; largura: (l: Largura) => void;
  letras: (d: number) => void; inserir: () => void; duplicar: () => void; excluir: () => void; fechar: () => void;
}) {
  const barra = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const calcular = () => {
      const el = c.querySelector(`[data-bloco="${bloco.id}"]`);
      if (!el) { setPos(null); return; }
      const r = el.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      const larg = barra.current?.offsetWidth ?? 560;
      const alt = 46;
      if (r.bottom < cr.top + 20 || r.top > cr.bottom - 20) { setPos(null); return; }
      let top = r.top - cr.top - alt - 10;
      if (top < 8) top = Math.min(r.bottom - cr.top + 10, cr.height - alt - 8);
      if (r.top - cr.top < 8 && r.bottom - cr.top > cr.height - 60) top = 8;
      const left = Math.max(8, Math.min(r.left - cr.left, cr.width - larg - 16));
      setPos((p) => (p && Math.abs(p.top - top) < 0.5 && Math.abs(p.left - left) < 0.5 ? p : { top, left }));
    };
    calcular();
    c.addEventListener("scroll", calcular, { passive: true });
    window.addEventListener("resize", calcular);
    const t = setTimeout(calcular, 80);
    return () => { c.removeEventListener("scroll", calcular); window.removeEventListener("resize", calcular); clearTimeout(t); };
  }, [bloco.id, versao, escala, canvas]);

  const I = ICONE_TIPO[bloco.tipo];
  const sep = <span className="mx-0.5 h-5 w-px bg-white/15" />;
  const bt = "grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-white/85 transition hover:bg-white/12 hover:text-white disabled:opacity-30";
  const textual = bloco.tipo === "artigo" || bloco.tipo === "avisos" || bloco.tipo === "texto";

  return (
    <div
      ref={barra}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => { if (!(e.target as HTMLElement).closest("select")) e.preventDefault(); }}
      className="barra-flutuante absolute z-30 flex items-center gap-0.5 rounded-lg bg-[#002a47] p-1 text-[12.5px] text-white shadow-[0_12px_32px_-8px_rgba(0,20,40,0.55)] ring-1 ring-white/10"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden", top: 0, left: 0 }}
    >
      <span className="flex items-center gap-1.5 pl-2 pr-1.5 font-semibold"><I size={14} className="text-[#8fb6d3]" /> {TIPO_ROTULO[bloco.tipo]}</span>
      <button onClick={abrir} className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 font-bold text-[#002a47] hover:bg-[#d9e6ef]" title="Abrir o editor completo (Enter)">
        <PenLine size={14} /> {textual ? "Escrever" : "Editar"}
      </button>
      {sep}
      <button className={bt} title="Subir" onClick={subir}><ArrowUp size={15} /></button>
      <button className={bt} title="Descer" onClick={descer}><ArrowDown size={15} /></button>
      <select value={pi} onChange={(e) => paraPagina(Number(e.target.value))} title="Mover para a página" className="h-8 cursor-pointer rounded-md bg-transparent px-1.5 text-[12.5px] text-white/85 outline-none hover:bg-white/12 [&>option]:text-black">
        {Array.from({ length: paginas }, (_, i) => <option key={i} value={i}>Pág. {i + 1}</option>)}
      </select>
      {sep}
      <select value={bloco.largura} onChange={(e) => largura(e.target.value as Largura)} title="Largura na página" className="h-8 cursor-pointer rounded-md bg-transparent px-1.5 text-[12.5px] text-white/85 outline-none hover:bg-white/12 [&>option]:text-black">
        {LARGURAS.map((l) => <option key={l} value={l}>{LARGURA_ROTULO[l]}</option>)}
      </select>
      <button className={bt} title="Letras menores" disabled={(bloco.ajuste || 100) <= 85} onClick={() => letras(-1)}><span className="text-[11px] font-bold">A−</span></button>
      <span className="w-9 text-center text-[11.5px] tabular-nums text-white/70">{bloco.ajuste || 100}%</span>
      <button className={bt} title="Letras maiores" disabled={(bloco.ajuste || 100) >= 100} onClick={() => letras(1)}><span className="text-[13px] font-bold">A+</span></button>
      {sep}
      <button className={bt} title="Nova seção abaixo" onClick={inserir}><Plus size={15} /></button>
      <button className={bt} title="Duplicar" onClick={duplicar}><Copy size={14} /></button>
      <button className={cn(bt, "hover:!bg-red-500/80")} title="Excluir" onClick={excluir}><Trash2 size={14} /></button>
      <button className={bt} title="Fechar (Esc)" onClick={fechar}><X size={14} /></button>
    </div>
  );
}

function Dicas() {
  const [ver, setVer] = useState(() => typeof localStorage === "undefined" || localStorage.getItem("iecb_dica_boletim") !== "ok");
  if (!ver) return null;
  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 whitespace-nowrap rounded-full border border-p-borda bg-p-superficie/95 py-2 pl-4 pr-2 text-[12px] text-p-texto-2 shadow-lg backdrop-blur">
      <span className="flex items-center gap-1.5"><MousePointerClick size={14} className="text-p-acento" /> Clique num texto e escreva</span>
      <span className="flex items-center gap-1.5"><Maximize2 size={13} className="text-p-acento" /> Duplo clique abre o editor completo</span>
      <span className="hidden items-center gap-1.5 xl:flex"><Undo2 size={13} className="text-p-acento" /> Ctrl+Z desfaz</span>
      <button onClick={() => { try { localStorage.setItem("iecb_dica_boletim", "ok"); } catch { /* */ } setVer(false); }} className="grid size-6 place-items-center rounded-full text-p-suave hover:bg-p-hover"><X size={13} /></button>
    </div>
  );
}
