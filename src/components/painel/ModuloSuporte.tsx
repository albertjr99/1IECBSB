/**
 * Suporte de TI — chamados para a equipe GRATIA, ligados ao GRATIA HUB.
 * Mesma lógica da Central de chamados da ACIP, no padrão visual do painel.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, FileText, Image as ImageIcon, LayoutGrid, LifeBuoy, List, Loader2, Paperclip, Plus, RefreshCw, Send, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  CATEGORIA_DICA, CATEGORIA_ROTULO, LIMITE_MENSAL, PRIORIDADE_ROTULO, SITUACAO_ROTULO, doMes, fechado, podeCancelar,
  type Anexo, type Categoria, type Chamado, type Situacao,
} from "@/lib/chamados";
import { abrirChamado, cancelarChamado, comentarChamado, listarChamados, sincronizarChamados } from "@/lib/api-chamados";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Camada } from "./Camada";

type Dados = Awaited<ReturnType<typeof listarChamados>>;
type Vista = "geral" | "lista" | "andamento";

const COR: Record<Situacao, string> = {
  aberto: "bg-[#5b7f99]/15 text-[#2b5675] dark:text-[#a9c6dc]",
  recebido: "bg-[#00436f]/10 text-[#00436f] dark:text-[#8fb6d3]",
  em_analise: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  em_desenvolvimento: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  aguardando_cliente: "bg-red-500/12 text-red-700 dark:text-red-300",
  resolvido: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  encerrado: "bg-p-hover text-p-suave",
  cancelado: "bg-p-hover text-p-suave",
};

function Selo({ s }: { s: Situacao }) {
  return <span className={cn("inline-flex h-6 shrink-0 items-center px-2 text-[10.5px] font-bold uppercase tracking-[0.1em]", COR[s])}>{SITUACAO_ROTULO[s]}</span>;
}

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
function relativo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/** Lê um arquivo como data URL; fotos grandes são reduzidas no navegador. */
async function lerArquivo(f: File): Promise<Anexo> {
  const id = Math.random().toString(36).slice(2, 10);
  if (/^image\/(jpeg|png|webp)$/.test(f.type)) {
    const bmp = await createImageBitmap(f);
    const e = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * e);
    cv.height = Math.round(bmp.height * e);
    cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
    const dados = cv.toDataURL("image/jpeg", 0.82);
    return { id, nome: f.name.replace(/\.\w+$/, ".jpg"), tipo: "image/jpeg", tamanho: Math.round((dados.length * 3) / 4), dados };
  }
  if (f.size > 2_500_000) throw new Error(`“${f.name}” é grande demais (máx. 2,5 MB).`);
  const dados = await new Promise<string>((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = erro; r.readAsDataURL(f); });
  return { id, nome: f.name, tipo: f.type || "application/octet-stream", tamanho: f.size, dados };
}

