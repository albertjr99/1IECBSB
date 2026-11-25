import { useCallback, useEffect, useState } from "react";
import {
  Smartphone,
  ArrowLeft, CalendarClock, Check, ClipboardCopy, Clock, Loader2, Lock, Pencil, Play, Plus, Printer, RefreshCw, Square, Trash2, Users, Vote,
} from "lucide-react";
import { toast } from "sonner";
import { acaoVotacao, listarVotacoesPainel, membrosParaVotar, obterVotacaoPainel, salvarVotacao } from "@/lib/api-votacao";
import {
  opcoesDa, SIGILO_DESC, SIGILO_ROTULO, situacaoDa, SITUACAO_ROTULO, TIPO_ROTULO,
  type Resultado, type Sigilo, type Situacao, type TipoVotacao, type Votacao,
} from "@/lib/votacao";
import { cn, linkWhatsapp } from "@/lib/utils";
import { IconeWhatsapp } from "@/components/site/Icones";
import { Campo, Grade, Interruptor, Secao, Selecao } from "../kit";
import { dataHora, isoParaLocal, localParaIso } from "@/lib/datas";

type Tela = { tipo: "lista" } | { tipo: "form"; id?: string } | { tipo: "detalhe"; id: string };

export function ModuloVotacao() {
  const [tela, setTela] = useState<Tela>({ tipo: "lista" });
  if (tela.tipo === "form") return <FormVotacao id={tela.id} aoSair={(id) => setTela(id ? { tipo: "detalhe", id } : { tipo: "lista" })} />;
  if (tela.tipo === "detalhe") return <DetalheVotacao id={tela.id} aoVoltar={() => setTela({ tipo: "lista" })} aoEditar={() => setTela({ tipo: "form", id: tela.id })} />;
  return <ListaVotacoes aoAbrir={(id) => setTela({ tipo: "detalhe", id })} aoNova={() => setTela({ tipo: "form" })} />;
}

const COR_SITUACAO: Record<Situacao, string> = {
  rascunho: "bg-p-hover text-p-texto-2",
  agendada: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  em_andamento: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  encerrada: "bg-p-texto text-p-superficie",
};

const quando = (iso: string) => dataHora(iso);

// ─── Lista ──────────────────────────────────────────────────────────────────

