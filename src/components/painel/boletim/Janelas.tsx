/**
 * Janelas de edição do boletim: cada tipo de seção ganha um editor feito para
 * ele, com a página ao vivo ao lado e os ajustes de layout à mão.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlignLeft, AlignRight, ArrowDownUp, CalendarPlus, Check, ChevronsRight, ClipboardPaste, Clock, Copy, Eraser, ListPlus, Plus, Trash2, Wand2, X,
} from "lucide-react";
import { toast } from "sonner";
import { BlocoAvulso, FolhasEscaladas } from "@/components/boletim/Folhas";
import { Editavel } from "@/components/boletim/Editavel";
import { contarPalavras, paragrafos } from "@/components/boletim/marcacao";
import {
  blocoNovo, boletimModelo, novoIdB, TIPO_ROTULO,
  type Bloco, type BlocoAgenda, type BlocoAniversariantes, type BlocoArtigo, type BlocoAvisos, type BlocoEscala, type BlocoExpediente,
  type BlocoOficios, type BlocoParcerias, type BlocoTabela, type BlocoTexto, type BlocoTrabalhos, type Boletim, type Largura, type TipoBloco,
} from "@/lib/boletim";
import { cn } from "@/lib/utils";
import {
  Adicionar, Alca, AreaAuto, BarraFormatacao, Botao, Celula, classeAlvo, DESCRICAO_TIPO, ICONE_TIPO, inp, Legenda, mover, useArrastar,
} from "./comum";

/** Muda o bloco aberto; `chave` agrupa digitação seguida num só “desfazer”. */
export type MudarBloco<T extends Bloco = Bloco> = (fn: (x: T) => void, chave?: string) => void;

// ─── Moldura ────────────────────────────────────────────────────────────────

function Moldura({ children, aoFechar, larga = true }: { children: ReactNode; aoFechar: () => void; larga?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const a = document.activeElement as HTMLElement | null;
      if (a && (a.isContentEditable || a.tagName === "INPUT" || a.tagName === "TEXTAREA")) { a.blur(); return; }
      aoFechar();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [aoFechar]);
  return (
    <div className="janela-fundo fixed inset-0 z-[60] flex items-center justify-center bg-[#001626]/55 p-2 backdrop-blur-[3px] sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className={cn("janela flex h-full max-h-[940px] w-full flex-col overflow-hidden rounded-xl bg-p-superficie shadow-[0_30px_80px_-20px_rgba(0,20,40,0.55)] ring-1 ring-black/10", larga ? "max-w-[1440px]" : "max-w-[1100px]")}>
        {children}
      </div>
    </div>
  );
}

// ─── Janela de uma seção ────────────────────────────────────────────────────

export function JanelaBloco({ boletim, blocoId, mudar, aoFechar }: {
  boletim: Boletim; blocoId: string; mudar: (blocoId: string, fn: (x: Bloco) => void, chave?: string) => void; aoFechar: () => void;
}) {
  const local = useMemo(() => {
    for (let pi = 0; pi < boletim.paginas.length; pi++) {
      const p = boletim.paginas[pi]!;
      const bl = p.blocos.find((x) => x.id === blocoId);
      if (bl) return { pi, pagina: p, bloco: bl };
    }
    return null;
  }, [boletim, blocoId]);

  const [ocupacao, setOcupacao] = useState<number | null>(null);
  const ocupRef = useRef<number | null>(null);
  ocupRef.current = ocupacao;
  const blRef = useRef(local?.bloco);
  blRef.current = local?.bloco;
  const [encaixando, setEncaixando] = useState(false);

  useEffect(() => { if (!local) aoFechar(); }, [local, aoFechar]);
  if (!local) return null;
  const { bloco: b, pi, pagina } = local;
  const m: MudarBloco = (fn, chave) => mudar(b.id, fn, chave ? `${b.id}:${chave}` : undefined);
  const Icone = ICONE_TIPO[b.tipo];

  /** Reduz as letras aos poucos até a página caber (ou chegar a 85%). */
  const encaixar = () => {
    setEncaixando(true);
    let tentativas = 0;
    const passo = () => {
      const oc = ocupRef.current ?? 0;
      const aj = blRef.current?.ajuste || 100;
      if (oc <= 100 || aj <= 85 || tentativas++ > 20) {
        setEncaixando(false);
        if (oc <= 100) toast.success(`Pronto: a página ${pi + 1} ficou com ${oc}% de ocupação (letras em ${aj}%).`);
        else toast.warning("Mesmo com as letras no menor tamanho a página não coube. Reduza o texto ou mova uma seção.");
        return;
      }
      m((x) => { x.ajuste = Math.max(85, (x.ajuste || 100) - 1); }, "ajuste");
      setTimeout(passo, 220);
    };
    passo();
  };

  return (
    <Moldura aoFechar={aoFechar}>
      <header className="flex shrink-0 items-center gap-3 border-b border-p-borda px-4 py-3 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-p-realce text-p-acento"><Icone size={19} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-bold text-p-texto">{TIPO_ROTULO[b.tipo]}</h2>
          <p className="truncate text-[12.5px] text-p-suave">Página {pi + 1} · as mudanças aparecem na hora na página ao lado e são salvas sozinhas.</p>
        </div>
        <SeloOcupacao pct={ocupacao} pagina={pi + 1} />
        <button type="button" onClick={aoFechar} className="btn-primario !h-9 !rounded-md !px-4 !text-[13px]"><Check size={16} /> Concluir</button>
        <button type="button" onClick={aoFechar} title="Fechar (Esc)" className="grid size-9 place-items-center rounded-md text-p-suave hover:bg-p-hover hover:text-p-texto"><X size={18} /></button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
        <div className="min-h-0 overflow-y-auto bg-p-sutil" data-campos>
          <div className="mx-auto grid max-w-[880px] gap-5 p-4 sm:p-7">
            <EditorDoTipo b={b} m={m} dataBoletim={boletim.data} boletim={boletim} />
          </div>
        </div>
        <aside className="hidden min-h-0 flex-col border-l border-p-borda bg-p-fundo lg:flex">
          <PreviaAjustada>
            <FolhasEscaladas boletim={boletim} somentePagina={pagina.id} selecionado={b.id} aoOcupacao={(_, pct) => setOcupacao((a) => (a === pct ? a : pct))} espaco={0} />
          </PreviaAjustada>
          <PainelLayout b={b} m={m} encaixar={encaixar} encaixando={encaixando} cheio={(ocupacao ?? 0) > 100} />
        </aside>
      </div>
    </Moldura>
  );
}

/** Mostra a página inteira, do tamanho que couber, com a seção em destaque. */
function PreviaAjustada({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ajustar = () => setW(Math.floor(Math.min(el.clientWidth, el.clientHeight * (210 / 297))));
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} className="absolute inset-5 flex justify-center">
        {w > 0 && <div className="bol-foco shadow-[0_8px_30px_-10px_rgba(0,30,60,0.35)]" style={{ width: w }}>{children}</div>}
      </div>
    </div>
  );
}

export function SeloOcupacao({ pct, pagina, compacto }: { pct: number | null; pagina?: number; compacto?: boolean }) {
  if (pct === null) return null;
  const cor = pct > 100 ? "bg-red-500/12 text-red-700 dark:text-red-300" : pct >= 96 ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300";
  const texto = pct > 100 ? `Passou ${pct - 100}% da página` : pct >= 96 ? "Página cheia" : `${pct}% da página`;
  return (
    <span className={cn("hidden shrink-0 items-center rounded-full font-semibold sm:inline-flex", compacto ? "gap-1.5 px-2 py-0.5 text-[10.5px]" : "gap-2 px-3 py-1 text-[12px]", cor)} title={pagina ? `Ocupação da página ${pagina}` : undefined}>
      <span className={cn("relative h-1.5 overflow-hidden rounded-full bg-current/15", compacto ? "w-7" : "w-12")}>
        <span className="absolute inset-y-0 left-0 rounded-full bg-current" style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
      {compacto ? <span className="tabular-nums">{pct}%</span> : texto}
    </span>
  );
}