function ListaAnexos({ anexos, remover }: { anexos: Anexo[]; remover?: (id: string) => void }) {
  if (!anexos.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {anexos.map((a) => (
        <li key={a.id} className="group relative">
          <a href={a.dados} download={a.nome} target="_blank" rel="noopener" className="flex h-14 max-w-[220px] items-center gap-2.5 border border-p-borda bg-p-superficie pr-3 text-[12.5px] text-p-texto-2 transition hover:border-p-acento">
            {a.tipo.startsWith("image/") ? <img src={a.dados} alt="" className="h-full w-14 object-cover" /> : <span className="grid h-full w-12 place-items-center bg-p-sutil text-p-suave"><FileText size={18} /></span>}
            <span className="min-w-0"><span className="block truncate font-semibold">{a.nome}</span><span className="text-[11px] text-p-suave">{Math.max(1, Math.round(a.tamanho / 1024))} KB</span></span>
          </a>
          {remover && <button type="button" onClick={() => remover(a.id)} className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-p-texto text-p-superficie shadow" aria-label={`Tirar ${a.nome}`}><X size={12} /></button>}
        </li>
      ))}
    </ul>
  );
}

function useAnexar() {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [lendo, setLendo] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const adicionar = async (fs: FileList | null) => {
    if (!fs?.length) return;
    setLendo(true);
    try {
      const novos: Anexo[] = [];
      for (const f of Array.from(fs).slice(0, 6 - anexos.length)) novos.push(await lerArquivo(f));
      setAnexos((a) => [...a, ...novos]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível ler o arquivo."); } finally {
      setLendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  };
  const input = <input ref={entrada} type="file" multiple hidden accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => adicionar(e.target.files)} />;
  return { anexos, setAnexos, lendo, escolher: () => entrada.current?.click(), soltar: adicionar, input };
}

// ═══════════════════════════════════════════════════════════════════════════

export function ModuloSuporte() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [vista, setVista] = useState<Vista>("geral");
  const [aberto, setAberto] = useState<string | null>(null);
  const [assistente, setAssistente] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  const carregar = useCallback(() => listarChamados().then(setDados).catch((e) => toast.error(e.message)), []);
  const sincronizar = useCallback(async (silencioso = false) => {
    setSincronizando(true);
    try {
      const r = await sincronizarChamados();
      if (!silencioso) r.erro ? toast.error(r.erro) : toast.success("Sincronizado com o GRATIA HUB.");
    } catch { /* fica para a próxima */ } finally {
      setSincronizando(false);
      carregar();
    }
  }, [carregar]);
  useEffect(() => { carregar().then(() => sincronizar(true)); }, []);

  const fotoDe = useMemo(() => {
    const equipe = new Map((dados?.equipe ?? []).flatMap((p) => [[p.nome.toLowerCase(), p.foto], [p.primeiroNome.toLowerCase(), p.foto]] as const));
    return (ev: { autor: string; autorUsuario?: string }) => {
      if (ev.autorUsuario) return dados?.fotos[ev.autorUsuario] ?? null;
      const nome = ev.autor.replace(/ · Equipe GRATIA$/, "").toLowerCase();
      return equipe.get(nome) ?? equipe.get(nome.split(" ")[0] ?? "") ?? null;
    };
  }, [dados]);

  if (!dados) return <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-p-suave" /></div>;
  const lista = dados.chamados;
  const usados = doMes(lista);
  const atual = lista.find((c) => c.id === aberto) ?? null;
  const ligado = dados.ligacao && !dados.ligacao.erro;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ef-sobre">Sistema</p>
          <h1 className="ef-titulo mt-2.5">Suporte de TI</h1>
          <p className="ef-sub mt-1 max-w-[62ch]">Algo não funciona, ou você precisa de ajuda com o painel? Abra um chamado: ele vai direto para a equipe da GRATIA, e as respostas aparecem aqui.</p>
        </div>
        <button onClick={() => setAssistente(true)} className="ef-btn ef-btn-pri !h-12 !px-6"><Plus size={17} strokeWidth={2.4} /> Abrir chamado</button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-p-borda pb-3">
        <div className="ef-chaves" role="tablist">
          {([["geral", "Visão geral", LifeBuoy], ["lista", "Chamados", List], ["andamento", "Andamento", LayoutGrid]] as const).map(([v, r, I]) => (
            <button key={v} role="tab" aria-pressed={vista === v} onClick={() => setVista(v)} className="!inline-flex items-center gap-1.5"><I size={13} /> {r}</button>
          ))}
        </div>
        <button onClick={() => sincronizar()} disabled={sincronizando} title={dados.ligacao?.erro ?? undefined} className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-p-suave transition hover:text-p-acento">
          <span className={cn("size-2 rounded-full", !dados.ligacao ? "bg-p-borda-forte" : ligado ? "bg-emerald-500" : "bg-amber-500")} />
          {!dados.ligacao ? "Ligação com o GRATIA HUB ainda não verificada" : ligado ? `Sincronizado com o GRATIA HUB · ${relativo(dados.ligacao.em)}` : "Sem ligação com o GRATIA HUB — as respostas chegam quando voltar"}
          {sincronizando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
      </div>
      {dados.ligacao?.erro && <p className="-mt-3 text-[12.5px] text-amber-700 dark:text-amber-400">{dados.ligacao.erro}</p>}

      {vista === "geral" && <VisaoGeral lista={lista} usados={usados} abrir={setAberto} novo={() => setAssistente(true)} />}
      {vista === "lista" && <Tabela lista={lista} abrir={setAberto} />}
      {vista === "andamento" && <Quadro lista={lista} abrir={setAberto} />}

      {atual && <Camada><Detalhe c={atual} fotoDe={fotoDe} eu={dados.eu} fechar={() => setAberto(null)} atualizar={carregar} /></Camada>}
      {assistente && <Camada><Assistente usados={usados} fechar={() => setAssistente(false)} criado={(id) => { setAssistente(false); carregar().then(() => setAberto(id)); }} /></Camada>}
    </div>
  );
}

// ─── Visão geral ────────────────────────────────────────────────────────────

function VisaoGeral({ lista, usados, abrir, novo }: { lista: Chamado[]; usados: number; abrir: (id: string) => void; novo: () => void }) {
  const ativos = lista.filter((c) => !fechado(c) && c.situacao !== "resolvido");
  const aguardando = lista.filter((c) => c.situacao === "aguardando_cliente");
  const concluidos = lista.filter((c) => c.situacao === "resolvido" || c.situacao === "encerrado");
  const numeros: [string, number | string, string][] = [
    ["Em andamento", ativos.length, "chamados abertos ou em atendimento"],
    ["Aguardando você", aguardando.length, "a equipe precisa de uma resposta"],
    ["Concluídos", concluidos.length, "desde o início"],
    ["Neste mês", `${usados}/${LIMITE_MENSAL}`, "chamados usados do limite mensal"],
  ];
  return (
    <div className="grid gap-6">
      <section className="ef-peca grid grid-cols-2 lg:grid-cols-4">
        {numeros.map(([r, n, d], i) => (
          <div key={r} className={cn("border-p-borda px-5 py-5", i % 2 === 0 && "border-r", i < 2 && "border-b lg:border-b-0", i === 1 && "lg:border-r", i === 2 && "lg:border-r")}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-p-suave">{r}</p>
            <p className={cn("ef-num mt-2 text-[34px] font-bold leading-none tracking-[-0.03em]", r === "Aguardando você" && Number(n) > 0 ? "text-red-600 dark:text-red-400" : "text-p-acento")}>{n}</p>
            <p className="mt-2 text-[12.5px] text-p-suave">{d}</p>
          </div>
        ))}
      </section>
      {aguardando.length > 0 && (
        <section className="ef-peca border-l-[3px] !border-l-red-600 px-5 py-4">
          <p className="ef-h2 !text-red-700 dark:!text-red-300">A equipe está esperando a sua resposta</p>
          <ul className="mt-2 grid gap-1">{aguardando.map((c) => <li key={c.id}><button onClick={() => abrir(c.id)} className="text-left text-[14.5px] font-semibold text-p-texto hover:text-p-acento">nº {c.numero} · {c.titulo} →</button></li>)}</ul>
        </section>
      )}
      {lista.length === 0 ? (
        <section className="ef-peca ef-peca-filete px-6 py-12 text-center">
          <LifeBuoy className="mx-auto text-p-acento" size={30} strokeWidth={1.6} />
          <p className="mt-4 text-[17px] font-bold text-p-texto">Nenhum chamado ainda</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-[14px] text-p-suave">Quando algo não funcionar ou você tiver uma dúvida sobre o painel, é por aqui que a equipe da GRATIA é avisada.</p>
          <button onClick={novo} className="ef-btn ef-btn-sec mt-6"><Plus size={16} /> Abrir o primeiro chamado</button>
        </section>
      ) : (
        <section>
          <h2 className="ef-h2 mb-3 border-b border-p-borda pb-2.5">Movimentação recente</h2>
          <Tabela lista={[...lista].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).slice(0, 6)} abrir={abrir} />
        </section>
      )}
    </div>
  );
}