function ListaVotacoes({ aoAbrir, aoNova }: { aoAbrir: (id: string) => void; aoNova: () => void }) {
  const [lista, setLista] = useState<Awaited<ReturnType<typeof listarVotacoesPainel>> | null>(null);
  useEffect(() => { listarVotacoesPainel().then(setLista).catch((e) => toast.error(e.message)); }, []);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-p-suave">Cada votante recebe um link próprio, que vale para um único voto.</p>
        <button onClick={aoNova} className="ef-btn ef-btn-pri "><Plus size={16} /> Nova votação</button>
      </div>
      {!lista ? <Loader2 className="mx-auto animate-spin text-p-suave" /> : lista.length === 0 ? (
        <div className="border border-dashed border-p-borda-forte bg-p-superficie p-10 text-center">
          <Vote className="mx-auto text-p-acento" size={34} />
          <p className="mt-3 font-semibold">Nenhuma votação ainda</p>
          <p className="mt-1 text-[13.5px] text-p-suave">Crie uma votação para assembleias, eleições de oficiais, aprovação de contas e decisões da igreja.</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {lista.map((v) => {
            const sit = situacaoDa(v);
            const pct = v.eleitores.length ? Math.round((v.votaram / v.eleitores.length) * 100) : 0;
            return (
              <li key={v.id}>
                <button onClick={() => aoAbrir(v.id)} className="flex w-full flex-wrap items-center gap-4 ef-peca p-4 text-left hover:border-p-acento/50 hover:shadow-sm">
                  <span className="grid size-11 shrink-0 place-items-center rounded-md bg-p-realce text-p-acento"><Vote size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{v.titulo}</span>
                    <span className="block text-[12.5px] text-p-suave">{quando(v.inicio)} → {quando(v.encerradaEm ?? v.fim)} · {SIGILO_ROTULO[v.sigilo]}</span>
                  </span>
                  <span className="w-36">
                    <span className="flex justify-between text-[12px] text-p-suave"><span>{v.votaram}/{v.eleitores.length} votos</span><span>{pct}%</span></span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-p-hover"><span className="block h-full rounded-full bg-marca" style={{ width: `${pct}%` }} /></span>
                  </span>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-bold", COR_SITUACAO[sit])}>{SITUACAO_ROTULO[sit]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Formulário ─────────────────────────────────────────────────────────────

const paraLocal = isoParaLocal; // campos em horário de Brasília

type FormEleitor = { id?: string; nome: string; contato: string; membroId?: string };

function FormVotacao({ id, aoSair }: { id?: string; aoSair: (id?: string) => void }) {
  const agora = new Date();
  const [f, setF] = useState({
    titulo: "", descricao: "", tipo: "favor_contra_abstencao" as TipoVotacao, opcoes: [{ id: "o1", texto: "" }, { id: "o2", texto: "" }],
    sigilo: "secreta" as Sigilo, inicio: paraLocal(agora.toISOString()), fim: paraLocal(new Date(agora.getTime() + 2 * 3600_000).toISOString()),
    quorum: 0, encerrarQuandoTodosVotarem: true,
  });
  const [eleitores, setEleitores] = useState<FormEleitor[]>([]);
  const [colar, setColar] = useState("");
  const [carregando, setCarregando] = useState(!!id);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    obterVotacaoPainel({ data: { id } }).then(({ votacao: v }) => {
      setF({
        titulo: v.titulo, descricao: v.descricao, tipo: v.tipo, opcoes: v.opcoes.length ? v.opcoes : [{ id: "o1", texto: "" }, { id: "o2", texto: "" }],
        sigilo: v.sigilo, inicio: paraLocal(v.inicio), fim: paraLocal(v.fim), quorum: v.quorum, encerrarQuandoTodosVotarem: v.encerrarQuandoTodosVotarem,
      });
      setEleitores(v.eleitores.map((e) => ({ id: e.id, nome: e.nome, contato: e.contato, ...(e.membroId ? { membroId: e.membroId } : {}) })));
      setCarregando(false);
    }).catch((e) => { toast.error(e.message); aoSair(); });
  }, [id]);

  const incluirColados = () => {
    const novos = colar.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [nome, ...resto] = l.split(/[;,\t]/);
      return { nome: (nome ?? "").trim(), contato: resto.join(" ").trim() };
    }).filter((e) => e.nome);
    setEleitores((a) => [...a, ...novos]);
    setColar("");
    toast.success(`${novos.length} votante(s) incluído(s).`);
  };

  const salvar = async (abrir: boolean) => {
    setSalvando(true);
    try {
      const r = await salvarVotacao({
        data: {
          ...(id ? { id } : {}),
          ...f,
          opcoes: f.opcoes.map((o, i) => ({ id: o.id || `o${i + 1}`, texto: o.texto })),
          inicio: localParaIso(f.inicio),
          fim: localParaIso(f.fim),
          rascunho: !abrir,
          eleitores,
        },
      });
      toast.success(abrir ? "Votação salva e liberada." : "Rascunho salvo.");
      aoSair(r.id);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar."); } finally { setSalvando(false); }
  };

  if (carregando) return <Loader2 className="mx-auto animate-spin text-p-suave" />;

  return (
    <div className="grid gap-5">
      <button onClick={() => aoSair(id)} className="inline-flex items-center gap-1.5 justify-self-start text-[13px] font-semibold text-p-texto-2 hover:text-p-acento"><ArrowLeft size={15} /> Voltar</button>
      <Secao titulo="Pauta">
        <Campo rotulo="Título" valor={f.titulo} onChange={(v) => setF({ ...f, titulo: v })} placeholder="Ex.: Aprovação das contas de 2026" />
        <Campo rotulo="Descrição (o que está sendo votado)" valor={f.descricao} multilinha linhas={4} onChange={(v) => setF({ ...f, descricao: v })} />
      </Secao>
      <Secao titulo="Forma de votar">
        <Selecao<TipoVotacao> rotulo="Tipo" valor={f.tipo} onChange={(v) => setF({ ...f, tipo: v })} opcoes={(Object.keys(TIPO_ROTULO) as TipoVotacao[]).map((k) => ({ valor: k, rotulo: TIPO_ROTULO[k] }))} />
        {f.tipo === "personalizada" && (
          <div className="grid gap-2">
            <span className="text-[13px] font-semibold text-p-texto-2">Opções</span>
            {f.opcoes.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o.texto} placeholder={`Opção ${i + 1} (ex.: nome do candidato)`} onChange={(e) => setF({ ...f, opcoes: f.opcoes.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} className="flex-1 rounded-md border border-p-borda-forte px-3.5 py-2.5 text-[14.5px] outline-none focus:border-p-acento" />
                <button disabled={f.opcoes.length <= 2} onClick={() => setF({ ...f, opcoes: f.opcoes.filter((_, j) => j !== i) })} className="rounded-lg px-2 text-p-suave hover:text-red-600 dark:text-red-400 disabled:opacity-30"><Trash2 size={16} /></button>
              </div>
            ))}
            <button onClick={() => setF({ ...f, opcoes: [...f.opcoes, { id: `o${Date.now().toString(36)}`, texto: "" }] })} className="justify-self-start text-[13px] font-semibold text-p-acento hover:underline">+ Adicionar opção</button>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(SIGILO_ROTULO) as Sigilo[]).map((s) => (
            <button key={s} type="button" onClick={() => setF({ ...f, sigilo: s })} className={cn("rounded-md border p-3 text-left", f.sigilo === s ? "border-p-acento bg-p-realce" : "border-p-borda hover:border-p-borda-forte")}>
              <span className="flex items-center gap-1.5 text-[13.5px] font-bold">{s === "secreta" && <Lock size={13} />}{SIGILO_ROTULO[s]}</span>
              <span className="mt-1 block text-[12px] leading-snug text-p-suave">{SIGILO_DESC[s]}</span>
            </button>
          ))}
        </div>
      </Secao>
      <Secao titulo="Prazo e quórum">
        <Grade>
          <Campo rotulo="Início" tipo="datetime-local" valor={f.inicio} onChange={(v) => setF({ ...f, inicio: v })} />
          <Campo rotulo="Término" tipo="datetime-local" valor={f.fim} onChange={(v) => setF({ ...f, fim: v })} />
          <Campo rotulo="Quórum mínimo (nº de votos)" tipo="number" valor={String(f.quorum)} onChange={(v) => setF({ ...f, quorum: Number(v) || 0 })} dica="0 = sem quórum mínimo." />
        </Grade>
        <Interruptor rotulo="Encerrar quando todos votarem" valor={f.encerrarQuandoTodosVotarem} onChange={(v) => setF({ ...f, encerrarQuandoTodosVotarem: v })} />
      </Secao>
      <Secao titulo={`Votantes (${eleitores.length})`} descricao="Quem pode votar. Cada pessoa recebe um link próprio. O contato (WhatsApp) é opcional e serve para enviar o link.">
        <div className="grid gap-2">
          <textarea value={colar} onChange={(e) => setColar(e.target.value)} rows={4} placeholder={"Cole uma lista, uma pessoa por linha:\nMaria da Silva; (61) 99999-0000\nJoão Pereira"} className="rounded-md border border-p-borda-forte px-3.5 py-2.5 text-[14px] outline-none focus:border-p-acento" />
          <div className="flex flex-wrap gap-2">
            <button disabled={!colar.trim()} onClick={incluirColados} className="ef-btn ef-btn-sec !py-2"><Users size={15} /> Incluir lista</button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const ms = await membrosParaVotar();
                  const ja = new Set(eleitores.map((e) => e.membroId).filter(Boolean));
                  const novos = ms.filter((m) => !ja.has(m.id)).map((m) => ({ nome: m.nome, contato: m.celular, membroId: m.id }));
                  setEleitores([...eleitores, ...novos]);
                  toast.success(novos.length ? `${novos.length} membro(s) do aplicativo incluídos. Eles votam pelo app, já identificados.` : "Todos os membros do aplicativo já estão na lista.");
                } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
              }}
              className="ef-btn ef-btn-sec !py-2"
            ><Smartphone size={15} /> Incluir membros do aplicativo</button>
          </div>
        </div>
        {eleitores.length > 0 && (
          <div className="grid gap-1.5">
            {eleitores.map((e, i) => (
              <div key={e.id ?? i} className="flex gap-2">
                <input value={e.nome} onChange={(x) => setEleitores(eleitores.map((y, j) => (j === i ? { ...y, nome: x.target.value } : y)))} className="flex-1 rounded-lg border border-p-borda-forte px-3 py-2 text-[14px]" />
                {e.membroId && <span className="hidden items-center gap-1 self-center whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.1em] text-p-acento sm:inline-flex" title="Vota pelo aplicativo"><Smartphone size={12} /> App</span>}
                <input value={e.contato} placeholder="WhatsApp" onChange={(x) => setEleitores(eleitores.map((y, j) => (j === i ? { ...y, contato: x.target.value } : y)))} className="w-44 rounded-lg border border-p-borda-forte px-3 py-2 text-[14px]" />
                <button onClick={() => setEleitores(eleitores.filter((_, j) => j !== i))} className="rounded-lg px-2 text-p-suave hover:text-red-600 dark:text-red-400"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setEleitores([...eleitores, { nome: "", contato: "" }])} className="justify-self-start text-[13px] font-semibold text-p-acento hover:underline">+ Adicionar votante</button>
      </Secao>
      <div className="flex flex-wrap justify-end gap-2">
        <button disabled={salvando} onClick={() => salvar(false)} className="ef-btn ef-btn-sec ">Salvar rascunho</button>
        <button disabled={salvando} onClick={() => salvar(true)} className="btn-destaque !h-9 !px-3.5 !text-[13.5px] ">{salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar e liberar</button>
      </div>
    </div>
  );
}

// ─── Detalhe ────────────────────────────────────────────────────────────────

function DetalheVotacao({ id, aoVoltar, aoEditar }: { id: string; aoVoltar: () => void; aoEditar: () => void }) {
  const [d, setD] = useState<{ votacao: Votacao; resultado: Resultado & { oculto: boolean } } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const carregar = useCallback(() => obterVotacaoPainel({ data: { id } }).then(setD).catch((e) => toast.error(e.message)), [id]);
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 15_000);
    return () => clearInterval(t);
  }, [carregar]);

  if (!d) return <Loader2 className="mx-auto animate-spin text-p-suave" />;
  const { votacao: v, resultado: r } = d;
  const sit = situacaoDa(v);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const linkDe = (token: string) => `${base}/votar/${token}`;
  const votou = new Map(r.presenca.map((p) => [p.eleitorId, p.em]));
  const pct = r.totalEleitores ? Math.round((r.votaram / r.totalEleitores) * 100) : 0;
  const maior = Math.max(1, ...r.contagem.map((c) => c.votos));

  const agir = async (acao: "abrir" | "encerrar" | "reabrir" | "excluir") => {
    const msgs = { abrir: "Liberar a votação agora?", encerrar: "Encerrar a votação agora? Ninguém mais poderá votar.", reabrir: "Reabrir a votação?", excluir: "Excluir a votação e todos os votos? Esta ação não pode ser desfeita." };
    if (!confirm(msgs[acao])) return;
    setOcupado(true);
    try { await acaoVotacao({ data: { id, acao } }); if (acao === "excluir") aoVoltar(); else await carregar(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } finally { setOcupado(false); }
  };

  const mensagem = (nome: string, token: string) =>
    `Olá, ${nome.split(" ")[0]}! Você está convidado(a) a votar: *${v.titulo}*.\nSeu link pessoal (vale um voto): ${linkDe(token)}`;

  return (
    <div className="grid gap-5" id="area-votacao">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button onClick={aoVoltar} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-p-texto-2 hover:text-p-acento"><ArrowLeft size={15} /> Votações</button>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={carregar} className="rounded-lg p-2 text-p-suave hover:bg-p-superficie" title="Atualizar"><RefreshCw size={16} /></button>
          {sit !== "encerrada" && <button onClick={aoEditar} className="ef-btn ef-btn-sec "><Pencil size={15} /> Editar</button>}
          {(sit === "rascunho" || sit === "agendada") && <button disabled={ocupado} onClick={() => agir("abrir")} className="ef-btn ef-btn-pri "><Play size={15} /> Liberar agora</button>}
          {sit === "em_andamento" && <button disabled={ocupado} onClick={() => agir("encerrar")} className="btn-destaque !h-9 !px-3.5 !text-[13.5px] "><Square size={15} /> Encerrar</button>}
          {sit === "encerrada" && new Date(v.fim) > new Date() && <button disabled={ocupado} onClick={() => agir("reabrir")} className="ef-btn ef-btn-sec ">Reabrir</button>}
          <button onClick={() => window.print()} className="ef-btn ef-btn-sec "><Printer size={15} /> Imprimir ata</button>
          <button disabled={ocupado} onClick={() => agir("excluir")} className="rounded-lg p-2 text-p-suave hover:bg-red-500/10 hover:text-red-600 dark:text-red-400" title="Excluir"><Trash2 size={16} /></button>
        </div>
      </div>

      <section className="ef-peca p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className={cn("inline-block rounded-full px-2.5 py-1 text-[11.5px] font-bold", COR_SITUACAO[sit])}>{SITUACAO_ROTULO[sit]}</span>
            <h2 className="mt-2 text-2xl font-bold">{v.titulo}</h2>
            {v.descricao && <p className="mt-2 max-w-2xl whitespace-pre-line text-[14.5px] text-p-texto-2">{v.descricao}</p>}
          </div>
        </div>
        <div className="mt-5 grid gap-3 text-[13px] text-p-texto-2 sm:grid-cols-3">
          <span className="flex items-center gap-2"><CalendarClock size={15} className="text-p-acento" /> {quando(v.inicio)} → {quando(v.encerradaEm ?? v.fim)}</span>
          <span className="flex items-center gap-2"><Lock size={15} className="text-p-acento" /> {SIGILO_ROTULO[v.sigilo]} · {TIPO_ROTULO[v.tipo]}</span>
          <span className="flex items-center gap-2"><Users size={15} className="text-p-acento" /> Quórum: {v.quorum ? `${v.quorum} votos ${r.quorumAtingido ? "(atingido)" : "(não atingido)"}` : "sem mínimo"}</span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="ef-peca p-6">
          <h3 className="font-bold">{sit === "encerrada" ? "Resultado" : "Apuração parcial"}</h3>
          <div className="mt-3">
            <div className="flex justify-between text-[13px] text-p-suave"><span>Participação: {r.votaram} de {r.totalEleitores}</span><span>{pct}%</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-p-hover"><div className="h-full rounded-full bg-marca transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
          {r.oculto && (
            <p className="mt-6 flex items-start gap-2 rounded-md bg-p-sutil p-4 text-[13.5px] text-p-texto-2">
              <Lock size={16} className="mt-0.5 shrink-0 text-p-acento" />
              Voto secreto: a apuração aparece quando a votação for encerrada. Antes disso, só a participação é exibida — para que ninguém deduza o voto de quem já votou.
            </p>
          )}
          <ul className={cn("mt-6 grid gap-3", r.oculto && "hidden")}>
            {r.contagem.map((c) => {
              const p = r.votaram ? Math.round((c.votos / r.votaram) * 100) : 0;
              const vencedor = sit === "encerrada" && c.votos === maior && c.votos > 0;
              return (
                <li key={c.id}>
                  <div className="flex justify-between text-[14px]"><span className={cn("font-semibold", vencedor && "text-emerald-700 dark:text-emerald-400")}>{c.texto}{vencedor && " ✓"}</span><span className="text-p-texto-2">{c.votos} · {p}%</span></div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-p-hover"><div className={cn("h-full rounded-full transition-all", vencedor ? "bg-emerald-600" : "bg-marca")} style={{ width: `${(c.votos / maior) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
          {r.nominal && r.nominal.length > 0 && (
            <div className="mt-6 border-t border-p-borda pt-4">
              <h4 className="text-[13px] font-bold text-p-texto-2">Votos identificados</h4>
              <ul className="mt-2 grid gap-1 text-[13px]">
                {r.nominal.map((n, i) => <li key={i} className="flex justify-between"><span>{n.nome}</span><span className="font-semibold">{n.opcao}</span></li>)}
              </ul>
            </div>
          )}
          {v.sigilo === "secreta" && <p className="mt-5 flex items-center gap-1.5 text-[12px] text-p-suave"><Lock size={12} /> Voto secreto: o sistema não guarda quem votou em quê.</p>}
        </section>

        <section className="ef-peca p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">Votantes e links</h3>
            <button
              onClick={() => navigator.clipboard?.writeText(v.eleitores.map((e) => `${e.nome}: ${linkDe(e.token)}`).join("\n")).then(() => toast.success("Links copiados."))}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-p-acento hover:bg-p-realce print:hidden"
            ><ClipboardCopy size={14} /> Copiar todos</button>
          </div>
          <ul className="mt-3 divide-y divide-p-borda">
            {v.eleitores.map((e) => {
              const em = votou.get(e.id);
              const zap = e.contato ? linkWhatsapp(e.contato, mensagem(e.nome, e.token)) : "";
              return (
                <li key={e.id} className="flex items-center gap-2 py-2.5">
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", em ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-p-hover text-p-suave")}>{em ? <Check size={14} /> : <Clock size={14} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{e.nome}</span>
                    <span className="block text-[12px] text-p-suave">{em ? `Votou em ${quando(em)}` : "Ainda não votou"}</span>
                  </span>
                  <span className="flex shrink-0 gap-0.5 print:hidden">
                    <button title="Copiar link" onClick={() => navigator.clipboard?.writeText(linkDe(e.token)).then(() => toast.success(`Link de ${e.nome.split(" ")[0]} copiado.`))} className="rounded-lg p-2 text-p-suave hover:bg-p-hover"><ClipboardCopy size={15} /></button>
                    {zap ? (
                      <a title="Enviar pelo WhatsApp" href={zap} target="_blank" rel="noopener" className="rounded-lg p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"><IconeWhatsapp size={16} /></a>
                    ) : (
                      <a title="Enviar pelo WhatsApp (escolher contato)" href={`https://wa.me/?text=${encodeURIComponent(mensagem(e.nome, e.token))}`} target="_blank" rel="noopener" className="rounded-lg p-2 text-p-suave hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-400"><IconeWhatsapp size={16} /></a>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="ef-peca p-6">
        <h3 className="font-bold">Histórico</h3>
        <ul className="mt-3 grid gap-1.5 text-[13px] text-p-texto-2">
          {[...v.historico].reverse().map((h, i) => <li key={i}><span className="text-p-suave">{quando(h.em)}</span> — <strong className="text-p-texto">{h.autor}</strong>: {h.acao}</li>)}
        </ul>
        <p className="mt-4 text-[12px] text-p-suave">Opções: {opcoesDa(v).map((o) => o.texto).join(" · ")}</p>
      </section>
    </div>
  );
}
