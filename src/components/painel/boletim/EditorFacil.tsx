/**
 * Editor simples do boletim — feito para quem não tem intimidade com
 * computador. Um passo por vez, em linguagem do dia a dia, com o boletim
 * pronto aparecendo ao lado. Ninguém precisa pensar em páginas, colunas ou
 * tamanho de letra: o encaixe nas páginas é automático.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Cake, CalendarDays, Check, CheckCircle2, Church, ClipboardList,
  CloudOff, Copy, Eye, FileDown, Globe, HandHeart, History, Loader2, Megaphone, PenLine, Plus, Redo2, Send, Settings2, Star, Trash2, Undo2, X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { FolhasEscaladas } from "@/components/boletim/Folhas";
import { Editavel, formatar } from "@/components/boletim/Editavel";
import { dataPorExtenso, novoIdB, type Bloco, type Boletim, type ItemAviso } from "@/lib/boletim";
import {
  colocarNaAgenda, conferir, dataDoItem, MESES_MAIUSC, ordenarAgenda, paginaDo, partes, type Partes,
} from "@/lib/boletim-facil";
import { listarVersoesBoletim, obterBoletimPainel, publicarBoletim, restaurarVersaoBoletim, salvarBoletim } from "@/lib/api-boletim";
import { IconeWhatsapp } from "@/components/site/Icones";
import { cn } from "@/lib/utils";

type IdPasso = "inicio" | "pastoral" | "segunda" | "avisos" | "oracao" | "escala" | "agenda" | "semana" | "aniversariantes" | "publicar";
type Passo = { id: IdPasso; titulo: string; Icone: LucideIcon; ajuda: string };

const PASSOS: Passo[] = [
  { id: "inicio", titulo: "Data e versículo", Icone: CalendarDays, ajuda: "O domingo deste boletim e o versículo da semana." },
  { id: "pastoral", titulo: "Pastoral", Icone: PenLine, ajuda: "O texto principal, na primeira página." },
  { id: "segunda", titulo: "Segunda pastoral", Icone: BookOpen, ajuda: "O texto da segunda página." },
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

const campo = "h-12 w-full min-w-0 rounded-xl border-2 border-p-borda bg-p-superficie px-3.5 text-[16px] text-p-texto outline-none transition placeholder:text-p-suave/70 hover:border-p-borda-forte focus:border-p-acento focus:ring-4 focus:ring-p-acento/12";
const btnSec = "inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-p-borda bg-p-superficie px-4 text-[14.5px] font-semibold text-p-texto transition hover:border-p-acento hover:text-p-acento disabled:opacity-50";
const btnPri = "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-p-acento px-5 text-[15px] font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60";

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

  const pt = useMemo(() => (b ? partes(b) : {}), [b]);
  const blocoDoPasso = (p: IdPasso, d: Partes): string | undefined => ({
    inicio: d.avisos?.id, pastoral: d.pastoral?.id, segunda: d.segunda?.id, avisos: d.avisos?.id, oracao: d.avisos?.id,
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-p-fundo">
      {/* ── barra de cima ── */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-p-borda bg-p-superficie px-3 py-2.5 sm:px-5">
        <button onClick={fecharEditor} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold text-p-texto-2 hover:bg-p-hover">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="min-w-0 flex-1 pl-1">
          <p className="truncate text-[16px] font-bold leading-tight text-p-texto">Boletim de {dataPorExtenso(b.data)}</p>
          <p className="flex items-center gap-2 text-[12.5px] text-p-suave">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-px text-[11.5px] font-bold", b.publicado ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-800 dark:text-amber-300")}>
              {b.publicado ? <><Globe size={11} /> No site</> : "Rascunho — só a equipe vê"}
            </span>
            <SeloSalvo estado={salvamento} />
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={desfazer} disabled={!hist.current.passado.length} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-semibold text-p-texto-2 hover:bg-p-hover disabled:opacity-40" title="Desfazer (Ctrl+Z)">
            <Undo2 size={17} /> <span className="hidden md:inline">Desfazer</span>
          </button>
          <button onClick={refazer} disabled={!hist.current.futuro.length} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-semibold text-p-texto-2 hover:bg-p-hover disabled:opacity-40" title="Refazer">
            <Redo2 size={17} /> <span className="hidden md:inline">Refazer</span>
          </button>
        </div>
        <button onClick={() => setVerPrevia(true)} className={cn(btnSec, "!h-10 xl:hidden")}><Eye size={17} /> Ver como fica</button>
        <button onClick={() => ir("publicar")} className={cn(btnPri, "!h-10 !px-4 !text-[14px]")}><Send size={16} /> {b.publicado ? "Publicado" : "Publicar"}</button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── passos ── */}
        <nav className="hidden w-[248px] shrink-0 overflow-y-auto border-r border-p-borda bg-p-superficie px-3 py-4 lg:block" aria-label="Passos do boletim">
          <p className="px-2 pb-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-p-suave">Siga os passos</p>
          <ol className="grid gap-1">
            {PASSOS.map((p, n) => {
              const ok = feito(p.id);
              const ativo = p.id === passo;
              return (
                <li key={p.id}>
                  <button onClick={() => ir(p.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition", ativo ? "bg-p-acento text-white shadow-sm" : "text-p-texto hover:bg-p-hover")}>
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-bold", ativo ? "bg-white/20" : ok ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-p-fundo text-p-suave")}>
                      {ok && !ativo ? <Check size={16} strokeWidth={3} /> : n + 1}
                    </span>
                    <span className="text-[14.5px] font-semibold leading-tight">{p.titulo}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-6 border-t border-p-borda px-2 pt-4">
            <button onClick={async () => { if (pendente.current) await salvar(); aoModoAvancado(); }} className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-p-suave hover:text-p-acento">
              <Settings2 size={14} /> Modo avançado (diagramação)
            </button>
          </div>
        </nav>

        {/* ── formulário do passo ── */}
        <main id="editor-facil-form" className="min-w-0 flex-1 overflow-y-auto">
          {/* passos no celular */}
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-p-borda bg-p-superficie/95 px-3 py-2 backdrop-blur lg:hidden">
            <select value={passo} onChange={(e) => ir(e.target.value as IdPasso)} className={cn(campo, "!h-11 font-semibold")}>
              {PASSOS.map((p, n) => <option key={p.id} value={p.id}>{n + 1}. {p.titulo}{feito(p.id) ? " ✓" : ""}</option>)}
            </select>
          </div>

          <div className="@container mx-auto max-w-[760px] px-4 pb-16 pt-6 sm:px-8 sm:pt-9">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-p-acento">Passo {i + 1} de {PASSOS.length}</p>
            <h1 className="mt-1 flex items-center gap-3 text-[26px] font-bold leading-tight text-p-texto sm:text-[30px]">
              <atualPasso.Icone className="shrink-0 text-p-acento" size={28} /> {atualPasso.titulo}
            </h1>
            <p className="mt-1.5 text-[16px] text-p-suave">{atualPasso.ajuda}</p>

            {passo === "inicio" && lembretes.length > 0 && (
              <div className="mt-6 rounded-2xl border-2 border-p-acento/25 bg-p-realce p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15.5px] font-bold text-p-texto">Este boletim foi preparado a partir do anterior</p>
                  <button onClick={() => setLembretes([])} className="rounded-lg p-1 text-p-suave hover:bg-p-hover" title="Fechar"><X size={18} /></button>
                </div>
                <ul className="mt-2 grid gap-1.5 text-[15px] text-p-texto-2">
                  {lembretes.map((l) => <li key={l} className="flex gap-2"><Check size={17} className="mt-0.5 shrink-0 text-p-acento" /> {l}</li>)}
                </ul>
              </div>
            )}

            <div className="mt-7 grid gap-6" data-campos>
              {passo === "inicio" && <PassoInicio {...props} />}
              {passo === "pastoral" && <PassoArtigo {...props} bloco={pt.pastoral} nome="pastoral" />}
              {passo === "segunda" && <PassoArtigo {...props} bloco={pt.segunda} nome="segunda pastoral" />}
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

            {/* navegação entre os passos */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-p-borda pt-6">
              {i > 0 ? (
                <button onClick={() => ir(PASSOS[i - 1]!.id)} className={btnSec}><ArrowLeft size={18} /> {PASSOS[i - 1]!.titulo}</button>
              ) : <span />}
              {i < PASSOS.length - 1 && (
                <button onClick={() => ir(PASSOS[i + 1]!.id)} className={btnPri}>Próximo: {PASSOS[i + 1]!.titulo} <ArrowRight size={18} /></button>
              )}
            </div>
          </div>
        </main>

        {/* ── como vai ficar ── */}
        <aside
          className={cn(
            "flex-col border-l border-p-borda bg-[#e9eef2] dark:bg-[#0d1820]",
            verPrevia ? "fixed inset-0 z-50 flex" : "absolute -left-[9999px] top-0 flex w-[420px] xl:static xl:flex xl:w-[min(34vw,520px)] xl:shrink-0",
          )}
          aria-label="Como o boletim vai ficar"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-p-borda bg-p-superficie px-4 py-2.5">
            <p className="flex items-center gap-2 text-[13.5px] font-bold text-p-texto"><Eye size={16} className="text-p-acento" /> Como vai ficar</p>
            <span className="text-[12px] text-p-suave">Clique numa parte para editá-la</span>
            {verPrevia && <button onClick={() => setVerPrevia(false)} className={cn(btnSec, "!h-9")}><X size={16} /> Fechar</button>}
          </div>
          <div ref={previa} className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className={cn(verPrevia && "mx-auto max-w-[620px]")}>
              <FolhasEscaladas
                boletim={b}
                espaco={14}
                aoOcupacao={aoOcupacao}
                selecionado={blocoDoPasso(passo, pt) ?? null}
                aoSelecionar={(blocoId) => {
                  const alvo = (Object.keys({ pastoral: 1, segunda: 1, avisos: 1, escala: 1, agenda: 1, semana: 1, aniversariantes: 1 }) as IdPasso[]).find((p) => blocoDoPasso(p, pt) === blocoId);
                  if (alvo) ir(alvo);
                }}
              />
            </div>
          </div>
        </aside>
      </div>

      {conflito && (
        <Aviso
          titulo="Este boletim mudou em outro lugar"
          texto={`${conflito} Para não apagar o trabalho de ninguém, escolha o que fazer:`}
          acoes={[
            { rotulo: "Carregar a versão mais nova (recomendado)", primario: true, acao: () => { setConflito(""); pendente.current = false; obterBoletimPainel({ data: { id } }).then((r) => { baseEm.current = r.boletim.atualizadoEm; hist.current = { passado: [], futuro: [], chave: "", quando: 0 }; definir(r.boletim); setSalvamento("salvo"); }); } },
            { rotulo: "Manter o que está na minha tela", acao: () => { setConflito(""); salvar(true); } },
          ]}
        />
      )}
    </div>
  );
}

// ─── Peças ──────────────────────────────────────────────────────────────────

function SeloSalvo({ estado }: { estado: Salvamento }) {
  if (estado === "salvando" || estado === "pendente") return <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Salvando…</span>;
  if (estado === "erro") return <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400"><CloudOff size={13} /> Sem conexão — tentando de novo</span>;
  return <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={13} /> Tudo salvo</span>;
}

function Aviso({ titulo, texto, acoes }: { titulo: string; texto: string; acoes: { rotulo: string; acao: () => void; primario?: boolean }[] }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-p-superficie p-6 shadow-2xl">
        <AlertTriangle className="text-amber-500" size={30} />
        <h2 className="mt-3 text-[20px] font-bold text-p-texto">{titulo}</h2>
        <p className="mt-2 text-[15px] text-p-texto-2">{texto}</p>
        <div className="mt-6 grid gap-2">
          {acoes.map((a) => <button key={a.rotulo} onClick={a.acao} className={a.primario ? btnPri : btnSec}>{a.rotulo}</button>)}
        </div>
      </div>
    </div>
  );
}

function Rotulo({ children, dica, htmlFor }: { children: ReactNode; dica?: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-2">
      <label htmlFor={htmlFor} className="block text-[15.5px] font-bold text-p-texto">{children}</label>
      {dica && <p className="mt-0.5 text-[13.5px] text-p-suave">{dica}</p>}
    </div>
  );
}

/** Caixa para textos longos: negrito e itálico com botões grandes; aceita texto colado do Word ou do WhatsApp. */
function CaixaTexto({ valor, aoMudar, dica, minimo = 160 }: { valor: string; aoMudar: (v: string) => void; dica: string; minimo?: number }) {
  const bt = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13.5px] text-p-texto-2 transition hover:bg-p-hover hover:text-p-texto";
  return (
    <div className="overflow-hidden rounded-xl border-2 border-p-borda bg-p-superficie transition focus-within:border-p-acento focus-within:ring-4 focus-within:ring-p-acento/12 hover:border-p-borda-forte">
      <div className="flex flex-wrap items-center gap-1 border-b border-p-borda bg-p-fundo/60 px-2 py-1.5">
        <button type="button" className={bt} onMouseDown={(e) => { e.preventDefault(); formatar("bold"); }} title="Selecione palavras e clique para deixar em negrito"><strong className="text-[15px]">N</strong> Negrito</button>
        <button type="button" className={bt} onMouseDown={(e) => { e.preventDefault(); formatar("italic"); }} title="Selecione palavras e clique para deixar em itálico"><em className="font-serif text-[16px]">I</em> Itálico</button>
        <button type="button" className={bt} onMouseDown={(e) => { e.preventDefault(); formatar("removeFormat"); }} title="Tira negrito e itálico do trecho selecionado">Tirar destaque</button>
        <span className="ml-auto hidden pr-2 text-[12px] text-p-suave sm:inline">Pode colar do Word ou do WhatsApp</span>
      </div>
      <Editavel
        valor={valor}
        aoMudar={aoMudar}
        modo="paragrafos"
        como="div"
        dica={dica}
        className="editor-facil-texto block px-4 py-3 text-[16.5px] leading-[1.7] text-p-texto outline-none [&_p+p]:mt-3"
        style={{ minHeight: minimo }}
      />
    </div>
  );
}

function AlertaCheia({ pct, linhas }: { pct: number; linhas: number }) {
  if (pct <= 100) return null;
  const sobra = Math.max(1, Math.ceil(((pct - 100) / 100) * linhas));
  return (
    <div className="flex gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-[15px] text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200" role="alert">
      <AlertTriangle className="mt-0.5 shrink-0" size={20} />
      <p><strong>O texto não cabe na página.</strong> As letras já foram diminuídas o máximo possível. Corte mais ou menos {sobra} {sobra === 1 ? "linha" : "linhas"} para caber.</p>
    </div>
  );
}

function Botaozinho({ children, onClick, perigo, titulo, disabled }: { children: ReactNode; onClick: () => void; perigo?: boolean; titulo?: string; disabled?: boolean }) {
  return (
    <button type="button" title={titulo} disabled={disabled} onClick={onClick} className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] font-semibold transition disabled:opacity-35", perigo ? "text-red-600 hover:bg-red-500/10 dark:text-red-400" : "text-p-texto-2 hover:bg-p-hover hover:text-p-texto")}>
      {children}
    </button>
  );
}