// ─── Layout (largura, letras, colunas) ──────────────────────────────────────

const LARGURAS: { v: Largura; rotulo: string; w: number }[] = [
  { v: "inteira", rotulo: "Inteira", w: 100 },
  { v: "dois-tercos", rotulo: "2/3", w: 66 },
  { v: "larga", rotulo: "Larga", w: 60 },
  { v: "estreita", rotulo: "Estreita", w: 40 },
  { v: "um-terco", rotulo: "1/3", w: 33 },
];
const DIVISOES = [
  { v: 0.5, rotulo: "Iguais" },
  { v: 0.591, rotulo: "Esq. maior" },
  { v: 0.339, rotulo: "Esq. estreita" },
  { v: 0.661, rotulo: "Dir. estreita" },
];

function PainelLayout({ b, m, encaixar, encaixando, cheio }: { b: Bloco; m: MudarBloco; encaixar: () => void; encaixando: boolean; cheio: boolean }) {
  const colunas = b.tipo === "artigo" ? b.colunas : b.tipo === "avisos" ? (b.colunas ?? 1) : null;
  const proporcao = b.tipo === "artigo" || b.tipo === "avisos" ? (b.proporcao ?? 0.5) : 0.5;
  return (
    <div className="grid shrink-0 gap-3.5 border-t border-p-borda bg-p-superficie px-5 py-4">
      <div className="grid gap-2">
        <Legenda>Largura na página</Legenda>
        <div className="grid grid-cols-5 gap-1.5">
          {LARGURAS.map((l) => (
            <button key={l.v} type="button" onClick={() => m((x) => { x.largura = l.v; })} className={cn("grid gap-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition", b.largura === l.v ? "border-p-acento bg-p-realce text-p-acento" : "border-p-borda text-p-texto-2 hover:border-p-borda-forte")}>
              <span className="h-2 rounded-sm bg-p-borda"><span className="block h-full rounded-sm bg-current" style={{ width: `${l.w}%` }} /></span>
              {l.rotulo}
            </button>
          ))}
        </div>
      </div>
      {colunas !== null && (
        <div className="grid gap-2">
          <Legenda>Colunas</Legenda>
          <div className="flex gap-1.5">
            {([1, 2] as const).map((n) => (
              <button key={n} type="button" onClick={() => m((x) => { if (x.tipo === "artigo" || x.tipo === "avisos") x.colunas = n; })} className={cn("flex-1 rounded-md border px-3 py-1.5 text-[12.5px] font-semibold", colunas === n ? "border-p-acento bg-p-realce text-p-acento" : "border-p-borda text-p-texto-2 hover:border-p-borda-forte")}>
                {n === 1 ? "Uma coluna" : "Duas colunas"}
              </button>
            ))}
          </div>
          {colunas === 2 && (
            <div className="grid grid-cols-4 gap-1.5">
              {DIVISOES.map((d) => (
                <button key={d.v} type="button" onClick={() => m((x) => { if (x.tipo === "artigo" || x.tipo === "avisos") x.proporcao = d.v; })} className={cn("grid gap-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold", Math.abs(proporcao - d.v) < 0.01 ? "border-p-acento bg-p-realce text-p-acento" : "border-p-borda text-p-texto-2 hover:border-p-borda-forte")}>
                  <span className="flex h-4 gap-0.5"><span className="rounded-sm bg-current opacity-70" style={{ width: `${d.v * 100}%` }} /><span className="flex-1 rounded-sm bg-current opacity-30" /></span>
                  {d.rotulo}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="grid gap-2">
        <Legenda acao={<span className="text-[12px] font-semibold tabular-nums text-p-texto">{b.ajuste || 100}%</span>}>Tamanho das letras</Legenda>
        <div className="flex items-center gap-3">
          <input type="range" min={85} max={100} step={1} value={b.ajuste || 100} onChange={(e) => m((x) => { x.ajuste = Number(e.target.value); }, "ajuste")} className="flex-1 accent-[var(--p-acento)]" />
          <button type="button" title="Reduz as letras só o necessário para a página caber (100% = tamanho do modelo)" disabled={encaixando} onClick={encaixar} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold transition disabled:opacity-60", cheio ? "bg-p-acento text-white hover:opacity-90" : "border border-p-borda text-p-texto-2 hover:bg-p-hover")}>
            <Wand2 size={14} className={encaixando ? "animate-pulse" : ""} aria-hidden /> {encaixando ? "Encaixando…" : "Encaixar na página"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Escolha do editor ──────────────────────────────────────────────────────

function EditorDoTipo({ b, m, dataBoletim, boletim }: { b: Bloco; m: MudarBloco; dataBoletim: string; boletim: Boletim }) {
  const mm = m as MudarBloco<never>;
  switch (b.tipo) {
    case "artigo": return <EdArtigo b={b} m={mm} />;
    case "texto": return <EdTexto b={b} m={mm} />;
    case "avisos": return <EdAvisos b={b} m={mm} />;
    case "escala": return <EdEscala b={b} m={mm} boletim={boletim} />;
    case "aniversariantes": return <EdAniversariantes b={b} m={mm} />;
    case "agenda": return <EdAgenda b={b} m={mm} dataBoletim={dataBoletim} />;
    case "trabalhos": return <EdTrabalhos b={b} m={mm} />;
    case "parcerias": return <EdParcerias b={b} m={mm} />;
    case "oficios": return <EdOficios b={b} m={mm} />;
    case "expediente": return <EdExpediente b={b} m={mm} />;
    case "tabela": return <EdTabela b={b} m={mm} />;
  }
}

// ─── Escrita (pastoral, texto livre) ────────────────────────────────────────

const campoPapel = "w-full bg-transparent outline-none placeholder:text-[#9aabb8] focus:bg-[#eef4f8]/70 rounded-sm transition";

function Papel({ children, rodape }: { children: ReactNode; rodape?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white text-[#111] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_18px_40px_-18px_rgba(0,30,60,0.28)] ring-1 ring-black/5">
      {children}
      {rodape && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#e6edf2] bg-[#f7fafc] px-8 py-2.5 text-[12px] text-[#5b7f99]">{rodape}</div>}
    </div>
  );
}

function Estatisticas({ texto }: { texto: string }) {
  const p = contarPalavras(texto);
  return (
    <>
      <span><strong className="text-[#1d2b36]">{p}</strong> palavras</span>
      <span><strong className="text-[#1d2b36]">{paragrafos(texto).length}</strong> parágrafos</span>
      <span>≈ {Math.max(1, Math.round(p / 200))} min de leitura</span>
    </>
  );
}

function BarraPapel({ children }: { children?: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[#e6edf2] bg-white/95 px-6 py-1.5 backdrop-blur [&_button]:text-[#3b5466] [&_button:hover]:bg-[#eef4f8]">
      <BarraFormatacao />
      <span className="ml-auto text-[11.5px] text-[#8aa0b2]">Enter: novo parágrafo · Shift+Enter: quebra de linha</span>
      {children}
    </div>
  );
}

function EdArtigo({ b, m }: { b: BlocoArtigo; m: MudarBloco<BlocoArtigo> }) {
  return (
    <Papel rodape={<Estatisticas texto={b.texto} />}>
      <div className="flex items-center gap-2 px-8 pt-7">
        <input value={b.rotulo} placeholder="Rótulo (ex.: Pastoral)" onChange={(e) => m((x) => { x.rotulo = e.target.value; }, "rotulo")} className={cn(campoPapel, "boletim-fonte flex-1 px-1 py-0.5 text-[17px] font-bold italic", b.rotuloLado === "direita" && "text-right")} />
        <div className="flex rounded-md border border-[#dbe5ec] p-0.5">
          {(["esquerda", "direita"] as const).map((l) => {
            const I = l === "esquerda" ? AlignLeft : AlignRight;
            return <button key={l} type="button" title={`Rótulo à ${l}`} onClick={() => m((x) => { x.rotuloLado = l; })} className={cn("grid size-7 place-items-center rounded", b.rotuloLado === l ? "bg-[#00436f] text-white" : "text-[#5b7f99] hover:bg-[#eef4f8]")}><I size={14} /></button>;
          })}
        </div>
      </div>
      <input value={b.titulo} placeholder="Título" onChange={(e) => m((x) => { x.titulo = e.target.value; }, "titulo")} className={cn(campoPapel, "boletim-fonte mt-2 px-8 py-1 text-[28px] font-bold leading-tight", b.colunas === 1 && "text-center")} />
      <BarraPapel />
      <div className="px-8 pb-6 pt-4">
        <Editavel valor={b.texto} modo="paragrafos" como="div" dica="Comece a escrever a pastoral…" className="escrita" aoMudar={(v) => m((x) => { x.texto = v; }, "texto")} />
        <input value={b.autor} placeholder="Assinatura (ex.: Pr. Hilário José)" onChange={(e) => m((x) => { x.autor = e.target.value; }, "autor")} className={cn(campoPapel, "boletim-fonte mt-6 px-1 py-1 text-right text-[18px]")} />
      </div>
    </Papel>
  );
}

function EdTexto({ b, m }: { b: BlocoTexto; m: MudarBloco<BlocoTexto> }) {
  return (
    <>
      <Papel rodape={<Estatisticas texto={b.texto} />}>
        <input value={b.titulo} placeholder="Título (opcional)" onChange={(e) => m((x) => { x.titulo = e.target.value; }, "titulo")} className={cn(campoPapel, "boletim-fonte px-8 pb-1 pt-7 text-[26px] font-bold")} />
        <BarraPapel />
        <div className="px-8 pb-7 pt-4">
          <Editavel valor={b.texto} modo="paragrafos" como="div" dica="Escreva o texto…" className="escrita escrita-sem-recuo" aoMudar={(v) => m((x) => { x.texto = v; }, "texto")} />
        </div>
      </Papel>
      <label className="flex items-center gap-3 rounded-lg border border-p-borda bg-p-superficie px-4 py-3 text-[13.5px] text-p-texto">
        <input type="checkbox" checked={b.caixa} onChange={(e) => m((x) => { x.caixa = e.target.checked; })} className="size-4 accent-[var(--p-acento)]" />
        Mostrar em uma caixa com borda
      </label>
    </>
  );
}

// ─── Avisos ─────────────────────────────────────────────────────────────────

function EdAvisos({ b, m }: { b: BlocoAvisos; m: MudarBloco<BlocoAvisos> }) {
  const arr = useArrastar((de, para) => m((x) => mover(x.itens, de, para)));
  const novo = () => {
    const id = novoIdB("av");
    m((x) => { x.itens.push({ id, titulo: "", texto: "" }); });
    setTimeout(() => document.querySelector<HTMLInputElement>(`[data-aviso="${id}"]`)?.focus(), 40);
  };
  return (
    <>
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 rounded-lg border border-p-borda bg-p-superficie/95 px-2 py-1 shadow-sm backdrop-blur">
        <BarraFormatacao />
        <span className="ml-auto pr-2 text-[12px] text-p-suave">{b.itens.length} {b.itens.length === 1 ? "aviso" : "avisos"} · arraste pela alça para reordenar</span>
      </div>
      {b.itens.map((a, i) => (
        <article key={a.id} {...arr.item(i)} className={cn("group flex overflow-hidden rounded-lg border border-p-borda bg-white text-[#111] shadow-sm transition", classeAlvo)}>
          <div className="flex flex-col items-center gap-1 border-r border-[#e6edf2] bg-[#f7fafc] px-1.5 py-3">
            <span className="grid size-6 place-items-center rounded-full bg-[#00436f] text-[11px] font-bold text-white">{i + 1}</span>
            <Alca {...arr.alca(i)} />
          </div>
          <div className="min-w-0 flex-1 px-5 py-4">
            <div className="flex items-start gap-2">
              <input data-aviso={a.id} value={a.titulo} placeholder="Título do aviso" onChange={(e) => m((x) => { x.itens[i]!.titulo = e.target.value; }, `t${a.id}`)} className={cn(campoPapel, "boletim-fonte flex-1 px-1 py-0.5 text-[21px] font-bold")} />
              <div className="flex gap-0.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [&_button]:text-[#5b7f99]">
                <button type="button" title="Duplicar" onClick={() => m((x) => { x.itens.splice(i + 1, 0, { ...structuredClone(a), id: novoIdB("av") }); })} className="grid size-8 place-items-center rounded-md hover:bg-[#eef4f8]"><Copy size={15} /></button>
                <button type="button" title="Excluir aviso" onClick={() => m((x) => { x.itens.splice(i, 1); })} className="grid size-8 place-items-center rounded-md hover:bg-red-50 hover:!text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
            <Editavel valor={a.texto} modo="paragrafos" como="div" dica="Texto do aviso…" className="escrita escrita-aviso mt-1" aoMudar={(v) => m((x) => { x.itens[i]!.texto = v; }, `x${a.id}`)} />
          </div>
        </article>
      ))}
      <Adicionar onClick={novo}><Plus size={16} /> Adicionar aviso</Adicionar>
    </>
  );
}

// ─── Escala ─────────────────────────────────────────────────────────────────

function nomesDoBoletim(bol: Boletim) {
  const s = new Set<string>();
  for (const p of bol.paginas) for (const bl of p.blocos) {
    if (bl.tipo !== "escala") continue;
    bl.linhas.forEach((l) => { s.add(l.celulas[1]); s.add(l.celulas[2]); });
    bl.porteiros.forEach((x) => s.add(x.nome));
    bl.semanaLinhas.forEach((l) => l.valores.forEach((v) => s.add(v)));
  }
  return [...s].map((x) => x.trim()).filter((x) => x && x.length > 2).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function Abas<T extends string>({ abas, ativa, aoMudar }: { abas: { id: T; rotulo: string; n?: number }[]; ativa: T; aoMudar: (t: T) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-p-borda bg-p-superficie p-1">
      {abas.map((a) => (
        <button key={a.id} type="button" onClick={() => aoMudar(a.id)} className={cn("flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold transition", ativa === a.id ? "bg-p-acento text-white shadow-sm" : "text-p-texto-2 hover:bg-p-hover")}>
          {a.rotulo}
          {a.n !== undefined && <span className={cn("rounded-full px-1.5 text-[11px]", ativa === a.id ? "bg-white/20" : "bg-p-hover text-p-suave")}>{a.n}</span>}
        </button>
      ))}
    </div>
  );
}

const grade = "overflow-hidden rounded-lg border border-p-borda bg-p-superficie [&_tr]:border-b [&_tr]:border-p-borda [&_tr:last-child]:border-0 [&_td]:border-r [&_td]:border-p-borda [&_td:last-child]:border-0 [&_td]:p-0";

function EdEscala({ b, m, boletim }: { b: BlocoEscala; m: MudarBloco<BlocoEscala>; boletim: Boletim }) {
  const [aba, setAba] = useState<"domingos" | "porteiros" | "semana">("domingos");
  const nomes = useMemo(() => nomesDoBoletim(boletim), [boletim]);
  return (
    <>
      <datalist id="nomes-escala">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
      <Abas abas={[{ id: "domingos", rotulo: "Domingos", n: b.linhas.length }, { id: "porteiros", rotulo: "Porteiros de oração", n: b.porteiros.length }, { id: "semana", rotulo: "Trabalhos da semana", n: b.semanaColunas.length }]} ativa={aba} aoMudar={setAba} />
      {aba === "domingos" && <EscalaDomingos b={b} m={m} />}
      {aba === "porteiros" && <EscalaPorteiros b={b} m={m} />}
      {aba === "semana" && <EscalaSemana b={b} m={m} />}
      <p className="text-[12px] text-p-suave">Dica: Enter desce para a linha de baixo (e cria uma nova no fim). Os nomes já usados aparecem como sugestão.</p>
    </>
  );
}

function EscalaDomingos({ b, m }: { b: BlocoEscala; m: MudarBloco<BlocoEscala> }) {
  const arr = useArrastar((de, para) => m((x) => mover(x.linhas, de, para)));
  const nova = () => m((x) => { x.linhas.push({ id: novoIdB("l"), celulas: ["", "", ""] }); });
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[240px] flex-1 gap-1.5"><Legenda>Título da tabela</Legenda><input className={inp} value={b.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "titulo")} /></label>
        <Botao primario icone={ChevronsRight} title="O que estava em “Próximo domingo” passa para “Hoje”, e a coluna do próximo fica livre." onClick={() => {
          m((x) => { x.linhas.forEach((l) => { l.celulas[1] = l.celulas[2]; l.celulas[2] = ""; }); });
          toast.success("Escala avançada uma semana. Agora preencha o próximo domingo.", { description: "Ctrl+Z desfaz." });
        }}>Avançar uma semana</Botao>
        <Botao icone={Eraser} title="Apagar a coluna do próximo domingo" onClick={() => m((x) => { x.linhas.forEach((l) => { l.celulas[2] = ""; }); })}>Limpar próximo</Botao>
      </div>
      <table className={cn(grade, "w-full table-fixed")} data-grade="dom">
        <colgroup><col className="w-8" /><col className="w-[34%]" /><col /><col /><col className="w-10" /></colgroup>
        <tbody>
          <tr className="bg-p-hover/70">
            <td />
            {b.cabecalho.map((c, i) => <td key={i}><input className="h-9 w-full bg-transparent px-2.5 text-[12px] font-bold uppercase tracking-wide text-p-texto-2 outline-none focus:bg-p-realce" value={c} onChange={(e) => m((x) => { x.cabecalho[i] = e.target.value; }, "cab")} /></td>)}
            <td />
          </tr>
          {b.linhas.map((l, li) => (
            <tr key={l.id} {...arr.item(li)} className={cn("group bg-p-superficie", classeAlvo)}>
              <td><Alca {...arr.alca(li)} /></td>
              {[0, 1, 2].map((ci) => (
                <td key={ci}>
                  <Celula grade="dom" r={li} c={ci} value={l.celulas[ci as 0 | 1 | 2]} list={ci > 0 ? "nomes-escala" : undefined} placeholder={ci === 0 ? "Função" : "Nome"} className={ci === 0 ? "font-semibold" : ""} aoNovaLinha={nova}
                    onChange={(e) => m((x) => { x.linhas[li]!.celulas[ci as 0 | 1 | 2] = e.target.value; }, `c${l.id}${ci}`)} />
                </td>
              ))}
              <td><button type="button" title="Remover linha" onClick={() => m((x) => { x.linhas.splice(li, 1); })} className="grid h-9 w-full place-items-center text-p-suave opacity-0 transition hover:text-red-600 group-hover:opacity-100"><Trash2 size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Adicionar onClick={nova}><Plus size={16} /> Adicionar função</Adicionar>
    </section>
  );
}

const hhmm = (min: number) => { const h = Math.floor(min / 60); const mm = min % 60; return `${h}h${mm ? String(mm).padStart(2, "0") : ""}`; };

function EscalaPorteiros({ b, m }: { b: BlocoEscala; m: MudarBloco<BlocoEscala> }) {
  const arr = useArrastar((de, para) => m((x) => mover(x.porteiros, de, para)));
  const [gerar, setGerar] = useState(false);
  const [inicio, setInicio] = useState("19:00");
  const [dur, setDur] = useState(15);
  const [qtd, setQtd] = useState(Math.max(b.porteiros.length, 6));
  const nova = () => m((x) => { x.porteiros.push({ id: novoIdB("po"), horario: "", nome: "" }); });
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[240px] flex-1 gap-1.5"><Legenda>Título</Legenda><input className={inp} value={b.porteirosTitulo} onChange={(e) => m((x) => { x.porteirosTitulo = e.target.value; }, "pt")} /></label>
        <Botao icone={Clock} onClick={() => setGerar((v) => !v)}>Gerar horários</Botao>
      </div>
      {gerar && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-p-acento/30 bg-p-realce/50 p-3">
          <label className="grid gap-1"><Legenda>Começa às</Legenda><input type="time" className={cn(inp, "w-32")} value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
          <label className="grid gap-1"><Legenda>Cada turno</Legenda><select className={cn(inp, "w-32")} value={dur} onChange={(e) => setDur(Number(e.target.value))}>{[10, 15, 20, 30].map((n) => <option key={n} value={n}>{n} min</option>)}</select></label>
          <label className="grid gap-1"><Legenda>Turnos</Legenda><input type="number" min={1} max={20} className={cn(inp, "w-24")} value={qtd} onChange={(e) => setQtd(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label>
          <Botao primario icone={Check} onClick={() => {
            const [h, mi] = inicio.split(":").map(Number);
            const base = (h || 0) * 60 + (mi || 0);
            m((x) => {
              const ant = x.porteiros;
              x.porteiros = Array.from({ length: qtd }, (_, i) => ({ id: ant[i]?.id ?? novoIdB("po"), nome: ant[i]?.nome ?? "", horario: `Das ${hhmm(base + i * dur)} às ${hhmm(base + (i + 1) * dur)}` }));
            });
            setGerar(false);
          }}>Aplicar</Botao>
          <span className="text-[12px] text-p-suave">Os nomes já preenchidos são mantidos.</span>
        </div>
      )}
      <table className={cn(grade, "w-full table-fixed")} data-grade="port">
        <colgroup><col className="w-8" /><col className="w-[42%]" /><col /><col className="w-10" /></colgroup>
        <tbody>
          <tr className="bg-p-hover/70 text-[12px] font-bold uppercase tracking-wide text-p-texto-2"><td /><td className="!px-2.5 py-2">Horário</td><td className="!px-2.5 py-2">Nome</td><td /></tr>
          {b.porteiros.map((p, i) => (
            <tr key={p.id} {...arr.item(i)} className={cn("group", classeAlvo)}>
              <td><Alca {...arr.alca(i)} /></td>
              <td><Celula grade="port" r={i} c={0} value={p.horario} placeholder="Das 19h às 19h15" onChange={(e) => m((x) => { x.porteiros[i]!.horario = e.target.value; }, `h${p.id}`)} aoNovaLinha={nova} /></td>
              <td><Celula grade="port" r={i} c={1} value={p.nome} list="nomes-escala" placeholder="Nome" onChange={(e) => m((x) => { x.porteiros[i]!.nome = e.target.value; }, `n${p.id}`)} aoNovaLinha={nova} /></td>
              <td><button type="button" title="Remover" onClick={() => m((x) => { x.porteiros.splice(i, 1); })} className="grid h-9 w-full place-items-center text-p-suave opacity-0 transition hover:text-red-600 group-hover:opacity-100"><Trash2 size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Adicionar onClick={nova}><Plus size={16} /> Adicionar horário</Adicionar>
      {b.porteiros.length === 0 && <p className="text-[12px] text-p-suave">Sem horários, esta parte não aparece no boletim.</p>}
    </section>
  );
}

function EscalaSemana({ b, m }: { b: BlocoEscala; m: MudarBloco<BlocoEscala> }) {
  const arr = useArrastar((de, para) => m((x) => mover(x.semanaLinhas, de, para)));
  const nova = () => m((x) => { x.semanaLinhas.push({ id: novoIdB("sl"), funcao: "", valores: x.semanaColunas.map(() => "") }); });
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[240px] flex-1 gap-1.5"><Legenda>Título</Legenda><input className={inp} value={b.semanaTitulo} onChange={(e) => m((x) => { x.semanaTitulo = e.target.value; }, "st")} /></label>
        <Botao icone={CalendarPlus} onClick={() => m((x) => { x.semanaColunas.push({ id: novoIdB("sc"), dia: "", atividade: "" }); x.semanaLinhas.forEach((l) => l.valores.push("")); })}>Adicionar dia</Botao>
      </div>
      {b.semanaColunas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-p-borda-forte p-8 text-center text-[13px] text-p-suave">Nenhum dia na semana. Use “Adicionar dia” para montar a tabela.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className={cn(grade, "w-full min-w-[560px] table-fixed")} data-grade="sem">
            <colgroup><col className="w-8" /><col className="w-[28%]" />{b.semanaColunas.map((c) => <col key={c.id} />)}<col className="w-10" /></colgroup>
            <tbody>
              <tr className="bg-p-hover/70">
                <td /><td className="px-2.5 text-[12px] font-bold uppercase tracking-wide text-p-texto-2">Função</td>
                {b.semanaColunas.map((c, ci) => (
                  <td key={c.id} className="group/c relative align-top">
                    <input className="h-8 w-full bg-transparent px-2.5 pr-8 text-[12.5px] font-bold text-p-texto outline-none focus:bg-p-realce" placeholder="Dia (ex.: Quarta-Feira (19h30))" value={c.dia} onChange={(e) => m((x) => { x.semanaColunas[ci]!.dia = e.target.value; }, `d${c.id}`)} />
                    <input className="h-8 w-full border-t border-p-borda bg-transparent px-2.5 text-[12.5px] text-p-texto-2 outline-none focus:bg-p-realce" placeholder="Atividade" value={c.atividade} onChange={(e) => m((x) => { x.semanaColunas[ci]!.atividade = e.target.value; }, `a${c.id}`)} />
                    <button type="button" title="Remover este dia" onClick={() => m((x) => { x.semanaColunas.splice(ci, 1); x.semanaLinhas.forEach((l) => l.valores.splice(ci, 1)); })} className="absolute right-1 top-1 grid size-6 place-items-center rounded text-p-suave opacity-0 hover:bg-red-500/10 hover:text-red-600 group-hover/c:opacity-100"><X size={13} /></button>
                  </td>
                ))}
                <td />
              </tr>
              {b.semanaLinhas.map((l, li) => (
                <tr key={l.id} {...arr.item(li)} className={cn("group", classeAlvo)}>
                  <td><Alca {...arr.alca(li)} /></td>
                  <td><Celula grade="sem" r={li} c={0} value={l.funcao} placeholder="Função" className="font-semibold" onChange={(e) => m((x) => { x.semanaLinhas[li]!.funcao = e.target.value; }, `f${l.id}`)} aoNovaLinha={nova} /></td>
                  {b.semanaColunas.map((c, ci) => (
                    <td key={c.id}><Celula grade="sem" r={li} c={ci + 1} value={l.valores[ci] ?? ""} list="nomes-escala" onChange={(e) => m((x) => { x.semanaLinhas[li]!.valores[ci] = e.target.value; }, `v${l.id}${ci}`)} aoNovaLinha={nova} /></td>
                  ))}
                  <td><button type="button" title="Remover" onClick={() => m((x) => { x.semanaLinhas.splice(li, 1); })} className="grid h-9 w-full place-items-center text-p-suave opacity-0 transition hover:text-red-600 group-hover:opacity-100"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {b.semanaColunas.length > 0 && <Adicionar onClick={nova}><Plus size={16} /> Adicionar função</Adicionar>}
    </section>
  );
}

// ─── Aniversariantes ────────────────────────────────────────────────────────

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const diaNum = (d: string) => parseInt(d, 10) || 99;

function importarAniversarios(texto: string) {
  const porDia = new Map<number, string[]>();
  for (const bruto of texto.split(/\n/)) {
    const l = bruto.trim();
    if (!l) continue;
    let dia: number | null = null, nome = "";
    let r = /^(\d{1,2})\s*[º°ª]?\s*(?:\/\s*\d{1,2})?\s*[-–—:.)|]?\s*(.+)$/.exec(l);
    if (r) { dia = Number(r[1]); nome = r[2]!; }
    else if ((r = /^(.+?)\s*[-–—(|,]\s*(?:dia\s*)?(\d{1,2})(?:\s*\/\s*\d{1,2})?\)?\s*$/i.exec(l))) { dia = Number(r[2]); nome = r[1]!; }
    if (!dia || dia > 31 || !nome.trim()) continue;
    porDia.set(dia, [...(porDia.get(dia) ?? []), nome.trim()]);
  }
  return [...porDia.entries()].sort((a, b) => a[0] - b[0]).map(([d, ns]) => ({ id: novoIdB("an"), dia: d === 1 ? "1º" : String(d), nomes: ns.join("\n") }));
}

function EdAniversariantes({ b, m }: { b: BlocoAniversariantes; m: MudarBloco<BlocoAniversariantes> }) {
  const arr = useArrastar((de, para) => m((x) => mover(x.linhas, de, para)));
  const [colar, setColar] = useState(false);
  const [lista, setLista] = useState("");
  const previa = useMemo(() => importarAniversarios(lista), [lista]);
  const total = b.linhas.reduce((n, l) => n + l.nomes.split("\n").filter((x) => x.trim()).length, 0);
  return (
    <>
      <section className="grid gap-2">
        <Legenda>Mês</Legenda>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {MESES.map((mes) => {
            const ativo = b.titulo.toUpperCase().includes(mes.toUpperCase());
            return <button key={mes} type="button" onClick={() => m((x) => { x.titulo = `ANIVERSARIANTES DE ${mes.toUpperCase()}`; })} className={cn("rounded-md border py-1.5 text-[12px] font-semibold", ativo ? "border-p-acento bg-p-acento text-white" : "border-p-borda bg-p-superficie text-p-texto-2 hover:border-p-borda-forte")}>{mes.slice(0, 3)}</button>;
          })}
        </div>
        <input className={inp} value={b.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "titulo")} />
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Legenda>{b.linhas.length} dias · {total} pessoas</Legenda>
          <div className="ml-auto flex gap-2">
            <Botao icone={ArrowDownUp} onClick={() => m((x) => { x.linhas.sort((a, c) => diaNum(a.dia) - diaNum(c.dia)); })}>Ordenar por dia</Botao>
            <Botao icone={ClipboardPaste} primario={colar} onClick={() => setColar((v) => !v)}>Colar lista</Botao>
          </div>
        </div>
        {colar && (
          <div className="grid gap-3 rounded-lg border border-p-acento/30 bg-p-realce/40 p-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Legenda>Cole a lista (um nome por linha)</Legenda>
              <AreaAuto value={lista} onChange={(e) => setLista(e.target.value)} placeholder={"3 - Maria Isabel\n3 - João Pedro\nAna Paula (12)\n15/11 Carlos"} className="min-h-40" />
              <p className="text-[12px] text-p-suave">Aceita “3 - Nome”, “3º Nome”, “Nome (3)” ou “3/11 Nome”. Quem faz aniversário no mesmo dia fica junto.</p>
            </div>
            <div className="grid content-start gap-2">
              <Legenda>Vai ficar assim</Legenda>
              <div className="max-h-56 overflow-y-auto rounded-md border border-p-borda bg-p-superficie text-[13px]">
                {previa.length === 0 ? <p className="p-3 text-p-suave">Nada reconhecido ainda.</p> : previa.map((l) => (
                  <div key={l.id} className="flex gap-3 border-b border-p-borda px-3 py-1.5 last:border-0"><strong className="w-8 shrink-0 text-p-acento">{l.dia}</strong><span className="whitespace-pre-line">{l.nomes}</span></div>
                ))}
              </div>
              <div className="flex gap-2">
                <Botao primario disabled={!previa.length} icone={Check} onClick={() => { m((x) => { x.linhas = previa; }); setColar(false); setLista(""); toast.success(`${previa.length} dias importados.`); }}>Substituir a lista</Botao>
                <Botao disabled={!previa.length} icone={ListPlus} onClick={() => { m((x) => { x.linhas.push(...previa); x.linhas.sort((a, c) => diaNum(a.dia) - diaNum(c.dia)); }); setColar(false); setLista(""); }}>Juntar</Botao>
              </div>
            </div>
          </div>
        )}
        <div className="grid gap-1.5">
          {b.linhas.map((l, i) => (
            <div key={l.id} {...arr.item(i)} className={cn("group flex items-start gap-2 rounded-md", classeAlvo)}>
              <Alca {...arr.alca(i)} />
              <input className={cn(inp, "w-16 text-center font-bold")} value={l.dia} placeholder="Dia" onChange={(e) => m((x) => { x.linhas[i]!.dia = e.target.value; }, `d${l.id}`)} />
              <AreaAuto value={l.nomes} placeholder="Um nome por linha" onChange={(e) => m((x) => { x.linhas[i]!.nomes = e.target.value; }, `n${l.id}`)} />
              <button type="button" title="Remover" onClick={() => m((x) => { x.linhas.splice(i, 1); })} className="grid size-9 shrink-0 place-items-center rounded-md text-p-suave opacity-0 transition hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <Adicionar onClick={() => m((x) => { x.linhas.push({ id: novoIdB("an"), dia: "", nomes: "" }); })}><Plus size={16} /> Adicionar dia</Adicionar>
      </section>

      <section className="grid gap-2 rounded-lg border border-p-borda bg-p-superficie p-4">
        <Legenda>Versículo abaixo da tabela</Legenda>
        <AreaAuto value={b.versiculo} placeholder="“Ensina-nos a contar os nossos dias…”" onChange={(e) => m((x) => { x.versiculo = e.target.value; }, "vers")} className="italic" />
        <input className={inp} value={b.referencia} placeholder="Referência (ex.: Salmos 90.12)" onChange={(e) => m((x) => { x.referencia = e.target.value; }, "ref")} />
      </section>
    </>
  );
}

// ─── Agenda ─────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

function EdAgenda({ b, m, dataBoletim }: { b: BlocoAgenda; m: MudarBloco<BlocoAgenda>; dataBoletim: string }) {
  const [ano, mesB, diaB] = dataBoletim.split("-").map(Number) as [number, number, number];
  const mesDoGrupo = (t: string) => MESES.findIndex((mes) => semAcento(t).includes(semAcento(mes)));
  const anoDoMes = (mi: number) => (mi < mesB - 1 - 5 ? ano + 1 : ano);

  const removerPassados = () => {
    const hoje = new Date(ano, mesB - 1, diaB);
    let n = 0;
    m((x) => {
      for (const g of x.grupos) {
        const mi = mesDoGrupo(g.titulo);
        if (mi < 0) continue;
        g.itens = g.itens.filter((it) => {
          const d = parseInt(it.data, 10);
          if (!d) return true;
          const passou = new Date(anoDoMes(mi), mi, d) < hoje;
          if (passou) n++;
          return !passou;
        });
      }
      x.grupos = x.grupos.filter((g) => g.itens.length);
    });
    toast.success(n ? `${n} ${n === 1 ? "data removida" : "datas removidas"} (anteriores a ${diaB}/${mesB}).` : "Nenhuma data anterior a este domingo.");
  };

  const novoMes = () => m((x) => {
    const ult = x.grupos[x.grupos.length - 1];
    const mi = ult ? mesDoGrupo(ult.titulo) : mesB - 2;
    const prox = MESES[(mi + 1 + 12) % 12]!.toUpperCase();
    x.grupos.push({ id: novoIdB("g"), titulo: prox, itens: [{ id: novoIdB("i"), data: "", hora: "", texto: "" }] });
  });

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[240px] flex-1 gap-1.5"><Legenda>Título</Legenda><input className={inp} value={b.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "titulo")} /></label>
        <Botao icone={Eraser} onClick={removerPassados} title="Tira as datas anteriores ao domingo deste boletim">Tirar datas passadas</Botao>
        <Botao primario icone={CalendarPlus} onClick={novoMes}>Adicionar mês</Botao>
      </div>
      {b.grupos.map((g, gi) => (
        <GrupoAgenda key={g.id} b={b} gi={gi} m={m} anoMes={(() => { const mi = mesDoGrupo(g.titulo); return mi >= 0 ? { ano: anoDoMes(mi), mes: mi } : null; })()} />
      ))}
    </>
  );
}

function GrupoAgenda({ b, gi, m, anoMes }: { b: BlocoAgenda; gi: number; m: MudarBloco<BlocoAgenda>; anoMes: { ano: number; mes: number } | null }) {
  const g = b.grupos[gi]!;
  const arr = useArrastar((de, para) => m((x) => mover(x.grupos[gi]!.itens, de, para)));
  const nova = () => m((x) => { x.grupos[gi]!.itens.push({ id: novoIdB("i"), data: "", hora: "", texto: "" }); });
  const grd = `ag${g.id}`;
  return (
    <section className="overflow-hidden rounded-lg border border-p-borda bg-p-superficie">
      <header className="flex items-center gap-2 border-b border-p-borda bg-p-hover/60 px-3 py-2">
        <input className="h-8 min-w-0 flex-1 rounded bg-transparent px-2 text-[14px] font-bold uppercase tracking-[0.08em] text-p-texto outline-none focus:bg-p-superficie" value={g.titulo} placeholder="MÊS" onChange={(e) => m((x) => { x.grupos[gi]!.titulo = e.target.value; }, `g${g.id}`)} />
        <span className="text-[12px] text-p-suave">{g.itens.length} itens</span>
        <Botao icone={ArrowDownUp} title="Ordenar por dia e hora" onClick={() => m((x) => { x.grupos[gi]!.itens.sort((a, c) => diaNum(a.data) - diaNum(c.data) || (parseInt(a.hora, 10) || 0) - (parseInt(c.hora, 10) || 0)); })} />
        <Botao icone={Trash2} perigo title="Remover o mês inteiro" onClick={() => m((x) => { x.grupos.splice(gi, 1); })} />
      </header>
      <table className="w-full table-fixed text-[13.5px] [&_td]:border-b [&_td]:border-p-borda [&_tr:last-child_td]:border-0" data-grade={grd}>
        <colgroup><col className="w-8" /><col className="w-[132px]" /><col className="w-[76px]" /><col /><col className="w-10" /></colgroup>
        <tbody>
          {g.itens.map((it, k) => (
            <tr key={it.id} {...arr.item(k)} className={cn("group", classeAlvo)}>
              <td><Alca {...arr.alca(k)} /></td>
              <td className="relative">
                <Celula grade={grd} r={k} c={0} value={it.data} placeholder="22 (dom)" className="pr-8" onChange={(e) => m((x) => { x.grupos[gi]!.itens[k]!.data = e.target.value; }, `d${it.id}`)} aoNovaLinha={nova} />
                {anoMes && (
                  <label className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded text-p-suave hover:bg-p-hover hover:text-p-acento" title="Escolher no calendário">
                    <CalendarPlus size={14} />
                    <input type="date" className="absolute inset-0 cursor-pointer opacity-0" min={`${anoMes.ano}-${String(anoMes.mes + 1).padStart(2, "0")}-01`}
                      onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                      onChange={(e) => {
                        const [a, mo, d] = e.target.value.split("-").map(Number);
                        if (!a || !mo || !d) return;
                        const dow = DIAS_SEMANA[new Date(a, mo - 1, d).getDay()];
                        m((x) => { x.grupos[gi]!.itens[k]!.data = `${d} (${dow})`; });
                      }} />
                  </label>
                )}
              </td>
              <td><Celula grade={grd} r={k} c={1} value={it.hora} placeholder="19h" onChange={(e) => m((x) => { x.grupos[gi]!.itens[k]!.hora = e.target.value; }, `h${it.id}`)} aoNovaLinha={nova} /></td>
              <td><Celula grade={grd} r={k} c={2} value={it.texto} placeholder="Evento" onChange={(e) => m((x) => { x.grupos[gi]!.itens[k]!.texto = e.target.value; }, `t${it.id}`)} aoNovaLinha={nova} /></td>
              <td><button type="button" title="Remover" onClick={() => m((x) => { x.grupos[gi]!.itens.splice(k, 1); })} className="grid h-9 w-full place-items-center text-p-suave opacity-0 transition hover:text-red-600 group-hover:opacity-100"><Trash2 size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={nova} className="flex w-full items-center justify-center gap-1.5 border-t border-p-borda py-2 text-[12.5px] font-semibold text-p-acento hover:bg-p-realce"><Plus size={14} /> Adicionar data</button>
    </section>
  );
}

// ─── Trabalhos, parcerias, ofícios, expediente ──────────────────────────────

function EdTrabalhos({ b, m }: { b: BlocoTrabalhos; m: MudarBloco<BlocoTrabalhos> }) {
  const arr = useArrastar((de, para) => m((x) => mover(x.itens, de, para)));
  return (
    <>
      <label className="grid gap-1.5"><Legenda>Título</Legenda><input className={inp} value={b.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "titulo")} /></label>
      <div className="grid gap-3 md:grid-cols-2">
        {b.itens.map((t, i) => (
          <article key={t.id} {...arr.item(i)} className={cn("group flex gap-1 rounded-lg border border-p-borda bg-p-superficie p-3", classeAlvo)}>
            <Alca {...arr.alca(i)} />
            <div className="grid min-w-0 flex-1 gap-2">
              <input className={cn(inp, "font-semibold")} value={t.titulo} placeholder="Campo missionário…" onChange={(e) => m((x) => { x.itens[i]!.titulo = e.target.value; }, `t${t.id}`)} />
              <AreaAuto value={t.texto} placeholder={"Responsável\nEndereço\nCEP – Telefone"} onChange={(e) => m((x) => { x.itens[i]!.texto = e.target.value; }, `x${t.id}`)} />
            </div>
            <button type="button" title="Remover" onClick={() => m((x) => { x.itens.splice(i, 1); })} className="grid size-8 shrink-0 place-items-center rounded-md text-p-suave opacity-0 hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100"><Trash2 size={14} /></button>
          </article>
        ))}
      </div>
      <Adicionar onClick={() => m((x) => { x.itens.push({ id: novoIdB("tr"), titulo: "", texto: "" }); })}><Plus size={16} /> Adicionar campo</Adicionar>
    </>
  );
}

function EdParcerias({ b, m }: { b: BlocoParcerias; m: MudarBloco<BlocoParcerias> }) {
  const arr = useArrastar((de, para) => m((x) => mover(x.itens, de, para)));
  const nova = () => m((x) => { x.itens.push({ id: novoIdB("pa"), nome: "", texto: "" }); });
  return (
    <>
      <label className="grid gap-1.5"><Legenda>Título</Legenda><input className={inp} value={b.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "titulo")} /></label>
      <table className={cn(grade, "w-full table-fixed")} data-grade="par">
        <colgroup><col className="w-8" /><col className="w-[38%]" /><col /><col className="w-10" /></colgroup>
        <tbody>
          <tr className="bg-p-hover/70 text-[12px] font-bold uppercase tracking-wide text-p-texto-2"><td /><td className="!px-2.5 py-2">Missionário / projeto</td><td className="!px-2.5 py-2">Descrição</td><td /></tr>
          {b.itens.map((p, i) => (
            <tr key={p.id} {...arr.item(i)} className={cn("group", classeAlvo)}>
              <td><Alca {...arr.alca(i)} /></td>
              <td><Celula grade="par" r={i} c={0} value={p.nome} className="font-semibold" placeholder="Nome" onChange={(e) => m((x) => { x.itens[i]!.nome = e.target.value; }, `n${p.id}`)} aoNovaLinha={nova} /></td>
              <td><Celula grade="par" r={i} c={1} value={p.texto} placeholder="Onde atua, o que faz" onChange={(e) => m((x) => { x.itens[i]!.texto = e.target.value; }, `t${p.id}`)} aoNovaLinha={nova} /></td>
              <td><button type="button" title="Remover" onClick={() => m((x) => { x.itens.splice(i, 1); })} className="grid h-9 w-full place-items-center text-p-suave opacity-0 transition hover:text-red-600 group-hover:opacity-100"><Trash2 size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Adicionar onClick={nova}><Plus size={16} /> Adicionar parceria</Adicionar>
      <p className="text-[12px] text-p-suave">No boletim, as parcerias ficam em duas colunas, na ordem desta lista (da esquerda para a direita).</p>
    </>
  );
}

function EdOficios({ b, m }: { b: BlocoOficios; m: MudarBloco<BlocoOficios> }) {
  const arr = useArrastar((de, para) => m((x) => mover(x.colunas, de, para)));
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[240px] flex-1 gap-1.5"><Legenda>Título</Legenda><input className={inp} value={b.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "titulo")} /></label>
        <BarraFormatacao className="rounded-md border border-p-borda bg-p-superficie p-0.5" />
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, b.colunas.length))}, minmax(0, 1fr))` }}>
        {b.colunas.map((c, i) => (
          <article key={c.id} {...arr.item(i)} className={cn("group grid content-start gap-1 rounded-lg border border-p-borda bg-white p-2 text-[#111]", classeAlvo)}>
            <div className="flex items-center"><Alca {...arr.alca(i)} /><span className="flex-1 text-[11px] font-bold uppercase tracking-wider text-[#5b7f99]">Coluna {i + 1}</span>
              <button type="button" title="Remover coluna" onClick={() => m((x) => { x.colunas.splice(i, 1); })} className="grid size-7 place-items-center rounded text-[#5b7f99] opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"><Trash2 size={13} /></button>
            </div>
            <Editavel valor={c.texto} modo="linhas" como="div" dica={"Domingo\nCulto, 9h"} className="escrita-celula boletim-fonte" aoMudar={(v) => m((x) => { x.colunas[i]!.texto = v; }, `c${c.id}`)} />
          </article>
        ))}
      </div>
      <Adicionar onClick={() => m((x) => { x.colunas.push({ id: novoIdB("c"), texto: "" }); })}><Plus size={16} /> Adicionar coluna</Adicionar>
      <p className="text-[12px] text-p-suave">Deixe o dia em negrito (selecione e Ctrl+B). Enter quebra a linha.</p>
    </>
  );
}

function EdExpediente({ b, m }: { b: BlocoExpediente; m: MudarBloco<BlocoExpediente> }) {
  const campo = (rotulo: string, chave: keyof BlocoExpediente, area = false) => (
    <label className="grid gap-1.5">
      <Legenda>{rotulo}</Legenda>
      {area
        ? <AreaAuto value={String(b[chave] ?? "")} onChange={(e) => m((x) => { (x as Record<string, unknown>)[chave] = e.target.value; }, chave)} />
        : <input className={inp} value={String(b[chave] ?? "")} onChange={(e) => m((x) => { (x as Record<string, unknown>)[chave] = e.target.value; }, chave)} />}
    </label>
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid content-start gap-4">
        {campo("Nome da igreja", "nome", true)}
        {campo("Endereço e contatos", "texto", true)}
      </div>
      <div className="grid content-start gap-4">
        {campo("Título — pastores", "pastoresTitulo")}
        {campo("Pastores (um por linha)", "pastores", true)}
        {campo("Título — diretoria", "diretoriaTitulo")}
        {campo("Diretoria (um por linha)", "diretoria", true)}
      </div>
    </div>
  );
}

// ─── Tabela livre ───────────────────────────────────────────────────────────

function EdTabela({ b, m }: { b: BlocoTabela; m: MudarBloco<BlocoTabela> }) {
  const arr = useArrastar((de, para) => m((x) => mover(x.linhas, de, para)));
  const nova = () => m((x) => { x.linhas.push({ id: novoIdB("l"), celulas: x.cabecalho.map(() => "") }); });
  /** Colar do Excel/Planilhas: preenche a partir da célula, criando linhas e colunas. */
  const colar = (r: number, c: number, texto: string) => {
    const linhas = texto.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((l) => l.split("\t"));
    if (linhas.length < 2 && (linhas[0]?.length ?? 0) < 2) return false;
    m((x) => {
      const largura = Math.max(x.cabecalho.length, c + Math.max(...linhas.map((l) => l.length)));
      while (x.cabecalho.length < largura) { x.cabecalho.push(""); x.linhas.forEach((l) => l.celulas.push("")); }
      linhas.forEach((l, i) => {
        const ri = r + i;
        while (x.linhas.length <= ri) x.linhas.push({ id: novoIdB("l"), celulas: x.cabecalho.map(() => "") });
        l.forEach((v, j) => { x.linhas[ri]!.celulas[c + j] = v.trim(); });
      });
    });
    toast.success(`${linhas.length} linhas coladas.`);
    return true;
  };
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[240px] flex-1 gap-1.5"><Legenda>Título</Legenda><input className={inp} value={b.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "titulo")} /></label>
        <Botao icone={Plus} onClick={() => m((x) => { x.cabecalho.push(""); x.linhas.forEach((l) => l.celulas.push("")); })}>Coluna</Botao>
      </div>
      <div className="overflow-x-auto">
        <table className={cn(grade, "w-full min-w-[480px] table-fixed")} data-grade="tab">
          <colgroup><col className="w-8" />{b.cabecalho.map((_, i) => <col key={i} />)}<col className="w-10" /></colgroup>
          <tbody>
            <tr className="bg-p-hover/70">
              <td />
              {b.cabecalho.map((c, i) => (
                <td key={i} className="group/c relative">
                  <input className="h-9 w-full bg-transparent px-2.5 pr-7 text-[12.5px] font-bold text-p-texto outline-none focus:bg-p-realce" placeholder={`Coluna ${i + 1}`} value={c} onChange={(e) => m((x) => { x.cabecalho[i] = e.target.value; }, `h${i}`)} />
                  {b.cabecalho.length > 1 && <button type="button" title="Remover coluna" onClick={() => m((x) => { x.cabecalho.splice(i, 1); x.linhas.forEach((l) => l.celulas.splice(i, 1)); })} className="absolute right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-p-suave opacity-0 hover:bg-red-500/10 hover:text-red-600 group-hover/c:opacity-100"><X size={13} /></button>}
                </td>
              ))}
              <td />
            </tr>
            {b.linhas.map((l, li) => (
              <tr key={l.id} {...arr.item(li)} className={cn("group", classeAlvo)}>
                <td><Alca {...arr.alca(li)} /></td>
                {b.cabecalho.map((_, ci) => (
                  <td key={ci}><Celula grade="tab" r={li} c={ci} value={l.celulas[ci] ?? ""} className={ci === 0 ? "font-semibold" : ""} aoNovaLinha={nova}
                    onPaste={(e) => { if (colar(li, ci, e.clipboardData.getData("text/plain"))) e.preventDefault(); }}
                    onChange={(e) => m((x) => { x.linhas[li]!.celulas[ci] = e.target.value; }, `c${l.id}${ci}`)} /></td>
                ))}
                <td><button type="button" title="Remover" onClick={() => m((x) => { x.linhas.splice(li, 1); })} className="grid h-9 w-full place-items-center text-p-suave opacity-0 transition hover:text-red-600 group-hover:opacity-100"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Adicionar onClick={nova}><Plus size={16} /> Adicionar linha</Adicionar>
      <p className="text-[12px] text-p-suave">Dica: copie células do Excel ou do Google Planilhas e cole numa célula daqui — a tabela cresce sozinha.</p>
    </>
  );
}

// ─── Catálogo de seções ─────────────────────────────────────────────────────

let exemplos: Partial<Record<TipoBloco, Bloco>> | null = null;
function exemplo(t: TipoBloco): Bloco {
  if (!exemplos) {
    exemplos = {};
    for (const p of boletimModelo().paginas) for (const bl of p.blocos) exemplos[bl.tipo] ??= bl;
  }
  if (t === "texto") return { ...blocoNovo("texto"), titulo: "Palavra da diretoria", texto: "Queridos irmãos, a assembleia ordinária acontecerá no dia 14, após o culto da manhã. Sua presença é muito importante.\n\nOs relatórios estarão disponíveis na secretaria a partir de quarta-feira." } as Bloco;
  if (t === "tabela") return { ...blocoNovo("tabela"), titulo: "Escala da Santa Ceia", cabecalho: ["Domingo", "Diáconos", "Diaconisas"], linhas: [["6/12", "Dc. João e Dc. Pedro", "Dca. Vera e Dca. Selma"], ["3/1", "Dc. Marcos e Dc. Lucas", "Dca. Rosa e Dca. Rafaela"]].map((c) => ({ id: novoIdB("l"), celulas: c })) } as Bloco;
  const e = exemplos[t];
  if (e && e.tipo === "artigo") return { ...e, colunas: 1 };
  if (e && e.tipo === "avisos") return { ...e, colunas: 1 };
  return e ?? blocoNovo(t);
}

const ORDEM: TipoBloco[] = ["artigo", "avisos", "texto", "escala", "agenda", "aniversariantes", "oficios", "trabalhos", "parcerias", "tabela", "expediente"];

export function JanelaNovaSecao({ pagina, aoEscolher, aoFechar }: { pagina: number; aoEscolher: (t: TipoBloco) => void; aoFechar: () => void }) {
  return (
    <Moldura aoFechar={aoFechar} larga={false}>
      <header className="flex shrink-0 items-center gap-3 border-b border-p-borda px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold text-p-texto">Adicionar seção</h2>
          <p className="text-[12.5px] text-p-suave">Na página {pagina}. Todas já vêm no padrão do boletim — é só preencher.</p>
        </div>
        <button type="button" onClick={aoFechar} className="grid size-9 place-items-center rounded-md text-p-suave hover:bg-p-hover"><X size={18} /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-p-sutil p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ORDEM.map((t) => {
            const I = ICONE_TIPO[t];
            return (
              <button key={t} type="button" onClick={() => aoEscolher(t)} className="group overflow-hidden rounded-lg border border-p-borda bg-p-superficie text-left transition hover:-translate-y-0.5 hover:border-p-acento hover:shadow-[0_12px_30px_-14px_rgba(0,40,80,0.35)]">
                <div className="relative h-[150px] overflow-hidden border-b border-p-borda bg-white">
                  <div className="pointer-events-none absolute left-1/2 top-3 w-[210mm] origin-top -translate-x-1/2 scale-[0.4]"><BlocoAvulso b={exemplo(t)} /></div>
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white" />
                </div>
                <div className="flex gap-3 p-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-p-realce text-p-acento transition group-hover:bg-p-acento group-hover:text-white"><I size={17} /></span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold text-p-texto">{TIPO_ROTULO[t]}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-p-suave">{DESCRICAO_TIPO[t]}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Moldura>
  );
}
