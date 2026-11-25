import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarOff, CalendarPlus, ChevronRight, Crown, Pencil, Plus, Repeat, Search, Settings2, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { escEquipe, escMinisterio, escSerieExcluir, escSerieSalvar } from "@/lib/api-escalas";
import { diaDe, DIAS_SEMANA, FREQUENCIA_ROTULO, SEMANA_DO_MES, descreverSerie, type Frequencia, type Serie } from "@/lib/escalas";
import { dataBR, dataComDia, hora } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { IconeMinisterio } from "@/components/escalas/icones";
import { Cabecalho, Folha, Rotulo, falta } from "@/components/escalas/comum";

export const Route = createFileRoute("/app/ministerio/$id")({ component: Ministerio });

type Dados = Awaited<ReturnType<typeof escMinisterio>>;
type Aba = "escalas" | "repeticoes" | "equipe" | "ausencias";
type SerieForm = Omit<Serie, "id" | "ativa" | "excluidas" | "ministerioId"> & { id?: string; aplicar?: boolean };

function Ministerio() {
  const { id } = Route.useParams();
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<Aba>("escalas");
  const [anteriores, setAnteriores] = useState(false);
  const [serie, setSerie] = useState<SerieForm | null>(null);
  const [pessoa, setPessoa] = useState<{ membroId: string; nome: string; funcoes: string[]; nova?: boolean } | null>(null);
  const [incluir, setIncluir] = useState(false);
  const [funcoes, setFuncoes] = useState<{ id?: string; nome: string }[] | null>(null);
  const carregar = useCallback(() => escMinisterio({ data: { id } }).then(setD).catch((e) => setErro(e instanceof Error ? e.message : "Erro")), [id]);
  useEffect(() => { carregar(); }, [carregar]);

  if (!d) return <div className="min-h-dvh"><Cabecalho titulo="Ministério" />{erro ? <p className="px-6 py-16 text-center text-[var(--a-suave)]">{erro}</p> : <div className="m-5 h-48 animate-pulse bg-[var(--a-borda)]" />}</div>;
  const m = d.ministerio;
  const agora = Date.now() - 4 * 3600e3;
  const futuras = d.escalas.filter((e) => new Date(e.inicio).getTime() > agora);
  const passadas = d.escalas.filter((e) => new Date(e.inicio).getTime() <= agora).reverse();
  const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const acao = async (p: Promise<unknown>, ok: string) => { try { await p; toast.success(ok); carregar(); return true; } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); return false; } };

  return (
    <div className="min-h-dvh pb-10">
      <Cabecalho titulo="Liderança" />
      <header className="flex items-center gap-3 px-5 pt-5">
        <span className="grid size-12 shrink-0 place-items-center bg-[#00436f] text-white"><IconeMinisterio chave={m.icone} size={22} /></span>
        <div className="min-w-0"><h1 className="text-[24px] font-bold leading-tight text-[var(--a-azul)]">{m.nome}</h1><p className="text-[13px] text-[var(--a-suave)]">{d.equipe.length} pessoas · {m.funcoes.length} funções</p></div>
      </header>

      <div className="a-entra grid gap-4 px-5 pt-4">
        <div className="-mx-5 flex gap-1 overflow-x-auto px-5 [scrollbar-width:none]">
          {([["escalas", "Escalas"], ["repeticoes", "Repetições"], ["equipe", "Equipe"], ["ausencias", `Ausências${d.ausencias.length ? ` · ${d.ausencias.length}` : ""}`]] as const).map(([k, r]) => (
            <button key={k} onClick={() => setAba(k)} className={cn("h-10 shrink-0 border px-4 text-[11.5px] font-bold uppercase tracking-[0.1em]", aba === k ? "border-[#00436f] bg-[#00436f] text-white" : "border-[var(--a-borda)] bg-[var(--a-sup)] text-[var(--a-suave)]")}>{r}</button>
          ))}
        </div>

        {aba === "escalas" && (
          <>
            <Link to="/app/escala/editar/$id" params={{ id: "nova" }} search={{ min: m.id }} className="a-btn a-btn-pri"><CalendarPlus size={17} /> Nova escala</Link>
            {futuras.length === 0 ? <p className="a-cartao p-5 text-[14px] text-[var(--a-suave)]">Nenhuma escala por vir. Crie uma, ou uma repetição (ex.: todo domingo às 10h) para as datas aparecerem sozinhas.</p> : (
              <ul className="grid gap-2">
                {futuras.map((e) => {
                  const recusas = e.vagas.filter((v) => v.resposta === "recusado").length;
                  return (
                    <li key={e.id}>
                      <Link to="/app/escala/$id" params={{ id: e.id }} className={cn("a-cartao flex items-center gap-3 p-3.5", e.situacao === "rascunho" && "border-dashed")}>
                        <span className="grid w-12 shrink-0 text-center"><span className="text-[22px] font-bold leading-none text-[var(--a-azul)]">{dataBR(diaDe(e.inicio)).slice(0, 2)}</span><span className="text-[10.5px] font-bold uppercase text-[var(--a-suave)]">{dataComDia(diaDe(e.inicio)).slice(0, 3)}</span></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15.5px] font-bold">{e.titulo}</span>
                          <span className="block text-[12.5px] text-[var(--a-suave)]">{hora(e.inicio)} · {falta(e.inicio)}{e.serieId ? " · repetição" : ""}</span>
                          <span className="mt-1 flex flex-wrap gap-x-3 text-[11.5px] font-bold">
                            {e.situacao === "rascunho" ? <span className="text-[var(--a-azul)]">Rascunho · {e.preenchidas}/{e.total} vagas</span> : <span className="text-[var(--a-suave)]">{e.confirmados}/{e.preenchidas} confirmados</span>}
                            {e.situacao === "publicada" && e.preenchidas < e.total && <span className="text-[var(--a-vermelho)]">{e.total - e.preenchidas} vaga(s) a definir</span>}
                            {recusas > 0 && <span className="inline-flex items-center gap-1 text-[var(--a-vermelho)]"><AlertTriangle size={12} /> {recusas} não poderá(ão)</span>}
                          </span>
                        </span>
                        <ChevronRight size={18} className="text-[var(--a-suave)]" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {passadas.length > 0 && (
              <div>
                <button onClick={() => setAnteriores(!anteriores)} className="text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--a-suave)]">{anteriores ? "Esconder" : "Ver"} anteriores ({passadas.length})</button>
                {anteriores && <ul className="a-cartao mt-2">{passadas.map((e) => <li key={e.id}><Link to="/app/escala/$id" params={{ id: e.id }} className="flex gap-3 border-b border-[var(--a-borda)] px-4 py-2.5 text-[14px] last:border-0"><span className="w-[82px] shrink-0 text-[12.5px] font-semibold text-[var(--a-suave)]">{dataBR(diaDe(e.inicio))}</span><span className="truncate">{e.titulo}</span></Link></li>)}</ul>}
              </div>
            )}
          </>
        )}

        {aba === "repeticoes" && (
          <>
            <p className="text-[13.5px] text-[var(--a-suave)]">A repetição cria sozinha as próximas datas (até 10 semanas à frente) como rascunho, com as vagas prontas. Você só escolhe as pessoas e publica.</p>
            <button onClick={() => setSerie({ titulo: "Culto de domingo", hora: "10:00", diaSemana: 0, frequencia: "semanal", desde: hoje, vagas: m.funcoes.map((f) => f.id), roteiro: [] })} className="a-btn a-btn-pri"><Repeat size={17} /> Nova repetição</button>
            {d.series.length === 0 ? <p className="a-cartao p-5 text-[14px] text-[var(--a-suave)]">Nenhuma repetição ainda.</p> : (
              <ul className="grid gap-2">
                {d.series.map((s) => (
                  <li key={s.id} className="a-cartao flex items-center gap-3 p-3.5">
                    <Repeat size={18} className="shrink-0 text-[var(--a-azul)]" />
                    <span className="min-w-0 flex-1"><span className="block text-[15.5px] font-bold">{s.titulo}</span><span className="block text-[12.5px] text-[var(--a-suave)]">{descreverSerie(s)}{s.ate ? ` · até ${dataBR(s.ate)}` : ""} · {s.vagas.length} vagas</span></span>
                    <button onClick={() => setSerie({ ...s, aplicar: true })} className="grid size-9 place-items-center text-[var(--a-azul)]" aria-label="Editar"><Pencil size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {aba === "equipe" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setIncluir(true)} className="a-btn a-btn-pri"><UserPlus size={17} /> Incluir</button>
              <button onClick={() => setFuncoes(m.funcoes.map((f) => ({ ...f })))} className="a-btn a-btn-sec"><Settings2 size={17} /> Funções</button>
            </div>
            <ul className="a-cartao">
              {d.equipe.map((p) => (
                <li key={p.membroId}>
                  <button onClick={() => setPessoa({ membroId: p.membroId, nome: p.nome, funcoes: [...p.funcoes] })} className="flex w-full items-center gap-3 border-b border-[var(--a-borda)] px-4 py-3 text-left last:border-0">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[15px] font-semibold">{p.nome}{p.lider && <Crown size={13} className="text-[var(--a-vermelho)]" />}</span>
                      <span className="block truncate text-[12.5px] text-[var(--a-suave)]">{p.funcoesNomes.join(", ") || "Sem função"}</span>
                      <span className="block text-[11.5px] text-[var(--a-suave)]">{p.vezes90 ? `${p.vezes90}× em 90 dias` : "Não serviu em 90 dias"}{p.ultima ? ` · última ${dataBR(diaDe(p.ultima))}` : ""}{p.faltas ? ` · ${p.faltas} ausência(s) avisada(s)` : ""}</span>
                    </span>
                    <Pencil size={15} className="shrink-0 text-[var(--a-suave)]" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {aba === "ausencias" && (
          d.ausencias.length === 0 ? <p className="a-cartao p-5 text-[14px] text-[var(--a-suave)]">Ninguém da equipe marcou ausência por vir.</p> : (
            <ul className="a-cartao">
              {d.ausencias.map((a) => (
                <li key={a.id} className="flex items-start gap-3 border-b border-[var(--a-borda)] px-4 py-3 last:border-0">
                  <CalendarOff size={18} className="mt-0.5 shrink-0 text-[var(--a-suave)]" />
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{a.nome}</span><span className="block text-[13px] text-[var(--a-suave)]">{a.de === a.ate ? dataBR(a.de) : `${dataBR(a.de)} a ${dataBR(a.ate)}`}{a.motivo ? ` · ${a.motivo}` : ""}</span></span>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {serie && (
        <Folha titulo={serie.id ? "Editar repetição" : "Nova repetição"} aoFechar={() => setSerie(null)}>
          <label><Rotulo>Nome</Rotulo><input value={serie.titulo} onChange={(e) => setSerie({ ...serie, titulo: e.target.value })} className="a-campo" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label><Rotulo>Dia</Rotulo><select value={serie.diaSemana} onChange={(e) => setSerie({ ...serie, diaSemana: Number(e.target.value) })} className="a-campo">{DIAS_SEMANA.map((n, i) => <option key={i} value={i}>{n}</option>)}</select></label>
            <label><Rotulo>Horário</Rotulo><input type="time" value={serie.hora} onChange={(e) => setSerie({ ...serie, hora: e.target.value })} className="a-campo" /></label>
          </div>
          <div className={cn("grid gap-3", serie.frequencia === "mensal" && "grid-cols-2")}>
            <label><Rotulo>Repetir</Rotulo><select value={serie.frequencia} onChange={(e) => setSerie({ ...serie, frequencia: e.target.value as Frequencia })} className="a-campo">{(Object.keys(FREQUENCIA_ROTULO) as Frequencia[]).map((k) => <option key={k} value={k}>{FREQUENCIA_ROTULO[k]}</option>)}</select></label>
            {serie.frequencia === "mensal" && <label><Rotulo>Qual semana</Rotulo><select value={serie.semanaDoMes ?? 1} onChange={(e) => setSerie({ ...serie, semanaDoMes: Number(e.target.value) })} className="a-campo">{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{SEMANA_DO_MES[n]} do mês</option>)}</select></label>}
          </div>
          <p className="-mt-1 text-[13px] font-semibold text-[var(--a-azul)]">{descreverSerie(serie)}</p>
          <div className="grid grid-cols-2 gap-3">
            <label><Rotulo>A partir de</Rotulo><input type="date" value={serie.desde} onChange={(e) => setSerie({ ...serie, desde: e.target.value })} className="a-campo" /></label>
            <label><Rotulo>Até (opcional)</Rotulo><input type="date" value={serie.ate ?? ""} onChange={(e) => setSerie({ ...serie, ate: e.target.value || undefined })} className="a-campo" /></label>
          </div>
          <div>
            <Rotulo>Vagas em cada data</Rotulo>
            <div className="a-cartao">
              {m.funcoes.map((f) => {
                const n = serie.vagas.filter((x) => x === f.id).length;
                const por = (k: number) => { const outras = serie.vagas.filter((x) => x !== f.id); setSerie({ ...serie, vagas: [...outras, ...Array(k).fill(f.id)].sort((a, b) => m.funcoes.findIndex((x) => x.id === a) - m.funcoes.findIndex((x) => x.id === b)) }); };
                return (
                  <div key={f.id} className="flex items-center justify-between border-b border-[var(--a-borda)] px-3 py-2 last:border-0">
                    <span className={cn("text-[14.5px]", !n && "text-[var(--a-suave)]")}>{f.nome}</span>
                    <span className="flex items-center"><button onClick={() => por(Math.max(0, n - 1))} className="grid size-9 place-items-center text-[18px] font-bold text-[var(--a-azul)]" aria-label="Menos">−</button><span className="w-6 text-center text-[15px] font-bold">{n}</span><button onClick={() => por(n + 1)} className="grid size-9 place-items-center text-[18px] font-bold text-[var(--a-azul)]" aria-label="Mais">+</button></span>
                  </div>
                );
              })}
            </div>
          </div>
          <label><Rotulo>Local (opcional)</Rotulo><input value={serie.local ?? ""} onChange={(e) => setSerie({ ...serie, local: e.target.value })} className="a-campo" /></label>
          {serie.id && <label className="flex items-start gap-3 text-[14px]"><input type="checkbox" checked={!!serie.aplicar} onChange={(e) => setSerie({ ...serie, aplicar: e.target.checked })} className="mt-1 size-5 accent-[#00436f]" /> <span>Aplicar também às próximas datas que ainda estão em rascunho (as publicadas não mudam)</span></label>}
          <button onClick={async () => { if (await acao(escSerieSalvar({ data: { ...serie, ministerioId: m.id } }), serie.id ? "Repetição atualizada." : "Repetição criada. As próximas datas já estão nas escalas.")) { setSerie(null); setAba("escalas"); } }} className="a-btn a-btn-pri">Salvar</button>
          {serie.id && <button onClick={async () => { if (!confirm("Parar esta repetição? As próximas datas em rascunho saem; as já publicadas continuam.")) return; if (await acao(escSerieExcluir({ data: { id: serie.id! } }), "Repetição encerrada.")) setSerie(null); }} className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-[var(--a-vermelho)]"><Trash2 size={14} /> Parar a repetição</button>}
        </Folha>
      )}

      {pessoa && (
        <Folha titulo={pessoa.nome} aoFechar={() => setPessoa(null)}>
          <Rotulo>Funções</Rotulo>
          <div className="-mt-3 flex flex-wrap gap-1.5">
            {m.funcoes.map((f) => { const tem = pessoa.funcoes.includes(f.id); return <button key={f.id} onClick={() => setPessoa({ ...pessoa, funcoes: tem ? pessoa.funcoes.filter((x) => x !== f.id) : [...pessoa.funcoes, f.id] })} className={cn("border px-3 py-1.5 text-[13.5px] font-semibold", tem ? "border-[#00436f] bg-[#00436f] text-white" : "border-[var(--a-borda)] text-[var(--a-suave)]")}>{f.nome}</button>; })}
          </div>
          <button onClick={async () => { if (await acao(escEquipe({ data: { ministerioId: m.id, pessoa: { membroId: pessoa.membroId, funcoes: pessoa.funcoes } } }), pessoa.nova ? `${pessoa.nome.split(" ")[0]} entrou no ministério.` : "Funções salvas.")) setPessoa(null); }} className="a-btn a-btn-pri">{pessoa.nova ? "Incluir no ministério" : "Salvar"}</button>
          {!pessoa.nova && !d.equipe.find((p) => p.membroId === pessoa.membroId)?.lider && <button onClick={async () => { if (!confirm(`Tirar ${pessoa.nome} do ministério?`)) return; if (await acao(escEquipe({ data: { ministerioId: m.id, pessoa: { membroId: pessoa.membroId, funcoes: [], remover: true } } }), "Removido(a) do ministério.")) setPessoa(null); }} className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-[var(--a-vermelho)]"><Trash2 size={14} /> Tirar do ministério</button>}
        </Folha>
      )}

      {incluir && <IncluirPessoa membros={d.membrosIgreja} aoFechar={() => setIncluir(false)} aoEscolher={(p) => { setIncluir(false); setPessoa({ membroId: p.id, nome: p.nome, funcoes: [], nova: true }); }} />}

      {funcoes && (
        <Folha titulo="Funções do ministério" aoFechar={() => setFuncoes(null)}>
          <p className="-mt-1 text-[13px] text-[var(--a-suave)]">A ordem aqui é a ordem na escala.</p>
          {funcoes.map((f, i) => (
            <div key={f.id ?? `n${i}`} className="flex items-center gap-2">
              <input value={f.nome} onChange={(e) => setFuncoes(funcoes.map((x, k) => (k === i ? { ...x, nome: e.target.value } : x)))} className="a-campo !h-11 min-w-0 flex-1" placeholder="Nome da função" />
              <button onClick={() => { if (f.id && !confirm(`Tirar a função “${f.nome}”? Ela sai das pessoas e das próximas escalas.`)) return; setFuncoes(funcoes.filter((_, k) => k !== i)); }} className="grid size-9 place-items-center text-[var(--a-suave)]" aria-label="Tirar"><X size={17} /></button>
            </div>
          ))}
          <button onClick={() => setFuncoes([...funcoes, { nome: "" }])} className="inline-flex items-center gap-1 justify-self-start text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--a-azul)]"><Plus size={15} /> Função</button>
          <button onClick={async () => { if (await acao(escEquipe({ data: { ministerioId: m.id, funcoes: funcoes.filter((x) => x.nome.trim()) } }), "Funções salvas.")) setFuncoes(null); }} className="a-btn a-btn-pri">Salvar</button>
        </Folha>
      )}
    </div>
  );
}

function IncluirPessoa({ membros, aoFechar, aoEscolher }: { membros: { id: string; nome: string }[]; aoFechar: () => void; aoEscolher: (p: { id: string; nome: string }) => void }) {
  const [q, setQ] = useState("");
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const l = membros.filter((p) => !q || norm(p.nome).includes(norm(q))).slice(0, 30);
  return (
    <Folha titulo="Incluir pessoa" aoFechar={aoFechar}>
      <label className="relative"><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--a-suave)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome" className="a-campo pl-10" /></label>
      {l.length === 0 ? <p className="text-[13.5px] text-[var(--a-suave)]">Ninguém encontrado. A pessoa precisa ter cadastro aprovado no aplicativo.</p> : (
        <div>{l.map((p) => <button key={p.id} onClick={() => aoEscolher(p)} className="flex w-full items-center justify-between border-b border-[var(--a-borda)] py-3 text-left text-[15px] last:border-0">{p.nome}<Plus size={16} className="text-[var(--a-azul)]" /></button>)}</div>
      )}
    </Folha>
  );
}