function Adicionar({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-p-borda-forte text-[15.5px] font-bold text-p-acento transition hover:border-p-acento hover:bg-p-realce">
      <Plus size={20} /> {children}
    </button>
  );
}

function Faltando({ nome }: { nome: string }) {
  return <p className="rounded-xl border-2 border-dashed border-p-borda p-6 text-[15px] text-p-suave">Este boletim não tem a seção “{nome}”. Se precisar dela, peça para a comunicação incluir pelo modo avançado.</p>;
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
        <Rotulo htmlFor="data-boletim" dica="O domingo em que o boletim será entregue.">Data do boletim</Rotulo>
        <input id="data-boletim" type="date" value={b.data} onChange={(e) => e.target.value && mudar((d) => { d.data = e.target.value; })} className={cn(campo, "max-w-[260px]")} />
        <p className={cn("mt-2 text-[14.5px]", domingo ? "text-p-suave" : "font-semibold text-amber-700 dark:text-amber-400")}>
          {domingo ? `Domingo, ${dataPorExtenso(b.data)}.` : `Atenção: ${dataPorExtenso(b.data)} não é um domingo.`}
        </p>
      </div>
      <div>
        <Rotulo htmlFor="versiculo" dica="Aparece em destaque, no alto da página dos avisos (“Martelando a Palavra”).">Versículo da semana</Rotulo>
        <textarea id="versiculo" rows={3} value={b.versiculo ?? ""} placeholder="Ex.: Tomai toda a armadura de Deus, para que possais resistir no dia mau…" onChange={(e) => mudar((d) => { d.versiculo = e.target.value.replace(/^["“]|["”]$/g, ""); }, "versiculo")} className={cn(campo, "!h-auto py-3 font-serif text-[17px] italic leading-relaxed")} />
      </div>
      <div>
        <Rotulo htmlFor="referencia">Onde está na Bíblia</Rotulo>
        <input id="referencia" value={b.versiculoRef ?? ""} placeholder="Ex.: Efésios 6.13" onChange={(e) => mudar((d) => { d.versiculoRef = e.target.value; }, "versiculoRef")} className={cn(campo, "max-w-[320px]")} />
      </div>
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
        <input id={`tit-${bloco.id}`} value={bloco.titulo.replace(/\*/g, "")} placeholder="Ex.: A questão do coração" onChange={(e) => m((x) => { x.titulo = e.target.value; }, `t${bloco.id}`)} className={cn(campo, "!h-14 text-[20px] font-bold")} />
      </div>
      <div>
        <Rotulo dica={<>Escreva ou cole o texto. Deixe uma linha em branco entre os parágrafos. {palavras > 0 && <span className="font-semibold">{palavras} palavras.</span>}</>}>Texto</Rotulo>
        <CaixaTexto valor={bloco.texto} aoMudar={(v) => m((x) => { x.texto = v; }, `x${bloco.id}`)} dica="Comece a escrever aqui…" minimo={320} />
      </div>
      <AlertaCheia pct={cheia(bloco.id)} linhas={96} />
      <div>
        <Rotulo htmlFor={`aut-${bloco.id}`} dica="Aparece no fim do texto, à direita.">Quem escreveu</Rotulo>
        <input id={`aut-${bloco.id}`} value={bloco.autor} placeholder="Ex.: Pr. Hilário José" onChange={(e) => m((x) => { x.autor = e.target.value; }, `a${bloco.id}`)} className={cn(campo, "max-w-[360px]")} />
      </div>
    </>
  );
}

