/**
 * Painel → Ministérios e escalas. A secretaria cria os ministérios, as funções
 * e define quem lidera; a liderança monta as escalas pelo app (celular ou site).
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarCheck, Crown, FlaskConical, Loader2, Music, Pencil, Plus, Search, Smartphone, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { excluirMinisterioPainel, exemplosPainel, ministeriosPainel, salvarMinisterioPainel } from "@/lib/api-escalas";
import { ICONES_MINISTERIO, MODELOS_MINISTERIO, type MinisterioApp } from "@/lib/escalas";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { Camada } from "./Camada";
import { Campo, Grade, Interruptor } from "./kit";
import { IconeMinisterio } from "@/components/escalas/icones";

type Dados = Awaited<ReturnType<typeof ministeriosPainel>>;
type Form = Omit<MinisterioApp, "id" | "criadoEm"> & { id?: string };

const idTemp = () => `novo-${Math.random().toString(36).slice(2, 8)}`;

export function ModuloEscalas() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const carregar = () => ministeriosPainel().then(setDados).catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, []);
  const nomes = useMemo(() => Object.fromEntries((dados?.membros ?? []).map((m) => [m.id, m.nome])), [dados]);

  const novo = (chave: string) => {
    const mo = MODELOS_MINISTERIO.find((x) => x.chave === chave)!;
    setEscolhendo(false);
    setForm({ nome: mo.chave === "vazio" ? "" : mo.nome, descricao: mo.descricao, icone: mo.icone, repertorio: mo.repertorio, funcoes: mo.funcoes.map((nome) => ({ id: idTemp(), nome })), membros: [] });
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-7 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[68ch]">
          <p className="ef-sobre">Igreja</p>
          <h1 className="ef-titulo mt-2.5">Ministérios e escalas</h1>
          <p className="ef-sub mt-1.5">Crie os ministérios, as funções de cada um e quem serve neles. Quem você marcar como <strong>líder</strong> monta, publica e repete as escalas pelo aplicativo, no celular ou no site, e cada escalado confirma por lá.</p>
        </div>
        <button onClick={() => setEscolhendo(true)} className="ef-btn ef-btn-pri !h-12"><Plus size={17} /> Novo ministério</button>
      </header>

      <section className="ef-peca ef-peca-filete grid gap-1.5 px-6 py-5 text-[14px] text-p-suave">
        <p className="ef-h2 !text-p-texto">Como funciona</p>
        <p>1. Aqui no painel: crie o ministério, inclua as pessoas (membros já aprovados no app) com as funções delas e marque a liderança.</p>
        <p>2. No app, a liderança abre <strong className="text-p-texto">Participar → Escalas</strong>, monta a escala (ou uma repetição semanal/mensal) e publica.</p>
        <p>3. Cada escalado recebe a notificação, confirma ou avisa que não poderá, e é lembrado na véspera.</p>
      </section>

      <Exemplos aoMudar={carregar} />

      {!dados ? <Loader2 className="mx-auto animate-spin text-p-suave" /> : dados.ministerios.length === 0 ? (
        <p className="border border-dashed border-p-borda-forte px-6 py-12 text-center text-[14.5px] text-p-suave">Nenhum ministério ainda. Comece por “Novo ministério” — há modelos prontos para Louvor, Multimídia, Recepção e outros.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {dados.ministerios.map((m) => {
            const lideres = m.membros.filter((x) => x.lider);
            return (
              <li key={m.id} className="ef-peca grid gap-4 p-5">
                <div className="flex items-start gap-3.5">
                  <span className="grid size-11 shrink-0 place-items-center bg-marca text-white"><IconeMinisterio chave={m.icone} size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-bold text-p-texto">{m.nome}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12.5px] text-p-suave">
                      <span className="inline-flex items-center gap-1"><Users size={13} /> {m.membros.length} {m.membros.length === 1 ? "pessoa" : "pessoas"}</span>
                      <span>{m.funcoes.length} funções</span>
                      <span className="inline-flex items-center gap-1"><CalendarCheck size={13} /> {m.proximas} {m.proximas === 1 ? "escala publicada" : "escalas publicadas"}</span>
                      {m.repertorio && <span className="inline-flex items-center gap-1"><Music size={13} /> repertório</span>}
                    </p>
                  </div>
                  <button onClick={() => setForm({ id: m.id, nome: m.nome, descricao: m.descricao, icone: m.icone, repertorio: m.repertorio, funcoes: m.funcoes.map((f) => ({ ...f })), membros: m.membros.map((x) => ({ ...x, funcoes: [...x.funcoes] })) })} className="ef-btn ef-btn-sec !h-9"><Pencil size={14} /> Editar</button>
                </div>
                <p className="text-[13.5px] text-p-suave">
                  <Crown size={13} className="mr-1 inline text-destaque" />
                  {lideres.length ? <>Liderança: <span className="font-semibold text-p-texto">{lideres.map((x) => nomes[x.membroId] ?? "—").join(", ")}</span></> : <span className="text-red-700">Sem liderança: ninguém consegue montar as escalas ainda.</span>}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {escolhendo && (
        <Camada>
          <div className="ef-janela-fundo fixed inset-0 z-50 grid place-items-center p-4" onClick={() => setEscolhendo(false)}>
            <div onClick={(e) => e.stopPropagation()} className="ef-janela grid w-full max-w-[640px] gap-5 p-7">
              <div className="flex items-start justify-between"><div><p className="ef-sobre">Novo ministério</p><h2 className="mt-2.5 text-[21px] font-bold text-p-texto">Comece por um modelo</h2><p className="mt-1 text-[13.5px] text-p-suave">As funções vêm prontas; você ajusta depois.</p></div><button onClick={() => setEscolhendo(false)} className="p-1 text-p-suave" aria-label="Fechar"><X size={18} /></button></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {MODELOS_MINISTERIO.map((mo) => (
                  <button key={mo.chave} onClick={() => novo(mo.chave)} className="flex items-start gap-3 border border-p-borda-forte p-3.5 text-left transition hover:border-p-acento hover:bg-p-sutil">
                    <span className="grid size-9 shrink-0 place-items-center bg-p-sutil text-marca"><IconeMinisterio chave={mo.icone} size={17} /></span>
                    <span className="min-w-0"><span className="block text-[14.5px] font-bold text-p-texto">{mo.nome}</span><span className="mt-0.5 block text-[12.5px] leading-snug text-p-suave">{mo.funcoes.length ? mo.funcoes.join(", ") : "Do zero, com as suas funções"}</span></span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Camada>
      )}

      {form && dados && <EditorMinisterio form={form} setForm={setForm} membros={dados.membros} aoSalvar={() => { setForm(null); carregar(); }} />}
    </div>
  );
}

function EditorMinisterio({ form, setForm, membros, aoSalvar }: { form: Form; setForm: (f: Form | null) => void; membros: { id: string; nome: string }[]; aoSalvar: () => void }) {
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const nomes = Object.fromEntries(membros.map((m) => [m.id, m.nome]));
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const fora = membros.filter((m) => !form.membros.some((x) => x.membroId === m.id) && (!busca || norm(m.nome).includes(norm(busca)))).slice(0, 8);
  const mudar = (fn: (f: Form) => void) => { const c = structuredClone(form); fn(c); setForm(c); };

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarMinisterioPainel({ data: form });
      toast.success("Ministério salvo.");
      aoSalvar();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } finally { setSalvando(false); }
  };

  return (
    <Camada>
      <div className="ef-janela-fundo fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4" onClick={() => setForm(null)}>
        <div onClick={(e) => e.stopPropagation()} className="ef-janela my-8 grid w-full max-w-[860px] gap-6 p-7">
          <div className="flex items-start justify-between">
            <div><p className="ef-sobre">Ministério</p><h2 className="mt-2.5 text-[21px] font-bold text-p-texto">{form.id ? form.nome || "Editar" : "Novo ministério"}</h2></div>
            <button onClick={() => setForm(null)} className="p-1 text-p-suave" aria-label="Fechar"><X size={18} /></button>
          </div>

          <Grade>
            <Campo rotulo="Nome" valor={form.nome} onChange={(v) => mudar((f) => { f.nome = v; })} placeholder="Ex.: Louvor" />
            <Campo rotulo="Descrição (opcional)" valor={form.descricao ?? ""} onChange={(v) => mudar((f) => { f.descricao = v; })} />
          </Grade>
          <div className="grid gap-2">
            <p className="text-[13px] font-semibold text-p-texto">Ícone</p>
            <div className="flex flex-wrap gap-1.5">
              {ICONES_MINISTERIO.map((i) => (
                <button key={i} aria-pressed={form.icone === i} onClick={() => mudar((f) => { f.icone = i; })} className={cn("grid size-10 place-items-center border transition", form.icone === i ? "border-marca bg-marca text-white" : "border-p-borda-forte text-p-texto-2 hover:border-p-acento")}><IconeMinisterio chave={i} size={17} /></button>
              ))}
            </div>
          </div>
          <Interruptor rotulo="Escalas com músicas (repertório)" dica="Para o louvor: cada escala tem a lista de músicas, com o hinário, o tom e links." valor={form.repertorio} onChange={(v) => mudar((f) => { f.repertorio = v; })} />

          <section className="grid gap-3">
            <div className="flex items-end justify-between gap-3">
              <div><p className="ef-h2">Funções</p><p className="mt-0.5 text-[13px] text-p-suave">Os papéis que alguém pode ter numa escala. A ordem aqui é a ordem na escala.</p></div>
              <button onClick={() => mudar((f) => { f.funcoes.push({ id: idTemp(), nome: "" }); })} className="ef-btn ef-btn-sec !h-9"><Plus size={14} /> Função</button>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {form.funcoes.map((fn, i) => (
                <li key={fn.id} className="flex items-center gap-1">
                  <input value={fn.nome} onChange={(e) => mudar((f) => { f.funcoes[i]!.nome = e.target.value; })} placeholder="Nome da função" className="ef-campo !h-10 flex-1 !text-[14px]" autoFocus={!fn.nome} />
                  <button disabled={i === 0} onClick={() => mudar((f) => { const [x] = f.funcoes.splice(i, 1); f.funcoes.splice(i - 1, 0, x!); })} className="ef-btn ef-btn-fantasma !h-10 !px-2 disabled:opacity-30" aria-label="Subir"><ArrowUp size={14} /></button>
                  <button disabled={i === form.funcoes.length - 1} onClick={() => mudar((f) => { const [x] = f.funcoes.splice(i, 1); f.funcoes.splice(i + 1, 0, x!); })} className="ef-btn ef-btn-fantasma !h-10 !px-2 disabled:opacity-30" aria-label="Descer"><ArrowDown size={14} /></button>
                  <button onClick={() => mudar((f) => { f.funcoes.splice(i, 1); f.membros.forEach((x) => { x.funcoes = x.funcoes.filter((y) => y !== fn.id); }); })} className="ef-btn ef-btn-perigo" aria-label="Remover função"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3">
            <div><p className="ef-h2">Quem serve · {form.membros.length}</p><p className="mt-0.5 text-[13px] text-p-suave">Marque as funções de cada pessoa e a coroa para a liderança. Só aparecem membros já aprovados no aplicativo.</p></div>
            <label className="relative max-w-[360px]">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-p-suave" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Incluir pessoa: digite o nome" className="ef-campo !h-10 pl-9 !text-[14px]" />
            </label>
            {busca && (
              <div className="flex flex-wrap gap-1.5">
                {fora.length ? fora.map((m) => (
                  <button key={m.id} onClick={() => { mudar((f) => { f.membros.push({ membroId: m.id, funcoes: [] }); }); setBusca(""); }} className="inline-flex items-center gap-2 border border-p-borda-forte px-3 py-1.5 text-[13.5px] hover:border-p-acento"><Plus size={13} /> {m.nome}</button>
                )) : <p className="text-[13px] text-p-suave">Ninguém encontrado. A pessoa precisa ter cadastro aprovado em “Membros do app”.</p>}
              </div>
            )}
            {form.membros.length === 0 ? <p className="border border-dashed border-p-borda-forte px-5 py-6 text-center text-[13.5px] text-p-suave">Ninguém ainda.</p> : (
              <ul className="ef-peca">
                {form.membros.map((x, i) => (
                  <li key={x.membroId} className="grid gap-2.5 border-b border-p-borda px-4 py-3.5 last:border-0 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-center">
                    <div className="flex min-w-0 items-center gap-2.5"><Avatar nome={nomes[x.membroId] ?? "?"} tamanho={32} /><span className="truncate text-[14px] font-semibold text-p-texto">{nomes[x.membroId] ?? "Membro removido"}</span></div>
                    <div className="flex flex-wrap gap-1">
                      {form.funcoes.filter((fn) => fn.nome.trim()).map((fn) => {
                        const tem = x.funcoes.includes(fn.id);
                        return <button key={fn.id} aria-pressed={tem} onClick={() => mudar((f) => { const p = f.membros[i]!; p.funcoes = tem ? p.funcoes.filter((y) => y !== fn.id) : [...p.funcoes, fn.id]; })} className={cn("border px-2.5 py-1 text-[12.5px] font-semibold transition", tem ? "border-marca bg-marca text-white" : "border-p-borda-forte text-p-texto-2 hover:border-p-acento")}>{fn.nome}</button>;
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <button aria-pressed={!!x.lider} title={x.lider ? "Líder (monta as escalas)" : "Tornar líder"} onClick={() => mudar((f) => { f.membros[i]!.lider = !x.lider; })} className={cn("ef-btn !h-9 !px-3", x.lider ? "border border-marca bg-marca-clara text-marca" : "ef-btn-fantasma")}><Crown size={14} /> {x.lider ? "Líder" : ""}</button>
                      <button onClick={() => mudar((f) => { f.membros.splice(i, 1); })} className="ef-btn ef-btn-perigo" aria-label="Tirar do ministério"><Trash2 size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-p-borda pt-5">
            {form.id ? (
              <button onClick={async () => { if (!confirm(`Excluir o ministério “${form.nome}”? Todas as escalas dele saem junto.`)) return; try { await excluirMinisterioPainel({ data: { id: form.id! } }); toast.success("Ministério excluído."); aoSalvar(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } }} className="ef-btn ef-btn-perigo !h-10 !px-3.5"><Trash2 size={14} /> Excluir ministério</button>
            ) : <span className="inline-flex items-center gap-2 text-[13px] text-p-suave"><Smartphone size={14} /> A liderança é avisada no celular.</span>}
            <button disabled={salvando} onClick={salvar} className="ef-btn ef-btn-pri">{salvando ? <Loader2 size={15} className="animate-spin" /> : null} Salvar ministério</button>
          </div>
        </div>
      </div>
    </Camada>
  );
}

function Exemplos({ aoMudar }: { aoMudar: () => void }) {
  const [existem, setExistem] = useState<boolean | null>(null);
  const [indo, setIndo] = useState(false);
  useEffect(() => { exemplosPainel({ data: { acao: "ver" } }).then((r) => setExistem(r.existem)).catch(() => setExistem(false)); }, []);
  const fazer = async (acao: "criar" | "remover") => {
    if (acao === "remover" && !confirm("Remover todas as pessoas, ministérios e escalas de exemplo? Pessoas e escalas reais não são tocadas.")) return;
    setIndo(true);
    try {
      const r = await exemplosPainel({ data: { acao } });
      setExistem(r.existem);
      toast.success(acao === "criar" ? "Exemplos criados: 26 pessoas fictícias, ministérios e escalas." : "Exemplos removidos.");
      aoMudar();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } finally { setIndo(false); }
  };
  if (existem === null) return null;
  return (
    <section className="ef-peca grid gap-3 border-dashed px-6 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <p className="ef-h2 flex items-center gap-2"><FlaskConical size={16} /> Dados de exemplo para testar</p>
        <p className="mt-1.5 text-[14px] text-p-suave">{existem
          ? "Há pessoas, ministérios e escalas fictícias no sistema (marcados como exemplo). Quem já estava no Louvor continua e aparece na escala do próximo domingo para testar a confirmação."
          : "Cria 26 pessoas fictícias, os ministérios de Louvor, Multimídia, Recepção, Infantil e Púlpito (aproveitando os que já existem), escalas das últimas semanas e das próximas, com respostas, músicas e ausências. Ninguém recebe notificação."}</p>
      </div>
      {existem
        ? <button disabled={indo} onClick={() => fazer("remover")} className="ef-btn ef-btn-perigo !h-11 !px-4">{indo ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Remover exemplos</button>
        : <button disabled={indo} onClick={() => fazer("criar")} className="ef-btn ef-btn-sec !h-11">{indo ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />} Criar equipes de exemplo</button>}
    </section>
  );
}
