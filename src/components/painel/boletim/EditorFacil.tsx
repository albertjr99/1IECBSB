/**
 * Editor simples do boletim — feito para quem não tem intimidade com
 * computador. Um passo por vez, em linguagem do dia a dia, com o boletim
 * pronto aparecendo ao lado. Ninguém precisa pensar em páginas, colunas ou
 * tamanho de letra: o encaixe nas páginas é automático.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bold, BookOpen, Cake, CalendarDays, Check, CheckCircle2, Church, ClipboardList,
  CloudOff, Copy, Eye, FileDown, Globe, HandHeart, History, Italic, Loader2, Megaphone, PenLine, Plus, Redo2, RemoveFormatting, Send, Settings2, Trash2, Undo2, X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { FolhasEscaladas } from "@/components/boletim/Folhas";
import { Editavel, formatar } from "@/components/boletim/Editavel";
import { dataPorExtenso, novoIdB, type Bloco, type Boletim, type ItemAviso } from "@/lib/boletim";
import {
  adicionarPastoral, colocarNaAgenda, conferir, ORDINAIS, retirarPastoral, dataDoItem, mais7, MESES_MAIUSC, ordenarAgenda, paginaDo, partes, type Partes,
} from "@/lib/boletim-facil";
import { listarVersoesBoletim, obterBoletimPainel, publicarBoletim, restaurarVersaoBoletim, salvarBoletim } from "@/lib/api-boletim";
import { IconeWhatsapp } from "@/components/site/Icones";
import { cn } from "@/lib/utils";
import "./editor.css";
import { Camada } from "../Camada";
import { quando } from "@/lib/datas";

type IdPasso = "inicio" | "pastoral" | "avisos" | "oracao" | "escala" | "agenda" | "semana" | "aniversariantes" | "publicar";
type Passo = { id: IdPasso; titulo: string; Icone: LucideIcon; ajuda: string };

const PASSOS: Passo[] = [
  { id: "inicio", titulo: "Data e versículo", Icone: CalendarDays, ajuda: "O domingo deste boletim e o versículo da semana." },
  { id: "pastoral", titulo: "Pastorais", Icone: PenLine, ajuda: "Uma, duas, três… quantas houver nesta semana. Cada uma ocupa a sua página." },
  { id: "avisos", titulo: "Avisos", Icone: Megaphone, ajuda: "Os recados para a igreja nesta semana." },
  { id: "oracao", titulo: "Motivos de oração", Icone: HandHeart, ajuda: "Pedidos de oração, numa caixa no fim dos avisos." },
  { id: "escala", titulo: "Escala e porteiros", Icone: ClipboardList, ajuda: "Quem serve hoje e no próximo domingo." },
  { id: "agenda", titulo: "Agenda", Icone: CalendarDays, ajuda: "Os próximos compromissos da igreja." },
  { id: "semana", titulo: "Trabalhos da semana", Icone: Church, ajuda: "Quarta e sexta: quem prega, dirige e cuida do som." },
  { id: "aniversariantes", titulo: "Aniversariantes", Icone: Cake, ajuda: "A lista do mês." },
  { id: "publicar", titulo: "Conferir e publicar", Icone: Send, ajuda: "Última olhada, publicar no site e baixar o PDF." },
];

type Salvamento = "salvo" | "pendente" | "salvando" | "erro";
type Mudar = (fn: (b: Boletim) => void, chave?: string) => void;

const campo = "ef-campo";
const btnSec = "ef-btn ef-btn-sec";
const btnPri = "ef-btn ef-btn-pri";
const dois = (n: number) => String(n).padStart(2, "0");

const dataCurta = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

/** Nomes já usados no boletim — sugeridos ao digitar nas escalas. */
function nomesUsados(pt: Partes) {
  const s = new Set<string>();
  pt.escala?.linhas.forEach((l) => { s.add(l.celulas[1]); s.add(l.celulas[2]); });
  pt.escala?.porteiros.forEach((p) => s.add(p.nome));
  pt.semana?.linhas.forEach((l) => l.celulas.slice(1).forEach((c) => s.add(c)));
  return [...s].map((x) => x.trim()).filter((x) => x && x !== "-" && x !== "—").sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// ═══════════════════════════════════════════════════════════════════════════

export function EditorFacil({ id, lembretes: lembretesIniciais = [], aoVoltar, aoModoAvancado }: {
  id: string;
  lembretes?: string[];
  aoVoltar: () => void;
  aoModoAvancado: () => void;
}) {
  const [b, setB] = useState<Boletim | null>(null);
  const bRef = useRef<Boletim | null>(null);
  const baseEm = useRef<string>("");
  const hist = useRef({ passado: [] as Boletim[], futuro: [] as Boletim[], chave: "", quando: 0 });
  const [, setVersaoHist] = useState(0);
  const [passo, setPasso] = useState<IdPasso>("inicio");
  /** qual pastoral está aberta no passo "Pastorais" */
  const [artigoSel, setArtigoSel] = useState(0);
  const [vistos, setVistos] = useState<Set<IdPasso>>(() => new Set(["inicio"]));
  const [salvamento, setSalvamento] = useState<Salvamento>("salvo");
  const [conflito, setConflito] = useState("");
  const [ocupacao, setOcupacao] = useState<Record<string, number>>({});
  const [lembretes, setLembretes] = useState(lembretesIniciais);
  const [verPrevia, setVerPrevia] = useState(false);
  const pendente = useRef(false);
  const previa = useRef<HTMLDivElement>(null);

  const definir = (n: Boletim) => { bRef.current = n; setB(n); };

  useEffect(() => {
    obterBoletimPainel({ data: { id } })
      .then((r) => { baseEm.current = r.boletim.atualizadoEm; definir(r.boletim); })
      .catch((e) => { toast.error(e.message); aoVoltar(); });
  }, [id]);

  // ── mudanças (com "desfazer") ──
  const mudar = useCallback<Mudar>((fn, chave = "") => {
    const ant = bRef.current;
    if (!ant) return;
    const h = hist.current;
    const agora = Date.now();
    if (!chave || chave !== h.chave || agora - h.quando > 1500) {
      h.passado.push(ant);
      if (h.passado.length > 200) h.passado.shift();
    }
    h.chave = chave;
    h.quando = agora;
    h.futuro = [];
    const d = structuredClone(ant);
    fn(d);
    pendente.current = true;
    definir(d);
    setVersaoHist((v) => v + 1);
  }, []);

  const desfazer = useCallback(() => {
    const h = hist.current;
    const ant = h.passado.pop();
    if (!ant || !bRef.current) return;
    h.futuro.push(bRef.current);
    h.chave = "";
    pendente.current = true;
    definir(ant);
    setVersaoHist((v) => v + 1);
  }, []);
  const refazer = useCallback(() => {
    const h = hist.current;
    const prox = h.futuro.pop();
    if (!prox || !bRef.current) return;
    h.passado.push(bRef.current);
    h.chave = "";
    pendente.current = true;
    definir(prox);
    setVersaoHist((v) => v + 1);
  }, []);

  // ── salvamento automático ──
  const emCurso = useRef<Promise<void> | null>(null);
  const salvar = useCallback(async (forcar = false): Promise<void> => {
    // um salvamento por vez: o seguinte espera o anterior (e usa a versão que ele devolveu)
    while (emCurso.current) await emCurso.current;
    const atual = bRef.current;
    if (!atual) return;
    const tarefa = salvarUmaVez(atual, forcar);
    emCurso.current = tarefa;
    try { await tarefa; } finally { emCurso.current = null; }
  }, []);
  const salvarUmaVez = async (atual: Boletim, forcar: boolean) => {
    pendente.current = false;
    setSalvamento("salvando");
    try {
      const r = await salvarBoletim({ data: { boletim: atual, ...(forcar ? {} : { baseEm: baseEm.current }) } });
      if (r.conflito) { setConflito(r.conflito); setSalvamento("erro"); return; }
      baseEm.current = r.atualizadoEm;
      setSalvamento(pendente.current ? "pendente" : "salvo");
    } catch (e) {
      pendente.current = true;
      setSalvamento("erro");
      if (!navigator.onLine) return;
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };

  useEffect(() => {
    if (!b || !pendente.current || conflito) return;
    setSalvamento("pendente");
    const t = setTimeout(() => salvar(), 1000);
    return () => clearTimeout(t);
  }, [b, salvar, conflito]);

  // sem internet: tenta de novo a cada 8 segundos
  useEffect(() => {
    if (salvamento !== "erro" || conflito) return;
    const t = setInterval(() => { if (pendente.current) salvar(); }, 8000);
    return () => clearInterval(t);
  }, [salvamento, salvar, conflito]);

  // não deixa fechar a aba com alteração por salvar
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (pendente.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !(document.activeElement as HTMLElement | null)?.closest?.("input, textarea")) {
        e.preventDefault();
        if (e.shiftKey) refazer(); else desfazer();
      }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); salvar(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [desfazer, refazer, salvar]);

  // ── encaixe automático nas páginas ──
  const aoOcupacao = useCallback((pagina: string, pct: number) => {
    setOcupacao((o) => (o[pagina] === pct ? o : { ...o, [pagina]: pct }));
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const atual = bRef.current;
      if (!atual) return;
      const novo = structuredClone(atual);
      let mudou = false;
      for (const p of novo.paginas) {
        const pct = ocupacao[p.id];
        if (!pct) continue;
        const ajustaveis = p.blocos.filter((x) => x.tipo !== "expediente");
        if (pct > 100 && ajustaveis.some((x) => (x.ajuste || 100) > 85)) {
          const passo = pct > 112 ? 3 : 1;
          for (const x of ajustaveis) x.ajuste = Math.max(85, (x.ajuste || 100) - passo);
          mudou = true;
        } else if (pct < 88 && ajustaveis.some((x) => (x.ajuste || 100) < 100)) {
          for (const x of ajustaveis) x.ajuste = Math.min(100, (x.ajuste || 100) + 1);
          mudou = true;
        }
      }
      if (mudou) { pendente.current = true; definir(novo); }
    }, 220);
    return () => clearTimeout(t);
  }, [ocupacao]);

  const pt = useMemo<Partes>(() => (b ? partes(b) : { artigos: [] }), [b]);
  const blocoDoPasso = (p: IdPasso, d: Partes): string | undefined => ({
    inicio: d.avisos?.id, pastoral: (d.artigos?.[artigoSel] ?? d.artigos?.[0])?.id, avisos: d.avisos?.id, oracao: d.avisos?.id,
    escala: d.escala?.id, agenda: d.agenda?.id, semana: d.semana?.id, aniversariantes: d.aniversariantes?.id, publicar: undefined,
  } as Record<IdPasso, string | undefined>)[p];

  // a prévia acompanha o passo
  useEffect(() => {
    if (!b) return;
    const caixa = previa.current;
    if (!caixa || caixa.scrollHeight <= caixa.clientHeight + 4) return;
    const pi = passo === "publicar" ? 0 : Math.max(0, paginaDo(b, blocoDoPasso(passo, pt)));
    const pg = caixa.querySelector<HTMLElement>(`[data-pagina="${pi + 1}"]`);
    if (!pg) return;
    caixa.scrollTo({ top: caixa.scrollTop + pg.getBoundingClientRect().top - caixa.getBoundingClientRect().top - 12, behavior: "smooth" });
  }, [passo, b === null]);

  if (!b) return <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-p-acento" size={28} /></div>;

  const mudarBloco = (blocoId: string | undefined, fn: (x: Bloco) => void, chave?: string) => {
    if (!blocoId) return;
    mudar((d) => { for (const p of d.paginas) { const x = p.blocos.find((y) => y.id === blocoId); if (x) { fn(x); return; } } }, chave);
  };

  const i = PASSOS.findIndex((p) => p.id === passo);
  const atualPasso = PASSOS[i]!;
  const ir = (p: IdPasso) => { setVistos((v) => new Set(v).add(passo).add(p)); setPasso(p); setVerPrevia(false); document.getElementById("editor-facil-form")?.scrollTo({ top: 0 }); window.scrollTo({ top: 0 }); };
  const cheia = (blocoId?: string) => {
    const pi = paginaDo(b, blocoId);
    const pg = b.paginas[pi];
    return pg ? (ocupacao[pg.id] ?? 0) : 0;
  };
  const verificacao = conferir(b, ocupacao);
  // passo pronto: conferido sem pendências; os que não têm conferência contam quando já foram visitados
  const feito = (p: IdPasso) => {
    if (p === "publicar") return false;
    const itens = verificacao.filter((v) => v.passo === p);
    return itens.length ? itens.every((v) => v.ok) : vistos.has(p) && p !== passo;
  };

  const props: PropsPasso = { b, pt, mudar, mudarBloco, cheia };

  const fecharEditor = async () => {
    if (pendente.current) await salvar();
    aoVoltar();
  };

  const prontos = PASSOS.filter((p) => feito(p.id)).length;
  const inclinar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / Math.min(r.height, 900) - 0.5;
    e.currentTarget.style.setProperty("--ef-ry", `${(x * 5).toFixed(2)}deg`);
    e.currentTarget.style.setProperty("--ef-rx", `${(-y * 3).toFixed(2)}deg`);
  };
  const endireitar = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--ef-ry", "0deg");
    e.currentTarget.style.setProperty("--ef-rx", "0deg");
  };

  return (
    <div className="ef flex h-full min-h-0 flex-col bg-p-fundo">
      {/* ── barra de cima (vidro) ── */}
      <header className="ef-vidro relative z-20 shrink-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-5">
          <button onClick={fecharEditor} className="ef-btn ef-btn-fantasma"><ArrowLeft size={16} /> Boletins</button>
          <span className="hidden h-8 w-px bg-p-borda sm:block" />
          <div className="min-w-0 flex-1">
            <p className="ef-sobre !text-[10.5px]">Boletim dominical</p>
            <p className="mt-0.5 truncate text-[17px] font-bold leading-tight tracking-[-0.01em] text-p-texto">{dataPorExtenso(b.data)}</p>
          </div>
          <div className="hidden items-center gap-4 text-[12.5px] text-p-suave md:flex">
            <span className="inline-flex items-center gap-2 font-semibold text-p-texto-2">
              <span className={cn("ef-ponto", !b.publicado && "ef-ponto-rascunho")} /> {b.publicado ? "Publicado no site" : "Rascunho"}
            </span>
            <SeloSalvo estado={salvamento} />
          </div>
          <div className="flex items-center">
            <button onClick={desfazer} disabled={!hist.current.passado.length} className="ef-btn ef-btn-fantasma !px-2.5" title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><Undo2 size={17} /></button>
            <button onClick={refazer} disabled={!hist.current.futuro.length} className="ef-btn ef-btn-fantasma !px-2.5" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer"><Redo2 size={17} /></button>
          </div>
          <button onClick={() => setVerPrevia(true)} className={cn(btnSec, "!h-10 xl:hidden")}><Eye size={16} /> Prévia</button>
          <button onClick={() => ir("publicar")} className={cn(btnPri, "!h-10")}><Send size={15} /> {b.publicado ? "Publicado" : "Publicar"}</button>
        </div>
        <div className="ef-progresso" title={`${prontos} de ${PASSOS.length - 1} passos prontos`}><span style={{ width: `${(prontos / (PASSOS.length - 1)) * 100}%` }} /></div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* ── trilho dos passos ── */}
        <nav className="ef-trilho hidden w-[256px] shrink-0 flex-col overflow-y-auto border-r border-p-borda bg-p-sutil px-3 py-5 lg:flex" aria-label="Passos do boletim">
          <div className="mb-4 px-3">
            <p className="ef-h2 !text-[11px] !text-p-suave">Roteiro</p>
            <p className="mt-1 text-[13px] text-p-suave"><span className="ef-num font-bold text-p-texto">{prontos}</span> de {PASSOS.length - 1} prontos</p>
          </div>
          <ol className="grid gap-0.5">
            {PASSOS.map((p, n) => {
              const ok = feito(p.id);
              const ativo = p.id === passo;
              return (
                <li key={p.id}>
                  <button onClick={() => ir(p.id)} className="ef-passo" aria-current={ativo ? "step" : undefined} data-estado={ok ? "feito" : "aberto"}>
                    <span className="ef-passo-n">{ok && !ativo ? <Check size={14} strokeWidth={3} /> : dois(n + 1)}</span>
                    <span className="ef-passo-t">{p.titulo}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-auto border-t border-p-borda px-3 pt-4">
            <button onClick={async () => { if (pendente.current) await salvar(); aoModoAvancado(); }} className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-p-suave transition hover:text-p-acento">
              <Settings2 size={14} /> Modo avançado de diagramação
            </button>
          </div>
        </nav>

        {/* ── folha do passo ── */}
        <main id="editor-facil-form" className="ef-mesa min-w-0 flex-1 overflow-y-auto">
          {/* passos no celular */}
          <div className="ef-vidro sticky top-0 z-10 px-3 py-2 lg:hidden">
            <select value={passo} onChange={(e) => ir(e.target.value as IdPasso)} className={cn(campo, "!h-11 font-semibold")} aria-label="Passo">
              {PASSOS.map((p, n) => <option key={p.id} value={p.id}>{dois(n + 1)} · {p.titulo}{feito(p.id) ? "  ✓" : ""}</option>)}
            </select>
          </div>

          <div className="@container mx-auto max-w-[800px] px-3 pb-6 pt-5 sm:px-8 sm:pt-9">
            <article className="ef-folha">
              <header className="border-b border-p-borda px-5 pb-5 pt-6 sm:px-9 sm:pt-8">
                <p className="ef-sobre">Passo {dois(i + 1)} de {dois(PASSOS.length)}</p>
                <h1 className="ef-titulo mt-3">{atualPasso.titulo}</h1>
                <p className="ef-sub mt-1.5">{atualPasso.ajuda}</p>
              </header>

              <div key={passo} className="ef-entra grid gap-7 px-5 py-7 sm:px-9 sm:py-8" data-campos>
                {passo === "inicio" && lembretes.length > 0 && (
                  <div className="ef-peca ef-peca-destaque px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="ef-h2">Preparado a partir do boletim anterior</p>
                      <button onClick={() => setLembretes([])} className="-m-1 p-1 text-p-suave hover:text-p-texto" title="Fechar" aria-label="Fechar"><X size={17} /></button>
                    </div>
                    <ul className="mt-3 grid gap-2 text-[14.5px] leading-relaxed text-p-texto-2">
                      {lembretes.map((l) => <li key={l} className="flex gap-2.5"><span className="mt-[9px] h-px w-3 shrink-0 bg-p-acento" /> {l}</li>)}
                    </ul>
                  </div>
                )}
                {passo === "inicio" && <PassoInicio {...props} />}
                {passo === "pastoral" && <PassoPastorais {...props} sel={Math.min(artigoSel, Math.max(0, pt.artigos.length - 1))} escolher={setArtigoSel} />}
                {passo === "avisos" && <PassoAvisos {...props} desfazer={desfazer} />}
                {passo === "oracao" && <PassoOracao {...props} />}
                {passo === "escala" && <PassoEscala {...props} />}
                {passo === "agenda" && <PassoAgenda {...props} />}
                {passo === "semana" && <PassoSemana {...props} />}
                {passo === "aniversariantes" && <PassoAniversariantes {...props} />}
                {passo === "publicar" && (
                  <PassoPublicar
                    {...props}
                    verificacao={verificacao}
                    ir={ir}
                    salvarAntes={async () => { if (pendente.current) await salvar(); }}
                    aoPublicado={(publicado, em, atualizadoEm) => {
                      baseEm.current = atualizadoEm;
                      definir({ ...bRef.current!, publicado, ...(em ? { publicadoEm: em } : {}) });
                    }}
                    aoRestaurado={(n) => { baseEm.current = n.atualizadoEm; hist.current = { passado: [], futuro: [], chave: "", quando: 0 }; definir(n); }}
                  />
                )}
              </div>
            </article>
          </div>

          {/* navegação entre os passos (vidro, presa no pé) */}
          <div className="ef-vidro sticky bottom-0 z-10 border-t border-p-borda">
            <div className="mx-auto flex max-w-[800px] items-center justify-between gap-3 px-3 py-3 sm:px-8">
              {i > 0 ? (
                <button onClick={() => ir(PASSOS[i - 1]!.id)} className="ef-btn ef-btn-fantasma"><ArrowLeft size={16} /> <span className="hidden sm:inline">{PASSOS[i - 1]!.titulo}</span><span className="sm:hidden">Voltar</span></button>
              ) : <span />}
              <span className="ef-num hidden whitespace-nowrap text-[12px] font-semibold text-p-suave md:inline">{dois(i + 1)} / {dois(PASSOS.length)}</span>
              {i < PASSOS.length - 1 ? (
                <button onClick={() => ir(PASSOS[i + 1]!.id)} className={btnPri}><span className="hidden sm:inline">Próximo:</span> {PASSOS[i + 1]!.titulo} <ArrowRight size={16} /></button>
              ) : <span />}
            </div>
          </div>
        </main>

        {/* ── palco da prévia ── */}
        <aside
          className={cn(
            "ef-palco flex-col",
            verPrevia ? "fixed inset-0 z-50 flex" : "absolute -left-[9999px] top-0 flex w-[420px] xl:relative xl:left-0 xl:flex xl:w-[min(36vw,560px)] xl:shrink-0",
          )}
          aria-label="Prévia do boletim"
        >
          <div className="ef-palco-barra flex shrink-0 items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="ef-palco-selo">Prévia ao vivo</p>
              <p className="mt-0.5 text-[13px] font-semibold text-white/90">{b.paginas.length} páginas A4 · clique numa parte para editá-la</p>
            </div>
            {verPrevia && <button onClick={() => setVerPrevia(false)} className="ef-btn ef-btn-vidro !h-9"><X size={15} /> Fechar</button>}
          </div>
          <div ref={previa} className="ef-palco-cena min-h-0 flex-1 overflow-y-auto px-6 py-6" onMouseMove={inclinar} onMouseLeave={endireitar}>
            <div className={cn("ef-palco-folhas", verPrevia && "mx-auto max-w-[620px]")}>
              <FolhasEscaladas
                boletim={b}
                espaco={22}
                aoOcupacao={aoOcupacao}
                selecionado={blocoDoPasso(passo, pt) ?? null}
                aoSelecionar={(blocoId) => {
                  const ia = pt.artigos.findIndex((x) => x.id === blocoId);
                  if (ia >= 0) { setArtigoSel(ia); ir("pastoral"); return; }
                  const alvo = (["avisos", "escala", "agenda", "semana", "aniversariantes"] as IdPasso[]).find((p) => blocoDoPasso(p, pt) === blocoId);
                  if (alvo) ir(alvo);
                }}
              />
            </div>
          </div>
        </aside>
      </div>

      {conflito && (<Camada>
        <Aviso
          titulo="Este boletim mudou em outro lugar"
          texto={`${conflito} Para não apagar o trabalho de ninguém, escolha o que fazer:`}
          acoes={[
            { rotulo: "Carregar a versão mais nova", primario: true, acao: () => { setConflito(""); pendente.current = false; obterBoletimPainel({ data: { id } }).then((r) => { baseEm.current = r.boletim.atualizadoEm; hist.current = { passado: [], futuro: [], chave: "", quando: 0 }; definir(r.boletim); setSalvamento("salvo"); }); } },
            { rotulo: "Manter o que está na minha tela", acao: () => { setConflito(""); salvar(true); } },
          ]}
        />
      </Camada>)}
    </div>
  );
}

// ─── Peças ──────────────────────────────────────────────────────────────────

function SeloSalvo({ estado }: { estado: Salvamento }) {
  if (estado === "salvando" || estado === "pendente") return <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Salvando</span>;
  if (estado === "erro") return <span className="inline-flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-400"><CloudOff size={14} /> Sem conexão · tentando de novo</span>;
  return <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-p-acento" /> Salvo</span>;
}

function Aviso({ titulo, texto, acoes }: { titulo: string; texto: string; acoes: { rotulo: string; acao: () => void; primario?: boolean }[] }) {
  return (
    <div className="ef-janela-fundo fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="ef-janela w-full max-w-[440px] p-7" role="alertdialog" aria-modal="true">
        <p className="ef-sobre">Atenção</p>
        <h2 className="mt-3 text-[21px] font-bold leading-tight tracking-[-0.015em] text-p-texto">{titulo}</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-p-texto-2">{texto}</p>
        <div className="mt-6 grid gap-2">
          {acoes.map((a) => <button key={a.rotulo} onClick={a.acao} className={a.primario ? btnPri : btnSec}>{a.rotulo}</button>)}
        </div>
      </div>
    </div>
  );
}

function Rotulo({ children, dica, htmlFor }: { children: ReactNode; dica?: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-2.5">
      <label htmlFor={htmlFor} className="ef-rotulo">{children}</label>
      {dica && <p className="ef-dica">{dica}</p>}
    </div>
  );
}

/** Divisória de seção dentro de um passo. */
function Secao({ titulo, dica, children }: { titulo: string; dica?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 border-b border-p-borda pb-2.5">
        <h2 className="ef-h2">{titulo}</h2>
        {dica && <p className="ef-dica !mt-1">{dica}</p>}
      </div>
      {children}
    </section>
  );
}

/** Caixa para textos longos: negrito e itálico; aceita texto colado do Word ou do WhatsApp. */
function CaixaTexto({ valor, aoMudar, dica, minimo = 160 }: { valor: string; aoMudar: (v: string) => void; dica: string; minimo?: number }) {
  return (
    <div className="ef-texto">
      <div className="ef-texto-barra">
        <button type="button" className="ef-ferramenta" onMouseDown={(e) => { e.preventDefault(); formatar("bold"); }} title="Negrito: selecione as palavras e clique (Ctrl+B)"><Bold size={15} strokeWidth={2.6} /> Negrito</button>
        <button type="button" className="ef-ferramenta" onMouseDown={(e) => { e.preventDefault(); formatar("italic"); }} title="Itálico: selecione as palavras e clique (Ctrl+I)"><Italic size={15} /> Itálico</button>
        <span className="mx-1 h-5 w-px bg-p-borda" />
        <button type="button" className="ef-ferramenta" onMouseDown={(e) => { e.preventDefault(); formatar("removeFormat"); }} title="Tira negrito e itálico do trecho selecionado"><RemoveFormatting size={15} /> Limpar</button>
        <span className="ml-auto hidden pr-2 text-[12px] text-p-suave @lg:inline">Aceita texto colado do Word e do WhatsApp</span>
      </div>
      <Editavel
        valor={valor}
        aoMudar={aoMudar}
        modo="paragrafos"
        como="div"
        dica={dica}
        className="editor-facil-texto block px-5 py-4 text-[16px] leading-[1.75] text-p-texto outline-none [&_p+p]:mt-3.5"
        style={{ minHeight: minimo }}
      />
    </div>
  );
}

function AlertaCheia({ pct, linhas }: { pct: number; linhas: number }) {
  if (pct <= 100) return null;
  const sobra = Math.max(1, Math.ceil(((pct - 100) / 100) * linhas));
  return (
    <div className="flex gap-3 border-l-[3px] border-red-600 bg-red-50 px-4 py-3.5 text-[14.5px] leading-relaxed text-red-900 dark:bg-red-500/10 dark:text-red-200" role="alert">
      <AlertTriangle className="mt-0.5 shrink-0" size={18} />
      <p><strong>O texto passou do tamanho da página.</strong> As letras já estão no menor tamanho legível; corte cerca de {sobra} {sobra === 1 ? "linha" : "linhas"} para caber.</p>
    </div>
  );
}

function Botaozinho({ children, onClick, perigo, titulo, disabled }: { children: ReactNode; onClick: () => void; perigo?: boolean; titulo?: string; disabled?: boolean }) {
  return (
    <button type="button" title={titulo} aria-label={titulo} disabled={disabled} onClick={onClick} className={cn("ef-btn", perigo ? "ef-btn-perigo" : "ef-btn-fantasma !h-9 !px-2.5")}>
      {children}
    </button>
  );
}

function Adicionar({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="ef-adicionar"><Plus size={17} strokeWidth={2.4} /> {children}</button>;
}

function Faltando({ nome }: { nome: string }) {
  return <p className="border border-dashed border-p-borda-forte px-5 py-6 text-[14.5px] text-p-suave">Este boletim não tem a seção “{nome}”. Se precisar dela, a comunicação pode incluí-la pelo modo avançado.</p>;
}

// ─── Passos ─────────────────────────────────────────────────────────────────

type PropsPasso = {
  b: Boletim;
  pt: Partes;
  mudar: Mudar;
  mudarBloco: (id: string | undefined, fn: (x: Bloco) => void, chave?: string) => void;
  cheia: (blocoId?: string) => number;
};

function PassoInicio({ b, mudar }: PropsPasso) {
  const domingo = new Date(`${b.data}T12:00:00`).getDay() === 0;
  return (
    <>
      <div>
        <Rotulo htmlFor="data-boletim" dica="O domingo em que o boletim será entregue.">Data</Rotulo>
        <div className="flex flex-wrap items-center gap-3">
          <input id="data-boletim" type="date" value={b.data} onChange={(e) => e.target.value && mudar((d) => { d.data = e.target.value; })} className={cn(campo, "max-w-[240px]")} />
          <span className={cn("text-[14px]", domingo ? "text-p-suave" : "font-semibold text-amber-700 dark:text-amber-400")}>
            {domingo ? dataPorExtenso(b.data).replace(/^d/, "D") : "Atenção: esta data não é um domingo"}
          </span>
        </div>
      </div>
      <Secao titulo="Martelando a Palavra" dica="O versículo da semana, em destaque no alto da página dos avisos.">
        <div className="grid gap-5">
          <div>
            <Rotulo htmlFor="versiculo">Versículo</Rotulo>
            <textarea id="versiculo" rows={3} value={b.versiculo ?? ""} placeholder="Tomai toda a armadura de Deus, para que possais resistir no dia mau…" onChange={(e) => mudar((d) => { d.versiculo = e.target.value.replace(/^["“]|["”]$/g, ""); }, "versiculo")} className={cn(campo, "escritura !text-[18px] !leading-relaxed")} />
          </div>
          <div>
            <Rotulo htmlFor="referencia">Referência</Rotulo>
            <input id="referencia" value={b.versiculoRef ?? ""} placeholder="Efésios 6.13" onChange={(e) => mudar((d) => { d.versiculoRef = e.target.value; }, "versiculoRef")} className={cn(campo, "max-w-[300px]")} />
          </div>
        </div>
      </Secao>
    </>
  );
}

function PassoPastorais(props: PropsPasso & { sel: number; escolher: (i: number) => void }) {
  const { pt, mudar, sel, escolher } = props;
  const lista = pt.artigos;
  const nome = (i: number) => (lista.length > 1 ? `${ORDINAIS[i] ?? `${i + 1}ª`} pastoral` : "Pastoral");
  const atual = lista[sel];
  const adicionar = () => {
    mudar((d) => { adicionarPastoral(d); });
    escolher(lista.length);
  };
  const retirar = () => {
    if (!atual) return;
    const temTexto = atual.texto.trim() || atual.titulo.trim();
    if (temTexto && !confirm(`Retirar a ${nome(sel).toLowerCase()} (“${atual.titulo.replace(/\*/g, "") || "sem título"}”) deste boletim? A página dela sai junto.`)) return;
    mudar((d) => { retirarPastoral(d, atual.id); });
    escolher(Math.max(0, sel - 1));
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Pastorais deste boletim">
        {lista.map((a, i) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={i === sel}
            onClick={() => escolher(i)}
            className={cn("inline-flex h-11 max-w-[260px] items-center gap-2.5 border px-4 text-left text-[13.5px] font-semibold transition", i === sel ? "border-p-acento bg-p-acento text-white" : "border-p-borda-forte bg-p-superficie text-p-texto-2 hover:border-p-acento")}
          >
            <span className="ef-num shrink-0 text-[12px] opacity-80">{dois(i + 1)}</span>
            <span className="truncate">{a.titulo.replace(/\*/g, "") || nome(i)}</span>
          </button>
        ))}
        <button onClick={adicionar} disabled={lista.length >= 6} className="inline-flex h-11 items-center gap-2 border border-dashed border-p-borda-forte px-4 text-[13px] font-semibold text-p-acento transition hover:border-p-acento hover:bg-p-sutil disabled:opacity-40">
          <Plus size={16} /> Adicionar pastoral
        </button>
      </div>
      {atual ? (
        <>
          <PassoArtigo key={atual.id} {...props} bloco={atual} nome={nome(sel).toLowerCase()} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-p-borda pt-5">
            <p className="text-[13px] text-p-suave">{lista.length === 1 ? "Este boletim tem uma pastoral." : `Este boletim tem ${lista.length} pastorais, cada uma na sua página.`}</p>
            <Botaozinho perigo onClick={retirar}><Trash2 size={15} /> Retirar esta pastoral</Botaozinho>
          </div>
        </>
      ) : (
        <p className="border border-dashed border-p-borda-forte px-5 py-6 text-[14.5px] text-p-suave">Este boletim está sem pastoral. Use “Adicionar pastoral” para incluir uma.</p>
      )}
    </>
  );
}

function PassoArtigo({ bloco, nome, mudarBloco, cheia }: PropsPasso & { bloco: Partes["pastoral"]; nome: string }) {
  if (!bloco) return <Faltando nome={nome} />;
  const m = (fn: (x: Extract<Bloco, { tipo: "artigo" }>) => void, chave: string) => mudarBloco(bloco.id, (x) => { if (x.tipo === "artigo") fn(x); }, chave);
  const palavras = bloco.texto.trim() ? bloco.texto.trim().split(/\s+/).length : 0;
  return (
    <>
      <div>
        <Rotulo htmlFor={`tit-${bloco.id}`}>Título</Rotulo>
        <input id={`tit-${bloco.id}`} value={bloco.titulo.replace(/\*/g, "")} placeholder="A questão do coração" onChange={(e) => m((x) => { x.titulo = e.target.value; }, `t${bloco.id}`)} className={cn(campo, "!h-[54px] !text-[21px] font-bold tracking-[-0.015em] text-p-acento")} />
      </div>
      <div>
        <div className="mb-2.5 flex items-end justify-between gap-3">
          <div>
            <p className="ef-rotulo">Texto</p>
            <p className="ef-dica">Uma linha em branco separa os parágrafos.</p>
          </div>
          <span className="ef-num shrink-0 text-[12.5px] font-semibold text-p-suave">{palavras} {palavras === 1 ? "palavra" : "palavras"}</span>
        </div>
        <CaixaTexto valor={bloco.texto} aoMudar={(v) => m((x) => { x.texto = v; }, `x${bloco.id}`)} dica="Escreva ou cole o texto aqui…" minimo={340} />
      </div>
      <AlertaCheia pct={cheia(bloco.id)} linhas={96} />
      <div>
        <Rotulo htmlFor={`aut-${bloco.id}`} dica="Assinatura no fim do texto.">Autor</Rotulo>
        <input id={`aut-${bloco.id}`} value={bloco.autor} placeholder="Pr. Hilário José" onChange={(e) => m((x) => { x.autor = e.target.value; }, `a${bloco.id}`)} className={cn(campo, "max-w-[340px]")} />
      </div>
    </>
  );
}

function PassoAvisos({ pt, mudarBloco, cheia, desfazer }: PropsPasso & { desfazer: () => void }) {
  const av = pt.avisos;
  if (!av) return <Faltando nome="Avisos" />;
  const lista = av.itens.filter((x) => x.estilo !== "caixa");
  const m = (fn: (itens: ItemAviso[]) => void, chave?: string) => mudarBloco(av.id, (x) => { if (x.tipo === "avisos") fn(x.itens); }, chave);
  // destaques primeiro, depois os demais; a caixa de oração sempre por último
  const reordenar = (itens: ItemAviso[]) => {
    const peso = (e?: string) => (e === "destaque" ? 0 : e === "caixa" ? 2 : 1);
    const ord = [...itens].sort((x, y) => peso(x.estilo) - peso(y.estilo));
    itens.splice(0, itens.length, ...ord);
  };
  const mover = (id: string, dir: -1 | 1) => m((itens) => {
    const a = itens.findIndex((x) => x.id === id);
    const alvo = a + dir;
    if (alvo < 0 || alvo >= itens.length || itens[alvo]!.estilo === "caixa") return;
    [itens[a], itens[alvo]] = [itens[alvo]!, itens[a]!];
    reordenar(itens);
  });
  const novo = () => {
    const id = novoIdB("av");
    m((itens) => { itens.push({ id, titulo: "", texto: "" }); reordenar(itens); });
    setTimeout(() => document.getElementById(`aviso-${id}`)?.focus(), 60);
  };
  const destaques = lista.filter((x) => x.estilo === "destaque").length;
  return (
    <>
      <p className="ef-dica !mt-0 !text-[14.5px]">
        Os avisos em <strong className="text-p-texto">Destaque</strong> abrem a página, com fundo claro e filete azul — o ideal são dois. Os demais seguem em duas colunas.
      </p>
      {lista.map((a, n) => {
        const imp = a.estilo === "destaque";
        return (
          <article key={a.id} className={cn("ef-peca px-4 pb-5 pt-3.5 sm:px-5", imp && "ef-peca-destaque")}>
            <div className="mb-3.5 flex flex-wrap items-center gap-3">
              <span className="ef-num text-[13px] font-bold text-p-acento">{dois(n + 1)}</span>
              <div className="ef-chaves" role="group" aria-label="Aparência do aviso">
                {([["normal", "Normal"], ["destaque", "Destaque"]] as const).map(([v, r]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={(imp ? "destaque" : "normal") === v}
                    onClick={() => m((itens) => { const x = itens.find((y) => y.id === a.id)!; if (v === "destaque") x.estilo = "destaque"; else delete x.estilo; reordenar(itens); })}
                  >{r}</button>
                ))}
              </div>
              <span className="ml-auto flex items-center gap-0.5">
                <Botaozinho titulo="Subir" disabled={n === 0} onClick={() => mover(a.id, -1)}><ArrowUp size={16} /></Botaozinho>
                <Botaozinho titulo="Descer" disabled={n === lista.length - 1} onClick={() => mover(a.id, 1)}><ArrowDown size={16} /></Botaozinho>
                <Botaozinho perigo titulo="Apagar aviso" onClick={() => { m((itens) => { itens.splice(itens.findIndex((y) => y.id === a.id), 1); }); toast(`Aviso “${a.titulo || "sem título"}” apagado`, { action: { label: "Desfazer", onClick: desfazer } }); }}>
                  <Trash2 size={15} /> <span className="hidden @md:inline">Apagar</span>
                </Botaozinho>
              </span>
            </div>
            <input id={`aviso-${a.id}`} value={a.titulo} placeholder="Título do aviso" onChange={(e) => m((itens) => { itens.find((y) => y.id === a.id)!.titulo = e.target.value; }, `t${a.id}`)} className={cn(campo, "mb-3 !text-[17px] font-bold text-p-acento")} />
            <CaixaTexto valor={a.texto} aoMudar={(v) => m((itens) => { itens.find((y) => y.id === a.id)!.texto = v; }, `x${a.id}`)} dica="O que a igreja precisa saber…" minimo={96} />
          </article>
        );
      })}
      <Adicionar onClick={novo}>Novo aviso</Adicionar>
      {destaques > 2 && <p className="text-[14px] text-amber-700 dark:text-amber-400">Há {destaques} avisos em destaque. Com muitos destaques, nenhum se sobressai — considere deixar dois.</p>}
      <AlertaCheia pct={cheia(av.id)} linhas={60} />
    </>
  );
}

function PassoOracao({ pt, mudarBloco, cheia }: PropsPasso) {
  const av = pt.avisos;
  if (!av) return <Faltando nome="Avisos" />;
  const caixa = av.itens.find((x) => x.estilo === "caixa");
  const m = (fn: (x: ItemAviso) => void, chave?: string) => mudarBloco(av.id, (x) => { if (x.tipo === "avisos") { const c = x.itens.find((y) => y.estilo === "caixa"); if (c) fn(c); } }, chave);
  if (!caixa) {
    return (
      <Adicionar onClick={() => mudarBloco(av.id, (x) => { if (x.tipo === "avisos") x.itens.push({ id: novoIdB("av"), estilo: "caixa", titulo: "Motivos de oração", texto: "" }); })}>
        Incluir a caixa de motivos de oração
      </Adicionar>
    );
  }
  return (
    <>
      <div>
        <Rotulo htmlFor="tit-oracao">Título da caixa</Rotulo>
        <input id="tit-oracao" value={caixa.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "toracao")} className={cn(campo, "max-w-[420px] font-bold text-p-acento")} />
      </div>
      <div>
        <Rotulo dica="Separe os pedidos com ponto e vírgula, ou use um parágrafo para cada grupo.">Pedidos</Rotulo>
        <CaixaTexto valor={caixa.texto} aoMudar={(v) => m((x) => { x.texto = v; }, "xoracao")} dica="Pela saúde de…" minimo={200} />
      </div>
      <AlertaCheia pct={cheia(av.id)} linhas={60} />
      <div>
        <Botaozinho perigo onClick={() => mudarBloco(av.id, (x) => { if (x.tipo === "avisos") x.itens = x.itens.filter((y) => y.estilo !== "caixa"); })}><Trash2 size={15} /> Retirar a caixa deste boletim</Botaozinho>
      </div>
    </>
  );
}

function PassoEscala({ b, pt, mudarBloco, cheia }: PropsPasso) {
  const es = pt.escala;
  const nomes = nomesUsados(pt);
  if (!es) return <Faltando nome="Escala" />;
  const m = (fn: (x: Extract<Bloco, { tipo: "escala" }>) => void, chave?: string) => mudarBloco(es.id, (x) => { if (x.tipo === "escala") fn(x); }, chave);
  const prox = dataCurta(mais7(b.data));
  return (
    <>
      <datalist id="nomes-boletim">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
      <Secao titulo="Escala de serviços e dons" dica="Ao digitar, aparecem os nomes já usados.">
        <div className="ef-peca ef-peca-filete !shadow-none">
          <div className="hidden grid-cols-[1.05fr_1fr_1fr] gap-3 border-b border-p-borda bg-p-sutil px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-p-suave @2xl:grid">
            <span>Função</span><span>Hoje · {dataCurta(b.data)}</span><span>Próximo domingo · {prox}</span>
          </div>
          {es.linhas.map((l, n) => (
            <div key={l.id} className="grid grid-cols-2 gap-2 border-b border-p-borda px-4 py-3 last:border-0 @2xl:grid-cols-[1.05fr_1fr_1fr] @2xl:items-center @2xl:gap-3">
              <span className="col-span-2 text-[14px] font-bold text-p-acento @2xl:col-span-1">{l.celulas[0]}</span>
              {[1, 2].map((c) => (
                <label key={c} className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-p-suave @2xl:hidden">{c === 1 ? `Hoje · ${dataCurta(b.data)}` : `Próximo · ${prox}`}</span>
                  <input list="nomes-boletim" value={l.celulas[c]} placeholder="Nome" onChange={(e) => m((x) => { x.linhas[n]!.celulas[c as 1 | 2] = e.target.value; }, `e${l.id}${c}`)} className={cn(campo, "!h-10 !text-[14.5px]")} />
                </label>
              ))}
            </div>
          ))}
        </div>
      </Secao>
      <Secao titulo="Porteiras e porteiros de oração" dica="Horário e nome de quem ora à porta durante o culto.">
        <div className="grid gap-2">
          {es.porteiros.map((p, n) => (
            <div key={p.id} className="flex items-center gap-2">
              <input value={p.horario.replace(/^Das\s+/i, "")} placeholder="19h às 19h15" onChange={(e) => m((x) => { x.porteiros[n]!.horario = e.target.value ? `Das ${e.target.value.replace(/^Das\s+/i, "")}` : ""; }, `h${p.id}`)} className={cn(campo, "ef-num !h-10 w-[150px] shrink-0 !text-[14.5px] @md:w-[180px]")} aria-label="Horário" />
              <input list="nomes-boletim" value={p.nome} placeholder="Nome" onChange={(e) => m((x) => { x.porteiros[n]!.nome = e.target.value; }, `n${p.id}`)} className={cn(campo, "!h-10 !text-[14.5px]")} aria-label="Nome" />
              <Botaozinho perigo titulo="Retirar este horário" onClick={() => m((x) => { x.porteiros.splice(n, 1); })}><Trash2 size={15} /></Botaozinho>
            </div>
          ))}
          <Adicionar onClick={() => m((x) => { x.porteiros.push({ id: novoIdB("po"), horario: "", nome: "" }); })}>Adicionar horário</Adicionar>
        </div>
      </Secao>
      <AlertaCheia pct={cheia(es.id)} linhas={20} />
    </>
  );
}

function PassoAgenda({ b, pt, mudarBloco, cheia }: PropsPasso) {
  const ag = pt.agenda;
  if (!ag) return <Faltando nome="Agenda" />;
  const m = (fn: (x: Extract<Bloco, { tipo: "agenda" }>) => void, chave?: string) => mudarBloco(ag.id, (x) => { if (x.tipo === "agenda") fn(x); }, chave);
  const achar = (x: Extract<Bloco, { tipo: "agenda" }>, id: string) => {
    for (const g of x.grupos) { const it = g.itens.find((y) => y.id === id); if (it) return it; }
    return null;
  };
  const novo = () => {
    const id = novoIdB("i");
    m((x) => colocarNaAgenda(x, b.data, { id, data: "", hora: "-", texto: "" }, b.data));
    setTimeout(() => document.getElementById(`ag-${id}`)?.focus(), 60);
  };
  return (
    <>
      <p className="ef-dica !mt-0 !text-[14.5px]">Escolha o dia no calendário: o compromisso vai para o mês certo, em ordem. Deixe a hora vazia quando for o dia todo. Ao criar o boletim seguinte, o que já passou sai sozinho.</p>
      {ag.grupos.map((g) => (
        <Secao key={g.id} titulo={g.titulo.toLowerCase().replace(/^./, (c) => c.toUpperCase())}>
          <div className="ef-peca !shadow-none">
            <div className="hidden grid-cols-[168px_92px_minmax(0,1fr)_40px] gap-2 border-b border-p-borda bg-p-sutil px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-p-suave @2xl:grid">
              <span>Dia</span><span>Hora</span><span>Compromisso</span><span />
            </div>
            {g.itens.map((it) => {
              const dIso = dataDoItem(g.titulo, it.data, b.data);
              return (
                <div key={it.id} className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-2 border-b border-p-borda px-3 py-2.5 last:border-0 @2xl:grid-cols-[168px_92px_minmax(0,1fr)_40px]">
                  {dIso ? (
                    <input type="date" value={dIso} onChange={(e) => e.target.value && m((x) => { const item = achar(x, it.id); if (item) colocarNaAgenda(x, b.data, item, e.target.value); })} className={cn(campo, "ef-num !h-10 !text-[14.5px]")} aria-label="Dia" />
                  ) : (
                    <input value={it.data} placeholder="Dia" onChange={(e) => m((x) => { const item = achar(x, it.id); if (item) item.data = e.target.value; }, `d${it.id}`)} className={cn(campo, "!h-10 !text-[14.5px]")} aria-label="Dia" />
                  )}
                  <input value={it.hora === "-" ? "" : it.hora} placeholder="19h" onChange={(e) => m((x) => { const item = achar(x, it.id); if (item) item.hora = e.target.value.trim() ? e.target.value : "-"; }, `h${it.id}`)} onBlur={() => m((x) => ordenarAgenda(x, b.data))} className={cn(campo, "ef-num !h-10 !text-[14.5px]")} aria-label="Hora (vazio = o dia todo)" />
                  <input id={`ag-${it.id}`} value={it.texto} placeholder="O que vai acontecer" onChange={(e) => m((x) => { const item = achar(x, it.id); if (item) item.texto = e.target.value; }, `t${it.id}`)} className={cn(campo, "!h-10 !text-[14.5px]")} aria-label="Compromisso" />
                  <Botaozinho perigo titulo="Apagar compromisso" onClick={() => m((x) => { for (const gg of x.grupos) gg.itens = gg.itens.filter((y) => y.id !== it.id); x.grupos = x.grupos.filter((gg) => gg.itens.length); })}><Trash2 size={15} /></Botaozinho>
                </div>
              );
            })}
          </div>
        </Secao>
      ))}
      <Adicionar onClick={novo}>Novo compromisso</Adicionar>
      <AlertaCheia pct={cheia(ag.id)} linhas={20} />
    </>
  );
}

function PassoSemana({ pt, mudarBloco, cheia }: PropsPasso) {
  const t = pt.semana;
  const nomes = nomesUsados(pt);
  if (!t) return <Faltando nome="Outros trabalhos da semana" />;
  const m = (fn: (x: Extract<Bloco, { tipo: "tabela" }>) => void, chave?: string) => mudarBloco(t.id, (x) => { if (x.tipo === "tabela") fn(x); }, chave);
  const colunas = t.cabecalho.slice(1);
  return (
    <>
      <datalist id="nomes-semana">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
      <div className="grid gap-5 @2xl:grid-cols-2">
        {colunas.map((c, ci) => (
          <section key={ci} className="ef-peca ef-peca-filete !shadow-none">
            <div className="border-b border-p-borda bg-p-sutil px-4 py-3">
              <label htmlFor={`col-${ci}`} className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-p-suave">Dia, horário e atividade</label>
              <input id={`col-${ci}`} value={c} onChange={(e) => m((x) => { x.cabecalho[ci + 1] = e.target.value; }, `c${ci}`)} className={cn(campo, "mt-1.5 !h-10 font-bold text-p-acento")} />
            </div>
            <div className="grid gap-3 px-4 py-4">
              {t.linhas.map((l, li) => (
                <label key={l.id} className="grid gap-1">
                  <span className="text-[13px] font-semibold text-p-texto-2">{l.celulas[0]}</span>
                  <input list="nomes-semana" value={l.celulas[ci + 1] ?? ""} placeholder="Nome" onChange={(e) => m((x) => { x.linhas[li]!.celulas[ci + 1] = e.target.value; }, `v${l.id}${ci}`)} className={cn(campo, "!h-10 !text-[14.5px]")} />
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
      <AlertaCheia pct={cheia(t.id)} linhas={20} />
    </>
  );
}

type Pessoa = { id: string; dia: string; nome: string };

function PassoAniversariantes({ b, pt, mudarBloco, cheia }: PropsPasso) {
  const an = pt.aniversariantes;
  if (!an) return <Faltando nome="Aniversariantes" />;
  const m = (fn: (x: Extract<Bloco, { tipo: "aniversariantes" }>) => void, chave?: string) => mudarBloco(an.id, (x) => { if (x.tipo === "aniversariantes") fn(x); }, chave);
  // uma pessoa por linha (o boletim guarda vários nomes do mesmo dia juntos)
  const pessoas: Pessoa[] = an.linhas.flatMap((l) => {
    const ns = l.nomes.split("\n");
    return ns.map((nome, k) => ({ id: ns.length > 1 ? `${l.id}-${k}` : l.id, dia: l.dia, nome }));
  });
  const gravar = (x: Extract<Bloco, { tipo: "aniversariantes" }>, lista: Pessoa[], ordenar = false) => {
    const l = ordenar ? [...lista].sort((p, q) => (parseInt(p.dia, 10) || 99) - (parseInt(q.dia, 10) || 99)) : lista;
    x.linhas = l.map((p) => ({ id: p.id || novoIdB("an"), dia: p.dia, nomes: p.nome }));
  };
  const mes = MESES_MAIUSC[Number(b.data.slice(5, 7)) - 1]!;
  const tituloCerto = `ANIVERSARIANTES DE ${mes}`;
  return (
    <>
      <div>
        <Rotulo htmlFor="tit-aniv">Título</Rotulo>
        <div className="flex flex-wrap items-center gap-2">
          <input id="tit-aniv" value={an.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "taniv")} className={cn(campo, "max-w-[400px] font-bold text-p-acento")} />
          {an.titulo.toUpperCase() !== tituloCerto && (
            <button type="button" onClick={() => m((x) => { x.titulo = tituloCerto; })} className={cn(btnSec, "!h-[46px]")}>Usar {mes.toLowerCase()}</button>
          )}
        </div>
      </div>
      <Secao titulo="Lista do mês" dica="Uma pessoa ou casal por linha. A ordem dos dias se arruma sozinha.">
        <div className="ef-peca !shadow-none">
          {pessoas.map((p, n) => (
            <div key={p.id} className="flex items-center gap-2 border-b border-p-borda px-3 py-2 last:border-0">
              <input value={p.dia} inputMode="numeric" placeholder="Dia" onChange={(e) => m((x) => { const l = [...pessoas]; l[n] = { ...p, dia: e.target.value }; gravar(x, l); }, `d${n}`)} onBlur={() => m((x) => gravar(x, pessoas, true))} className={cn(campo, "ef-num !h-10 w-[68px] shrink-0 text-center !text-[15px] font-bold text-p-acento")} aria-label="Dia" />
              <input value={p.nome} placeholder="Nome, ou “Cas. Fulano e Fulana (10 anos)”" onChange={(e) => m((x) => { const l = [...pessoas]; l[n] = { ...p, nome: e.target.value }; gravar(x, l); }, `n${n}`)} className={cn(campo, "!h-10 !text-[14.5px]")} aria-label="Nome" />
              <Botaozinho perigo titulo="Retirar da lista" onClick={() => m((x) => gravar(x, pessoas.filter((_, k) => k !== n)))}><Trash2 size={15} /></Botaozinho>
            </div>
          ))}
        </div>
        <div className="mt-2"><Adicionar onClick={() => m((x) => gravar(x, [...pessoas, { id: "", dia: "", nome: "" }]))}>Adicionar aniversariante</Adicionar></div>
      </Secao>
      <Secao titulo="Versículo dos aniversariantes">
        <div className="grid gap-3 @xl:grid-cols-[1fr_200px]">
          <div>
            <Rotulo htmlFor="vers-aniv">Versículo</Rotulo>
            <input id="vers-aniv" value={an.versiculo} onChange={(e) => m((x) => { x.versiculo = e.target.value; }, "vaniv")} className={cn(campo, "escritura !text-[16.5px]")} />
          </div>
          <div>
            <Rotulo htmlFor="ref-aniv">Referência</Rotulo>
            <input id="ref-aniv" value={an.referencia} onChange={(e) => m((x) => { x.referencia = e.target.value; }, "raniv")} className={campo} />
          </div>
        </div>
      </Secao>
      <AlertaCheia pct={cheia(an.id)} linhas={20} />
    </>
  );
}

type VersaoResumo = { em: string; por: string; motivo: string; pastoral: string };

function PassoPublicar({ b, verificacao, ir, salvarAntes, aoPublicado, aoRestaurado }: PropsPasso & {
  verificacao: ReturnType<typeof conferir>;
  ir: (p: IdPasso) => void;
  salvarAntes: () => Promise<void>;
  aoPublicado: (publicado: boolean, em: string | undefined, atualizadoEm: string) => void;
  aoRestaurado: (b: Boletim) => void;
}) {
  const [publicando, setPublicando] = useState(false);
  const [versoes, setVersoes] = useState<VersaoResumo[] | null>(null);
  const [restaurando, setRestaurando] = useState("");
  const graves = verificacao.filter((v) => !v.ok && v.grave);
  const pendentes = verificacao.filter((v) => !v.ok).length;
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const linkSite = `${origem}/boletim/${b.data}`;
  const linkPdf = `/api/boletim/${b.id}/pdf`;

  const publicar = async (sim: boolean) => {
    setPublicando(true);
    try {
      await salvarAntes();
      const r = await publicarBoletim({ data: { id: b.id, publicar: sim } });
      aoPublicado(sim, r.publicadoEm, r.atualizadoEm);
      toast.success(sim ? "Boletim publicado no site." : "O boletim saiu do site.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível."); } finally { setPublicando(false); }
  };

  const textoZap = `*${b.titulo}* – ${dataPorExtenso(b.data)}\n${linkSite}`;

  return (
    <>
      <Secao titulo="Conferência" dica={pendentes ? `${pendentes} ${pendentes === 1 ? "ponto pede" : "pontos pedem"} atenção.` : "Tudo certo para publicar."}>
        <ul className="ef-peca !shadow-none">
          {verificacao.map((v) => (
            <li key={v.texto} className="flex items-center gap-3 border-b border-p-borda px-4 py-3 last:border-0">
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", v.ok ? "bg-p-acento text-white" : v.grave ? "bg-red-600 text-white" : "bg-amber-400 text-amber-950")}>
                {v.ok ? <Check size={13} strokeWidth={3} /> : <span className="text-[13px] font-bold leading-none">!</span>}
              </span>
              <span className={cn("flex-1 text-[14.5px]", v.ok ? "text-p-texto-2" : "font-semibold text-p-texto")}>{v.texto}</span>
              {!v.ok && <button onClick={() => ir(v.passo as IdPasso)} className="ef-btn ef-btn-fantasma !h-8 !text-p-acento">Arrumar <ArrowRight size={14} /></button>}
            </li>
          ))}
        </ul>
      </Secao>

      <section className="ef-publicar px-6 py-7 sm:px-8">
        {b.publicado ? (
          <>
            <span className="ef-chip-vidro"><span className="ef-ponto" /> No site</span>
            <p className="mt-4 text-[23px] font-bold leading-tight tracking-[-0.015em]">Este boletim está publicado</p>
            <p className="mt-1.5 max-w-[46ch] text-[14.5px] leading-relaxed text-white/75">As alterações salvas aparecem no site em segundos.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href={`/boletim/${b.data}`} target="_blank" rel="noopener" className="ef-btn ef-btn-branco"><Globe size={16} /> Ver no site</a>
              <button disabled={publicando} onClick={() => { if (confirm("Retirar este boletim do site? Ele continua guardado aqui como rascunho.")) publicar(false); }} className="ef-btn ef-btn-vidro">Retirar do site</button>
            </div>
          </>
        ) : (
          <>
            <span className="ef-chip-vidro"><span className="ef-ponto ef-ponto-rascunho" /> Rascunho</span>
            <p className="mt-4 text-[23px] font-bold leading-tight tracking-[-0.015em]">Publicar no site</p>
            <p className="mt-1.5 max-w-[46ch] text-[14.5px] leading-relaxed text-white/75">Até lá, só a equipe do painel vê este boletim.</p>
            {graves.length > 0 && <p className="mt-3 border-l-2 border-white/50 pl-3 text-[14px] font-semibold text-white">Antes, resolva os pontos em vermelho da conferência.</p>}
            <button disabled={publicando || graves.length > 0} onClick={() => publicar(true)} className="ef-btn ef-btn-branco mt-6 !h-[52px] !px-8 !text-[12.5px]">
              {publicando ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />} Publicar agora
            </button>
          </>
        )}
      </section>

      <Secao titulo="Compartilhar e imprimir">
        <div className="grid gap-2 @xl:grid-cols-3">
          <a href={linkPdf} target="_blank" rel="noopener" onClick={() => salvarAntes()} className={cn(btnSec, "!h-12")}><FileDown size={17} /> Baixar PDF</a>
          <a href={`https://wa.me/?text=${encodeURIComponent(textoZap)}`} target="_blank" rel="noopener" className={cn(btnSec, "!h-12", !b.publicado && "pointer-events-none opacity-45")} aria-disabled={!b.publicado}><IconeWhatsapp className="size-[17px]" /> WhatsApp</a>
          <button disabled={!b.publicado} onClick={async () => { await navigator.clipboard?.writeText(linkSite); toast.success("Link copiado."); }} className={cn(btnSec, "!h-12")}><Copy size={16} /> Copiar link</button>
        </div>
        {!b.publicado && <p className="ef-dica !mt-2.5">WhatsApp e link ficam disponíveis depois de publicar. O PDF para impressão já pode ser baixado.</p>}
      </Secao>

      <Secao titulo="Versões anteriores" dica="Se algo deu errado, volte o boletim para como estava.">
        {!versoes ? (
          <button onClick={() => listarVersoesBoletim({ data: { id: b.id } }).then(setVersoes).catch((e) => toast.error(e.message))} className={btnSec}><History size={16} /> Ver versões guardadas</button>
        ) : versoes.length === 0 ? (
          <p className="text-[14px] text-p-suave">Ainda não há versões guardadas. Elas são criadas sozinhas enquanto você trabalha.</p>
        ) : (
          <ul className="ef-peca !shadow-none">
            {versoes.map((v) => (
              <li key={v.em} className="flex flex-wrap items-center gap-3 border-b border-p-borda px-4 py-3 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="ef-num block text-[14px] font-semibold text-p-texto">{quando(v.em)} · {v.por || "—"}</span>
                  <span className="block truncate text-[12.5px] text-p-suave">{v.motivo}{v.pastoral ? ` · “${v.pastoral}”` : ""}</span>
                </span>
                <button
                  disabled={Boolean(restaurando)}
                  onClick={async () => {
                    if (!confirm("Voltar o boletim para esta versão? A versão atual fica guardada, caso mude de ideia.")) return;
                    setRestaurando(v.em);
                    try {
                      await salvarAntes();
                      const n = await restaurarVersaoBoletim({ data: { id: b.id, em: v.em } });
                      aoRestaurado(n);
                      setVersoes(null);
                      toast.success("Boletim restaurado.");
                    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível."); } finally { setRestaurando(""); }
                  }}
                  className="ef-btn ef-btn-fantasma !h-8 !text-p-acento"
                >
                  {restaurando === v.em ? <Loader2 size={15} className="animate-spin" /> : "Restaurar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </>
  );
}