function PassoAvisos({ pt, mudarBloco, cheia, desfazer }: PropsPasso & { desfazer: () => void }) {
  const av = pt.avisos;
  if (!av) return <Faltando nome="Avisos" />;
  const lista = av.itens.filter((x) => x.estilo !== "caixa");
  const m = (fn: (itens: ItemAviso[]) => void, chave?: string) => mudarBloco(av.id, (x) => { if (x.tipo === "avisos") fn(x.itens); }, chave);
  // importantes primeiro, depois os normais, e a caixa de oração sempre por último
  const reordenar = (itens: ItemAviso[]) => {
    const peso = (e?: string) => (e === "destaque" ? 0 : e === "caixa" ? 2 : 1);
    const ord = [...itens].sort((a, c) => peso(a.estilo) - peso(c.estilo));
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
      <p className="rounded-xl bg-p-realce px-4 py-3 text-[14.5px] text-p-texto-2">
        Marque com <Star size={14} className="inline -translate-y-px fill-amber-400 text-amber-500" /> <strong>Importante</strong> os avisos que devem aparecer em destaque, no alto. O ideal é ter <strong>dois</strong>.
      </p>
      {lista.map((a, n) => {
        const imp = a.estilo === "destaque";
        return (
          <article key={a.id} className={cn("rounded-2xl border-2 bg-p-superficie p-4 sm:p-5", imp ? "border-amber-300 dark:border-amber-500/40" : "border-p-borda")}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-p-acento text-[14px] font-bold text-white">{n + 1}</span>
              <button
                type="button"
                onClick={() => m((itens) => { const x = itens.find((y) => y.id === a.id)!; if (imp) delete x.estilo; else x.estilo = "destaque"; reordenar(itens); })}
                className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border-2 px-3.5 text-[13.5px] font-bold transition", imp ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" : "border-p-borda text-p-suave hover:border-amber-400 hover:text-amber-700")}
              >
                <Star size={15} className={imp ? "fill-amber-400 text-amber-500" : ""} /> {imp ? "Importante" : "Marcar como importante"}
              </button>
              <span className="ml-auto flex items-center">
                <Botaozinho titulo="Subir" disabled={n === 0} onClick={() => mover(a.id, -1)}><ArrowUp size={16} /> <span className="hidden sm:inline">Subir</span></Botaozinho>
                <Botaozinho titulo="Descer" disabled={n === lista.length - 1} onClick={() => mover(a.id, 1)}><ArrowDown size={16} /> <span className="hidden sm:inline">Descer</span></Botaozinho>
                <Botaozinho perigo titulo="Apagar este aviso" onClick={() => { m((itens) => { itens.splice(itens.findIndex((y) => y.id === a.id), 1); }); toast(`Aviso “${a.titulo || "sem título"}” apagado`, { action: { label: "Desfazer", onClick: desfazer } }); }}>
                  <Trash2 size={16} /> <span className="hidden sm:inline">Apagar</span>
                </Botaozinho>
              </span>
            </div>
            <input id={`aviso-${a.id}`} value={a.titulo} placeholder="Título do aviso (ex.: Bazar Missionário)" onChange={(e) => m((itens) => { itens.find((y) => y.id === a.id)!.titulo = e.target.value; }, `t${a.id}`)} className={cn(campo, "mb-3 text-[17px] font-bold")} />
            <CaixaTexto valor={a.texto} aoMudar={(v) => m((itens) => { itens.find((y) => y.id === a.id)!.texto = v; }, `x${a.id}`)} dica="O que a igreja precisa saber…" minimo={90} />
          </article>
        );
      })}
      <Adicionar onClick={novo}>Novo aviso</Adicionar>
      {destaques > 2 && <p className="text-[14px] text-amber-700 dark:text-amber-400">Há {destaques} avisos importantes. Com muitos destaques, nenhum se destaca — considere deixar só dois.</p>}
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
        <input id="tit-oracao" value={caixa.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "toracao")} className={cn(campo, "max-w-[420px] font-bold")} />
      </div>
      <div>
        <Rotulo dica="Um pedido depois do outro, separados por ponto e vírgula, ou um parágrafo para cada grupo.">Pedidos</Rotulo>
        <CaixaTexto valor={caixa.texto} aoMudar={(v) => m((x) => { x.texto = v; }, "xoracao")} dica="Pela saúde de…" minimo={180} />
      </div>
      <AlertaCheia pct={cheia(av.id)} linhas={60} />
      <div>
        <Botaozinho perigo onClick={() => mudarBloco(av.id, (x) => { if (x.tipo === "avisos") x.itens = x.itens.filter((y) => y.estilo !== "caixa"); })}><Trash2 size={16} /> Tirar a caixa deste boletim</Botaozinho>
      </div>
    </>
  );
}