// ─── Lista ──────────────────────────────────────────────────────────────────

function Tabela({ lista, abrir }: { lista: Chamado[]; abrir: (id: string) => void }) {
  const [filtro, setFiltro] = useState<"todos" | "abertos" | "fechados">("todos");
  const l = lista.filter((c) => filtro === "todos" || (filtro === "abertos" ? !fechado(c) && c.situacao !== "resolvido" : fechado(c) || c.situacao === "resolvido"));
  if (!lista.length) return <p className="py-10 text-center text-[14px] text-p-suave">Nenhum chamado.</p>;
  return (
    <div className="grid gap-3">
      {lista.length > 6 && (
        <div className="ef-chaves self-start">
          {([["todos", "Todos"], ["abertos", "Em andamento"], ["fechados", "Concluídos"]] as const).map(([v, r]) => <button key={v} aria-pressed={filtro === v} onClick={() => setFiltro(v)}>{r}</button>)}
        </div>
      )}
      <ul className="ef-peca">
        {l.map((c) => (
          <li key={c.id} className="border-b border-p-borda last:border-0">
            <button onClick={() => abrir(c.id)} className="grid w-full grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 text-left transition hover:bg-p-sutil">
              <span className="ef-num text-[13px] font-bold text-p-suave">nº {String(c.numero).padStart(3, "0")}</span>
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-bold text-p-texto">{c.titulo}</span>
                <span className="mt-0.5 block truncate text-[12.5px] text-p-suave">{CATEGORIA_ROTULO[c.categoria]} · {c.autor} · atualizado {relativo(c.atualizadoEm)}</span>
              </span>
              <Selo s={c.situacao} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Quadro de andamento ────────────────────────────────────────────────────

const COLUNAS: { titulo: string; situacoes: Situacao[] }[] = [
  { titulo: "Enviados", situacoes: ["aberto", "recebido"] },
  { titulo: "Em análise", situacoes: ["em_analise"] },
  { titulo: "Em atendimento", situacoes: ["em_desenvolvimento"] },
  { titulo: "Aguardando você", situacoes: ["aguardando_cliente"] },
  { titulo: "Concluídos", situacoes: ["resolvido", "encerrado"] },
];

function Quadro({ lista, abrir }: { lista: Chamado[]; abrir: (id: string) => void }) {
  return (
    <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-5">
      {COLUNAS.map((col) => {
        const itens = lista.filter((c) => col.situacoes.includes(c.situacao));
        return (
          <section key={col.titulo} className="min-w-[200px] border-t-[3px] border-p-acento bg-[color-mix(in_srgb,var(--p-sutil)_80%,transparent)]">
            <h3 className="flex items-center justify-between px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-p-texto-2">{col.titulo} <span className="ef-num text-p-suave">{itens.length}</span></h3>
            <ul className="grid gap-2 px-2 pb-2">
              {itens.map((c) => (
                <li key={c.id}>
                  <button onClick={() => abrir(c.id)} className="ef-peca block w-full px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-p-acento">
                    <span className="ef-num text-[11px] font-bold text-p-suave">nº {c.numero}{c.prioridade ? ` · ${PRIORIDADE_ROTULO[c.prioridade]}` : ""}</span>
                    <span className="mt-1 block text-[13.5px] font-semibold leading-snug text-p-texto">{c.titulo}</span>
                    <span className="mt-1.5 block text-[11.5px] text-p-suave">{relativo(c.atualizadoEm)}</span>
                  </button>
                </li>
              ))}
              {!itens.length && <li className="px-2 py-4 text-center text-[12px] text-p-suave">—</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ─── Detalhe: conversa do chamado ───────────────────────────────────────────

function Detalhe({ c, fotoDe, eu, fechar, atualizar }: { c: Chamado; fotoDe: (e: { autor: string; autorUsuario?: string }) => string | null; eu: string; fechar: () => void; atualizar: () => Promise<unknown> }) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const anexar = useAnexar();
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [c.eventos.length]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && fechar(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [fechar]);

  const enviar = async () => {
    setEnviando(true);
    try {
      await comentarChamado({ data: { id: c.id, texto, anexos: anexar.anexos } });
      setTexto("");
      anexar.setAnexos([]);
      await atualizar();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível enviar."); } finally { setEnviando(false); }
  };

  return (
    <div className="ef-janela-fundo fixed inset-0 z-50 flex justify-end" onClick={fechar}>
      <div className="flex h-full w-full max-w-[920px] flex-col bg-p-fundo shadow-2xl md:flex-row" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Chamado nº ${c.numero}`}>
        {/* conversa */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="ef-vidro flex items-start gap-3 border-t-[3px] border-p-acento px-5 py-4">
            <button onClick={fechar} className="mt-0.5 p-1 text-p-suave hover:text-p-texto" aria-label="Fechar"><ArrowLeft size={18} /></button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="ef-num text-[12px] font-bold text-p-suave">Chamado nº {String(c.numero).padStart(3, "0")}</span><Selo s={c.situacao} /></div>
              <h2 className="mt-1.5 text-[19px] font-bold leading-snug tracking-[-0.01em] text-p-texto">{c.titulo}</h2>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <article className="ef-peca ef-peca-filete px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar nome={c.autor} foto={fotoDe({ autor: c.autor, autorUsuario: c.autorUsuario })} tamanho={34} />
                <div><p className="text-[14px] font-bold text-p-texto">{c.autor}</p><p className="text-[12px] text-p-suave">abriu em {quando(c.criadoEm)}</p></div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-p-texto-2">{c.descricao}</p>
              {c.anexos.length > 0 && <div className="mt-3"><ListaAnexos anexos={c.anexos} /></div>}
            </article>
            <ol className="mt-5 grid gap-4">
              {c.eventos.filter((e) => e.tipo !== "abertura").map((e) => {
                if (e.tipo === "situacao" || e.tipo === "prioridade") {
                  return <li key={e.id} className="flex items-center gap-3 text-[12px] text-p-suave"><span className="h-px flex-1 bg-p-borda" /><span><strong className="font-semibold text-p-texto-2">{e.autor}</strong> · {e.conteudo} · {quando(e.em)}</span><span className="h-px flex-1 bg-p-borda" /></li>;
                }
                const meu = e.autorUsuario === eu;
                const equipe = !e.autorUsuario;
                return (
                  <li key={e.id} className={cn("flex gap-3", meu && "flex-row-reverse")}>
                    <Avatar nome={e.autor.replace(/ · Equipe GRATIA$/, "")} foto={fotoDe(e)} tamanho={32} />
                    <div className={cn("max-w-[78%] px-4 py-3", meu ? "bg-p-acento text-white" : equipe ? "ef-peca border-l-[3px] !border-l-p-acento" : "ef-peca")}>
                      <p className={cn("text-[12px] font-bold", meu ? "text-white/80" : "text-p-texto")}>{e.autor} <span className={cn("font-normal", meu ? "text-white/60" : "text-p-suave")}>· {quando(e.em)}</span></p>
                      {e.conteudo && <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed">{e.conteudo}</p>}
                      {e.anexos?.length ? <div className="mt-2"><ListaAnexos anexos={e.anexos} /></div> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
            <div ref={fim} />
          </div>
          {fechado(c) ? (
            <p className="border-t border-p-borda bg-p-superficie px-5 py-4 text-center text-[13.5px] text-p-suave">Chamado {c.situacao === "cancelado" ? "cancelado" : "encerrado"}: a conversa está fechada.</p>
          ) : (
            <div className="border-t border-p-borda bg-p-superficie px-4 py-3" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); anexar.soltar(e.dataTransfer.files); }}>
              {c.situacao === "aguardando_cliente" && <p className="mb-2 text-[12.5px] font-semibold text-red-700 dark:text-red-300">A equipe está aguardando a sua resposta.</p>}
              <ListaAnexos anexos={anexar.anexos} remover={(id) => anexar.setAnexos((a) => a.filter((x) => x.id !== id))} />
              <div className={cn("flex items-end gap-2", anexar.anexos.length && "mt-2")}>
                <button type="button" onClick={anexar.escolher} className="grid size-11 shrink-0 place-items-center border border-p-borda-forte text-p-suave transition hover:border-p-acento hover:text-p-acento" title="Anexar arquivo ou print" aria-label="Anexar">{anexar.lendo ? <Loader2 size={17} className="animate-spin" /> : <Paperclip size={17} />}</button>
                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} placeholder="Escreva uma mensagem para a equipe…" onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviar(); }} className="ef-campo !h-auto max-h-40 min-h-11 flex-1 resize-y py-2.5 !text-[14.5px]" />
                <button onClick={enviar} disabled={enviando || (!texto.trim() && !anexar.anexos.length)} className="ef-btn ef-btn-pri !h-11 !px-4" aria-label="Enviar">{enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
              </div>
              {anexar.input}
            </div>
          )}
        </div>
        {/* informações */}
        <aside className="shrink-0 border-t border-p-borda bg-p-superficie px-5 py-5 md:w-[280px] md:border-l md:border-t-0">
          <h3 className="ef-h2 !text-[11px] !text-p-suave">Informações</h3>
          <dl className="mt-3 grid gap-3 text-[13.5px]">
            {([
              ["Situação", SITUACAO_ROTULO[c.situacao]],
              ["Prioridade", c.prioridade ? PRIORIDADE_ROTULO[c.prioridade] : "Ainda não classificada"],
              ["Categoria", CATEGORIA_ROTULO[c.categoria]],
              ["Aberto por", c.autor],
              ["Aberto em", quando(c.criadoEm)],
              ["Atualizado", quando(c.atualizadoEm)],
              ...(c.resolvidoEm ? [["Concluído em", quando(c.resolvidoEm)]] : []),
              ...(c.canceladoEm ? [["Cancelado em", quando(c.canceladoEm)]] : []),
              ["No GRATIA HUB", c.externalId ?? (c.sincronizadoEm ? "Registrado" : "Aguardando envio")],
            ] as [string, string][]).map(([t, v]) => (
              <div key={t}><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-p-suave">{t}</dt><dd className="mt-0.5 font-semibold text-p-texto">{v}</dd></div>
            ))}
          </dl>
          {podeCancelar(c) && (
            <div className="mt-6 border-t border-p-borda pt-4">
              {!cancelando ? (
                <button onClick={() => setCancelando(true)} className="ef-btn ef-btn-perigo !px-0">Cancelar chamado</button>
              ) : (
                <div className="grid gap-2">
                  <p className="text-[13px] font-bold text-p-texto">Cancelar este chamado?</p>
                  <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Motivo (opcional)" className="ef-campo !h-auto py-2 !text-[13.5px]" />
                  <div className="flex gap-2">
                    <button onClick={async () => { try { await cancelarChamado({ data: { id: c.id, motivo } }); await atualizar(); setCancelando(false); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } }} className="ef-btn ef-btn-sec !h-9 !text-red-700">Cancelar</button>
                    <button onClick={() => setCancelando(false)} className="ef-btn ef-btn-fantasma !h-9">Voltar</button>
                  </div>
                </div>
              )}
              <p className="mt-2 text-[12px] text-p-suave">Só é possível cancelar antes de a equipe receber o chamado.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ─── Assistente de abertura (4 passos) ──────────────────────────────────────

const PASSOS = ["Assunto", "Descrição", "Anexos", "Confirmação"];
const CATEGORIAS = Object.keys(CATEGORIA_ROTULO) as Categoria[];

function Assistente({ usados, fechar, criado }: { usados: number; fechar: () => void; criado: (id: string) => void }) {
  const [passo, setPasso] = useState(0);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const anexar = useAnexar();
  const restantes = LIMITE_MENSAL - usados;
  const pode = passo === 0 ? !!categoria : passo === 1 ? titulo.trim().length >= 5 && descricao.trim().length >= 10 : true;

  const enviar = async () => {
    if (!categoria) return;
    setEnviando(true);
    try {
      const r = await abrirChamado({ data: { categoria, titulo, descricao, anexos: anexar.anexos } });
      toast.success(`Chamado nº ${r.numero} aberto. A equipe da GRATIA foi avisada.`);
      criado(r.id);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível abrir o chamado."); } finally { setEnviando(false); }
  };

  return (
    <div className="ef-janela-fundo fixed inset-0 z-50 grid place-items-center p-3 sm:p-6">
      <div className="ef-janela flex max-h-full w-full max-w-[760px] flex-col" role="dialog" aria-modal="true" aria-label="Abrir chamado">
        <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8">
          <div>
            <p className="ef-sobre">Novo chamado</p>
            <h2 className="mt-2.5 text-[22px] font-bold tracking-[-0.015em] text-p-texto">{PASSOS[passo]}</h2>
          </div>
          <button onClick={fechar} className="p-1 text-p-suave hover:text-p-texto" aria-label="Fechar"><X size={20} /></button>
        </header>
        <ol className="grid grid-cols-4 border-y border-p-borda">
          {PASSOS.map((p, i) => (
            <li key={p} className={cn("flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] sm:px-5", i === passo ? "bg-p-realce text-p-acento" : i < passo ? "text-p-texto-2" : "text-p-suave")}>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[10px]", i < passo ? "bg-p-acento text-white" : i === passo ? "border-2 border-p-acento" : "border border-p-borda-forte")}>{i < passo ? <Check size={11} strokeWidth={3} /> : i + 1}</span>
              <span className="hidden sm:inline">{p}</span>
            </li>
          ))}
        </ol>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {passo === 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {CATEGORIAS.map((cat) => (
                <button key={cat} type="button" onClick={() => setCategoria(cat)} className={cn("flex items-start gap-3 border px-4 py-3 text-left transition", categoria === cat ? "border-p-acento bg-p-realce" : "border-p-borda hover:border-p-borda-forte")}>
                  <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2", categoria === cat ? "border-p-acento" : "border-p-borda-forte")}>{categoria === cat && <span className="size-1.5 rounded-full bg-p-acento" />}</span>
                  <span><span className="block text-[14px] font-bold text-p-texto">{CATEGORIA_ROTULO[cat]}</span><span className="mt-0.5 block text-[12.5px] leading-snug text-p-suave">{CATEGORIA_DICA[cat]}</span></span>
                </button>
              ))}
            </div>
          )}
          {passo === 1 && (
            <div className="grid gap-5">
              <label className="grid gap-2"><span className="ef-rotulo">Assunto</span><span className="ef-dica !mt-0">Resuma o problema em uma frase.</span>
                <input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: A foto do evento não aparece no site" className="ef-campo" />
              </label>
              <label className="grid gap-2"><span className="ef-rotulo">O que aconteceu</span><span className="ef-dica !mt-0">Em que tela, o que você fez e o que esperava que acontecesse. Se o problema se repete, conte o passo a passo.</span>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={7} placeholder="Ex.: Em Eventos, coloquei a foto do congresso e cliquei em Publicar. No site, o evento aparece sem a foto, desde ontem." className="ef-campo" />
              </label>
            </div>
          )}
          {passo === 2 && (
            <div className="grid gap-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); anexar.soltar(e.dataTransfer.files); }}>
              <p className="text-[14px] text-p-texto-2">Um print da tela ajuda muito a equipe a entender o problema. Opcional — até 6 arquivos.</p>
              <button type="button" onClick={anexar.escolher} className="flex h-36 flex-col items-center justify-center gap-2 border border-dashed border-p-borda-forte text-p-suave transition hover:border-p-acento hover:text-p-acento">
                {anexar.lendo ? <Loader2 className="animate-spin" /> : <ImageIcon size={26} strokeWidth={1.6} />}
                <span className="text-[14px] font-semibold">Clique aqui ou arraste prints e arquivos</span>
                <span className="text-[12px]">Imagens, PDF, Word ou Excel · até 2,5 MB cada</span>
              </button>
              <ListaAnexos anexos={anexar.anexos} remover={(id) => anexar.setAnexos((a) => a.filter((x) => x.id !== id))} />
              {anexar.input}
            </div>
          )}
          {passo === 3 && categoria && (
            <div className="grid gap-4">
              <dl className="ef-peca divide-y divide-p-borda">
                {([["Assunto", CATEGORIA_ROTULO[categoria]], ["Título", titulo], ["Anexos", anexar.anexos.length ? `${anexar.anexos.length} arquivo(s)` : "Nenhum"]] as const).map(([t, v]) => (
                  <div key={t} className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3 text-[14px]"><dt className="font-semibold text-p-suave">{t}</dt><dd className="font-semibold text-p-texto">{v}</dd></div>
                ))}
                <div className="px-4 py-3"><p className="text-[14px] font-semibold text-p-suave">Descrição</p><p className="mt-1 whitespace-pre-wrap text-[14px] text-p-texto-2">{descricao}</p></div>
              </dl>
              <p className="flex items-start gap-2 text-[13px] text-p-suave"><CircleAlert size={15} className="mt-0.5 shrink-0" /> O chamado vai para a equipe da GRATIA pelo GRATIA HUB. Quem atende define a prioridade e responde por aqui.</p>
            </div>
          )}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-p-borda px-6 py-4 sm:px-8">
          <span className={cn("ef-num text-[12.5px] font-semibold", restantes <= 2 ? "text-amber-700 dark:text-amber-400" : "text-p-suave")}>{restantes > 0 ? `${restantes} de ${LIMITE_MENSAL} chamados disponíveis neste mês` : "Limite do mês atingido"}</span>
          <div className="flex gap-2">
            {passo > 0 && <button onClick={() => setPasso(passo - 1)} className="ef-btn ef-btn-fantasma"><ArrowLeft size={15} /> Voltar</button>}
            {passo < PASSOS.length - 1 ? (
              <button disabled={!pode} onClick={() => setPasso(passo + 1)} className="ef-btn ef-btn-pri">Continuar <ArrowRight size={15} /></button>
            ) : (
              <button disabled={enviando || restantes <= 0} onClick={enviar} className="ef-btn ef-btn-pri">{enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Abrir chamado</button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