function PassoEscala({ b, pt, mudarBloco, cheia }: PropsPasso) {
  const es = pt.escala;
  const nomes = nomesUsados(pt);
  if (!es) return <Faltando nome="Escala" />;
  const m = (fn: (x: Extract<Bloco, { tipo: "escala" }>) => void, chave?: string) => mudarBloco(es.id, (x) => { if (x.tipo === "escala") fn(x); }, chave);
  const proximo = new Date(`${b.data}T12:00:00`);
  proximo.setDate(proximo.getDate() + 7);
  const prox = `${String(proximo.getDate()).padStart(2, "0")}/${String(proximo.getMonth() + 1).padStart(2, "0")}`;
  return (
    <>
      <datalist id="nomes-boletim">{nomes.map((n) => <option key={n} value={n} />)}</datalist>
      <section>
        <h2 className="mb-1 text-[19px] font-bold text-p-texto">Escala de serviços</h2>
        <p className="mb-4 text-[14px] text-p-suave">Ao digitar, aparecem os nomes já usados — é só escolher.</p>
        <div className="overflow-hidden rounded-2xl border-2 border-p-borda bg-p-superficie">
          <div className="hidden grid-cols-[1.1fr_1fr_1fr] gap-3 border-b border-p-borda bg-p-fundo/60 px-4 py-2.5 text-[12.5px] font-bold uppercase tracking-wider text-p-suave @2xl:grid">
            <span>Função</span><span>Hoje · {dataCurta(b.data)}</span><span>Próximo domingo · {prox}</span>
          </div>
          {es.linhas.map((l, n) => (
            <div key={l.id} className="grid grid-cols-2 gap-2 border-b border-p-borda px-4 py-3 last:border-0 @2xl:grid-cols-[1.1fr_1fr_1fr] @2xl:items-center @2xl:gap-3">
              <span className="col-span-2 text-[15px] font-bold text-p-texto @2xl:col-span-1">{l.celulas[0]}</span>
              {[1, 2].map((c) => (
                <label key={c} className="grid gap-1">
                  <span className="text-[12px] font-semibold text-p-suave @2xl:hidden">{c === 1 ? `Hoje · ${dataCurta(b.data)}` : `Próximo domingo · ${prox}`}</span>
                  <input list="nomes-boletim" value={l.celulas[c]} placeholder="Nome" onChange={(e) => m((x) => { x.linhas[n]!.celulas[c as 1 | 2] = e.target.value; }, `e${l.id}${c}`)} className={cn(campo, "!h-11 text-[15px]")} />
                </label>
              ))}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-1 text-[19px] font-bold text-p-texto">Porteiros de oração</h2>
        <p className="mb-4 text-[14px] text-p-suave">Horário e nome de quem fica na porta orando.</p>
        <div className="grid gap-2">
          {es.porteiros.map((p, n) => (
            <div key={p.id} className="flex items-center gap-2">
              <input value={p.horario.replace(/^Das\s+/i, "")} placeholder="19h às 19h15" onChange={(e) => m((x) => { x.porteiros[n]!.horario = e.target.value ? `Das ${e.target.value.replace(/^Das\s+/i, "")}` : ""; }, `h${p.id}`)} className={cn(campo, "!h-11 w-[150px] shrink-0 text-[15px] sm:w-[190px]")} aria-label="Horário" />
              <input list="nomes-boletim" value={p.nome} placeholder="Nome" onChange={(e) => m((x) => { x.porteiros[n]!.nome = e.target.value; }, `n${p.id}`)} className={cn(campo, "!h-11 text-[15px]")} aria-label="Nome" />
              <Botaozinho perigo titulo="Tirar este horário" onClick={() => m((x) => { x.porteiros.splice(n, 1); })}><Trash2 size={16} /></Botaozinho>
            </div>
          ))}
          <Adicionar onClick={() => m((x) => { x.porteiros.push({ id: novoIdB("po"), horario: "", nome: "" }); })}>Mais um horário</Adicionar>
        </div>
      </section>
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
      <p className="rounded-xl bg-p-realce px-4 py-3 text-[14.5px] text-p-texto-2">
        Escolha o dia no calendário: o compromisso vai sozinho para o mês certo, em ordem. Quando o boletim da semana seguinte for criado, o que já passou sai sozinho.
      </p>
      {ag.grupos.map((g) => (
        <section key={g.id}>
          <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.16em] text-p-acento">{g.titulo}</h2>
          <div className="grid gap-2">
            {g.itens.map((it) => {
              const dIso = dataDoItem(g.titulo, it.data, b.data);
              return (
                <div key={it.id} className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-2 rounded-xl border-2 border-p-borda bg-p-superficie p-3 @2xl:grid-cols-[170px_96px_minmax(0,1fr)_auto]">
                  {dIso ? (
                    <input type="date" value={dIso} onChange={(e) => e.target.value && m((x) => { const item = achar(x, it.id); if (item) colocarNaAgenda(x, b.data, item, e.target.value); })} className={cn(campo, "!h-11 text-[15px]")} aria-label="Dia" />
                  ) : (
                    <input value={it.data} placeholder="Dia" onChange={(e) => m((x) => { const item = achar(x, it.id); if (item) item.data = e.target.value; }, `d${it.id}`)} className={cn(campo, "!h-11 text-[15px]")} aria-label="Dia" />
                  )}
                  <input value={it.hora === "-" ? "" : it.hora} placeholder="Hora" onChange={(e) => m((x) => { const item = achar(x, it.id); if (item) item.hora = e.target.value.trim() ? e.target.value : "-"; }, `h${it.id}`)} onBlur={() => m((x) => ordenarAgenda(x, b.data))} className={cn(campo, "!h-11 text-[15px]")} aria-label="Hora (deixe vazio se for o dia todo)" />
                  <input id={`ag-${it.id}`} value={it.texto} placeholder="O que vai acontecer" onChange={(e) => m((x) => { const item = achar(x, it.id); if (item) item.texto = e.target.value; }, `t${it.id}`)} className={cn(campo, "!h-11 text-[15px]")} aria-label="Descrição" />
                  <Botaozinho perigo titulo="Apagar este compromisso" onClick={() => m((x) => { for (const gg of x.grupos) gg.itens = gg.itens.filter((y) => y.id !== it.id); x.grupos = x.grupos.filter((gg) => gg.itens.length); })}><Trash2 size={16} /> <span className="@2xl:hidden">Apagar</span></Botaozinho>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <Adicionar onClick={novo}>Novo compromisso</Adicionar>
      <p className="text-[13.5px] text-p-suave">Hora vazia = o dia todo.</p>
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
      {colunas.map((c, ci) => (
        <section key={ci} className="rounded-2xl border-2 border-p-borda bg-p-superficie p-4 sm:p-5">
          <Rotulo htmlFor={`col-${ci}`} dica="Dia, horário e o que acontece.">Dia da semana</Rotulo>
          <input id={`col-${ci}`} value={c} onChange={(e) => m((x) => { x.cabecalho[ci + 1] = e.target.value; }, `c${ci}`)} className={cn(campo, "mb-4 font-bold")} />
          <div className="grid gap-2.5">
            {t.linhas.map((l, li) => (
              <label key={l.id} className="grid gap-1 @lg:grid-cols-[180px_1fr] @lg:items-center @lg:gap-3">
                <span className="text-[14.5px] font-semibold text-p-texto-2">{l.celulas[0]}</span>
                <input list="nomes-semana" value={l.celulas[ci + 1] ?? ""} placeholder="Nome" onChange={(e) => m((x) => { x.linhas[li]!.celulas[ci + 1] = e.target.value; }, `v${l.id}${ci}`)} className={cn(campo, "!h-11 text-[15px]")} />
              </label>
            ))}
          </div>
        </section>
      ))}
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
          <input id="tit-aniv" value={an.titulo} onChange={(e) => m((x) => { x.titulo = e.target.value; }, "taniv")} className={cn(campo, "max-w-[420px] font-bold")} />
          {an.titulo.toUpperCase() !== tituloCerto && (
            <button type="button" onClick={() => m((x) => { x.titulo = tituloCerto; })} className={btnSec}>Usar “{tituloCerto.toLowerCase().replace(/^./, (c) => c.toUpperCase())}”</button>
          )}
        </div>
      </div>
      <section>
        <Rotulo dica="Uma pessoa (ou casal) por linha. A lista se arruma sozinha pela ordem dos dias.">Lista do mês</Rotulo>
        <div className="grid gap-2">
          {pessoas.map((p, n) => (
            <div key={p.id} className="flex items-center gap-2">
              <input value={p.dia} inputMode="numeric" placeholder="Dia" onChange={(e) => m((x) => { const l = [...pessoas]; l[n] = { ...p, dia: e.target.value }; gravar(x, l); }, `d${n}`)} onBlur={() => m((x) => gravar(x, pessoas, true))} className={cn(campo, "!h-11 w-[76px] shrink-0 text-center text-[15px] font-bold")} aria-label="Dia" />
              <input value={p.nome} placeholder="Nome (ou “Cas. Fulano e Fulana (10 anos)”)" onChange={(e) => m((x) => { const l = [...pessoas]; l[n] = { ...p, nome: e.target.value }; gravar(x, l); }, `n${n}`)} className={cn(campo, "!h-11 text-[15px]")} aria-label="Nome" />
              <Botaozinho perigo titulo="Tirar da lista" onClick={() => m((x) => gravar(x, pessoas.filter((_, k) => k !== n)))}><Trash2 size={16} /></Botaozinho>
            </div>
          ))}
          <Adicionar onClick={() => m((x) => gravar(x, [...pessoas, { id: "", dia: "", nome: "" }]))}>Mais um aniversariante</Adicionar>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div>
          <Rotulo htmlFor="vers-aniv">Versículo dos aniversariantes</Rotulo>
          <input id="vers-aniv" value={an.versiculo} onChange={(e) => m((x) => { x.versiculo = e.target.value; }, "vaniv")} className={cn(campo, "font-serif italic")} />
        </div>
        <div>
          <Rotulo htmlFor="ref-aniv">Referência</Rotulo>
          <input id="ref-aniv" value={an.referencia} onChange={(e) => m((x) => { x.referencia = e.target.value; }, "raniv")} className={campo} />
        </div>
      </div>
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
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const linkSite = `${origem}/boletim/${b.data}`;
  const linkPdf = `/api/boletim/${b.id}/pdf`;

  const publicar = async (sim: boolean) => {
    setPublicando(true);
    try {
      await salvarAntes();
      const r = await publicarBoletim({ data: { id: b.id, publicar: sim } });
      aoPublicado(sim, r.publicadoEm, r.atualizadoEm);
      toast.success(sim ? "Pronto! O boletim já está no site." : "O boletim saiu do site.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível."); } finally { setPublicando(false); }
  };

  const textoZap = `*${b.titulo}* – ${dataPorExtenso(b.data)}\n${linkSite}`;

  return (
    <>
      <section className="rounded-2xl border-2 border-p-borda bg-p-superficie p-4 sm:p-5">
        <h2 className="mb-3 text-[19px] font-bold text-p-texto">Conferência</h2>
        <ul className="grid gap-1">
          {verificacao.map((v) => (
            <li key={v.texto} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
              {v.ok ? <CheckCircle2 size={22} className="shrink-0 text-emerald-600" /> : <AlertTriangle size={22} className={cn("shrink-0", v.grave ? "text-red-600" : "text-amber-500")} />}
              <span className={cn("flex-1 text-[15.5px]", v.ok ? "text-p-texto-2" : "font-semibold text-p-texto")}>{v.texto}</span>
              {!v.ok && <button onClick={() => ir(v.passo as IdPasso)} className="rounded-lg px-3 py-1.5 text-[13.5px] font-bold text-p-acento hover:bg-p-realce">Arrumar</button>}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border-2 border-p-acento/30 bg-p-realce p-5 sm:p-6">
        {b.publicado ? (
          <>
            <p className="flex items-center gap-2 text-[19px] font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={24} /> Este boletim está no site</p>
            <p className="mt-1 text-[15px] text-p-texto-2">O que você mudar agora aparece no site sozinho, em segundos.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`/boletim/${b.data}`} target="_blank" rel="noopener" className={btnPri}><Globe size={18} /> Ver no site</a>
              <button disabled={publicando} onClick={() => { if (confirm("Tirar este boletim do site? Ele continua guardado aqui como rascunho.")) publicar(false); }} className={btnSec}>Tirar do site</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[19px] font-bold text-p-texto">Tudo certo? Coloque no site.</p>
            <p className="mt-1 text-[15px] text-p-texto-2">Enquanto não for publicado, só a equipe do painel vê este boletim.</p>
            {graves.length > 0 && <p className="mt-2 text-[14.5px] font-semibold text-red-700 dark:text-red-400">Antes de publicar, arrume os itens em vermelho acima.</p>}
            <button disabled={publicando || graves.length > 0} onClick={() => publicar(true)} className={cn(btnPri, "mt-4 !h-14 w-full !text-[17px] sm:w-auto sm:!px-8")}>
              {publicando ? <Loader2 size={20} className="animate-spin" /> : <Globe size={20} />} Publicar no site
            </button>
          </>
        )}
      </section>

      <section className="grid gap-2 sm:grid-cols-3">
        <a href={linkPdf} target="_blank" rel="noopener" onClick={() => salvarAntes()} className={cn(btnSec, "!h-14")}><FileDown size={19} /> Baixar PDF</a>
        <a href={`https://wa.me/?text=${encodeURIComponent(textoZap)}`} target="_blank" rel="noopener" className={cn(btnSec, "!h-14", !b.publicado && "pointer-events-none opacity-45")} aria-disabled={!b.publicado}><IconeWhatsapp className="size-[19px]" /> Enviar no WhatsApp</a>
        <button disabled={!b.publicado} onClick={async () => { await navigator.clipboard?.writeText(linkSite); toast.success("Link copiado."); }} className={cn(btnSec, "!h-14")}><Copy size={18} /> Copiar link</button>
      </section>
      {!b.publicado && <p className="-mt-3 text-[13.5px] text-p-suave">WhatsApp e link ficam disponíveis depois de publicar. O PDF já pode ser baixado para imprimir.</p>}

      <section className="rounded-2xl border-2 border-p-borda bg-p-superficie p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-[17px] font-bold text-p-texto"><History size={19} className="text-p-acento" /> Versões anteriores</h2>
            <p className="text-[13.5px] text-p-suave">Algo deu errado? Volte o boletim para como estava antes.</p>
          </div>
          {!versoes && <button onClick={() => listarVersoesBoletim({ data: { id: b.id } }).then(setVersoes).catch((e) => toast.error(e.message))} className={btnSec}>Mostrar</button>}
        </div>
        {versoes && (versoes.length === 0 ? (
          <p className="mt-3 text-[14.5px] text-p-suave">Ainda não há versões guardadas. Elas são guardadas sozinhas enquanto você trabalha.</p>
        ) : (
          <ul className="mt-3 grid gap-1.5">
            {versoes.map((v) => (
              <li key={v.em} className="flex flex-wrap items-center gap-3 rounded-xl border border-p-borda px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-p-texto">{new Date(v.em).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {v.por || "—"}</span>
                  <span className="block truncate text-[13px] text-p-suave">{v.motivo}{v.pastoral ? ` · pastoral “${v.pastoral}”` : ""}</span>
                </span>
                <button
                  disabled={Boolean(restaurando)}
                  onClick={async () => {
                    if (!confirm("Voltar o boletim para esta versão? A versão de agora fica guardada, caso mude de ideia.")) return;
                    setRestaurando(v.em);
                    try {
                      await salvarAntes();
                      const n = await restaurarVersaoBoletim({ data: { id: b.id, em: v.em } });
                      aoRestaurado(n);
                      setVersoes(null);
                      toast.success("Boletim voltou para a versão escolhida.");
                    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível."); } finally { setRestaurando(""); }
                  }}
                  className="rounded-lg px-3 py-1.5 text-[13.5px] font-bold text-p-acento hover:bg-p-realce"
                >
                  {restaurando === v.em ? <Loader2 size={15} className="animate-spin" /> : "Voltar para esta"}
                </button>
              </li>
            ))}
          </ul>
        ))}
      </section>
    </>
  );
}
