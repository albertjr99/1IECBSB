import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, CalendarOff, Check, Loader2, Music, Plus, Search, Send, Sparkles, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { escMinisterio, escSalvar, escVer } from "@/lib/api-escalas";
import { diaDe, TONS, duracaoRoteiro, sugerirEquipe, type ItemRoteiro, type Musica } from "@/lib/escalas";
import { buscarHinos } from "@/lib/hinario";
import { dataBR, isoParaLocal, localParaIso } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { Cabecalho, Folha, Rotulo } from "@/components/escalas/comum";
import { Rosto } from "@/components/escalas/Rosto";

export const Route = createFileRoute("/app/escala/editar/$id")({
  validateSearch: (s: Record<string, unknown>): { min: string; dia?: string } => ({ min: typeof s.min === "string" ? s.min : "", ...(typeof s.dia === "string" ? { dia: s.dia } : {}) }),
  component: EditarEscala,
});

type Min = Awaited<ReturnType<typeof escMinisterio>>;
type VagaForm = { id?: string; chave: string; funcaoId: string; membroId?: string };
type Form = { titulo: string; dia: string; hora: string; local: string; observacoes: string; vagas: VagaForm[]; roteiro: ItemRoteiro[]; musicas: Musica[]; situacao: "rascunho" | "publicada" };

const chave = () => Math.random().toString(36).slice(2, 9);
const TITULOS = ["Culto de domingo", "Culto de quarta", "Ensaio", "Escola Bíblica", "Culto especial"];

function EditarEscala() {
  const { id } = Route.useParams();
  const { min, dia } = Route.useSearch();
  const navigate = useNavigate();
  const nova = id === "nova";
  const [mi, setMi] = useState<Min | null>(null);
  const [f, setF] = useState<Form | null>(null);
  const [escolher, setEscolher] = useState<string | null>(null);
  const [musica, setMusica] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (nova) {
          const m = await escMinisterio({ data: { id: min } });
          setMi(m);
          const prox = dia ?? (() => { const d = new Date(Date.now() - 3 * 3600e3); d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7 || 7)); return d.toISOString().slice(0, 10); })();
          setF({ titulo: "", dia: prox, hora: "10:00", local: "", observacoes: "", vagas: m.ministerio.funcoes.map((fn) => ({ chave: chave(), funcaoId: fn.id })), roteiro: [], musicas: [], situacao: "rascunho" });
        } else {
          const v = await escVer({ data: { id } });
          const m = await escMinisterio({ data: { id: v.ministerio.id } });
          setMi(m);
          const [d, h] = isoParaLocal(v.escala.inicio).split("T");
          setF({ titulo: v.escala.titulo, dia: d!, hora: h!.slice(0, 5), local: v.escala.local ?? "", observacoes: v.escala.observacoes ?? "", vagas: v.escala.vagas.map((x) => ({ id: x.id, chave: x.id, funcaoId: x.funcaoId, membroId: x.membroId })), roteiro: v.escala.roteiro, musicas: v.escala.musicas, situacao: v.escala.situacao });
        }
      } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    })();
  }, [id, min, dia, nova]);

  const equipe = mi?.equipe ?? [];
  const nomes = useMemo(() => Object.fromEntries(equipe.map((p) => [p.membroId, p.nome])), [equipe]);
  const ausentes = useMemo(() => new Set((mi?.ausencias ?? []).filter((a) => f && a.de <= f.dia && f.dia <= a.ate).map((a) => a.membroId)), [mi, f?.dia]);

  if (!mi || !f) return <div className="min-h-dvh"><Cabecalho titulo={nova ? "Nova escala" : "Editar escala"} /><Loader2 className="mx-auto mt-16 animate-spin text-[var(--a-suave)]" /></div>;
  const m = mi.ministerio;
  const mudar = (fn: (x: Form) => void) => setF((atual) => { const c = structuredClone(atual!); fn(c); return c; });
  const grupos = m.funcoes.map((fn) => ({ fn, vagas: f.vagas.filter((v) => v.funcaoId === fn.id) }));
  const vazias = f.vagas.filter((v) => !v.membroId).length;

  const salvar = async (publicar: boolean) => {
    if (!f.titulo.trim()) { toast.error("Dê um nome para a escala (ex.: Culto de domingo)."); return; }
    setSalvando(true);
    try {
      const r = await escSalvar({ data: {
        id: nova ? undefined : id, ministerioId: m.id, titulo: f.titulo, inicio: localParaIso(`${f.dia}T${f.hora}`), local: f.local, observacoes: f.observacoes,
        vagas: f.vagas.map((v) => ({ id: v.id, funcaoId: v.funcaoId, membroId: v.membroId })), roteiro: f.roteiro, musicas: f.musicas, publicar,
      } });
      toast.success(publicar && f.situacao === "rascunho" ? "Escala publicada. Os escalados foram avisados." : r.situacao === "publicada" ? "Escala salva. Quem mudou foi avisado." : "Rascunho salvo.");
      navigate({ to: "/app/escala/$id", params: { id: r.id }, replace: true });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } finally { setSalvando(false); }
  };

  const vagaAberta = escolher ? f.vagas.find((v) => v.chave === escolher) : undefined;

  return (
    <div className="min-h-dvh pb-32">
      <Cabecalho titulo={`${m.nome} · ${nova ? "nova escala" : "editar"}`} />
      <div className="grid gap-6 px-5 pt-5">
        <section className="grid gap-3">
          <label><Rotulo>Nome</Rotulo><input value={f.titulo} onChange={(e) => mudar((x) => { x.titulo = e.target.value; })} placeholder="Ex.: Culto de domingo" className="a-campo" maxLength={80} /></label>
          {!f.titulo && <div className="-mt-1 flex flex-wrap gap-1.5">{[...new Set([...mi.series.map((s) => s.titulo), ...TITULOS])].slice(0, 6).map((t) => <button key={t} onClick={() => mudar((x) => { x.titulo = t; })} className="border border-[var(--a-borda)] bg-[var(--a-sup)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--a-azul)]">{t}</button>)}</div>}
          <div className="grid grid-cols-[1.3fr_1fr] gap-3">
            <label><Rotulo>Data</Rotulo><input type="date" value={f.dia} onChange={(e) => mudar((x) => { x.dia = e.target.value; })} className="a-campo" /></label>
            <label><Rotulo>Horário</Rotulo><input type="time" value={f.hora} onChange={(e) => mudar((x) => { x.hora = e.target.value; })} className="a-campo" /></label>
          </div>
          <label><Rotulo>Local (opcional)</Rotulo><input value={f.local} onChange={(e) => mudar((x) => { x.local = e.target.value; })} placeholder="Templo" className="a-campo" /></label>
        </section>

        <section className="grid gap-3">
          <div className="flex items-end justify-between gap-2">
            <p className="a-sobre">Equipe</p>
            <button disabled={!vazias} onClick={() => { mudar((x) => { x.vagas = sugerirEquipe(x.vagas, equipe, ausentes); }); toast.success("Sugestão pronta: quem serviu menos e não marcou ausência. Ajuste à vontade."); }} className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--a-azul)] disabled:opacity-40"><Sparkles size={15} /> Sugerir equipe</button>
          </div>
          <div className="a-cartao">
            {grupos.map(({ fn, vagas }) => (
              <div key={fn.id} className="border-b border-[var(--a-borda)] px-4 py-3 last:border-0">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--a-suave)]">{fn.nome}</p>
                  <button onClick={() => mudar((x) => { const k = chave(); x.vagas.push({ chave: k, funcaoId: fn.id }); })} className="grid size-8 place-items-center text-[var(--a-azul)]" aria-label={`Mais uma vaga de ${fn.nome}`}><Plus size={17} /></button>
                </div>
                {vagas.length === 0 && <p className="text-[12.5px] text-[var(--a-suave)]">Sem vaga nesta escala.</p>}
                {vagas.map((v) => (
                  <div key={v.chave} className="mt-1.5 flex items-center gap-2">
                    <button onClick={() => setEscolher(v.chave)} className={cn("flex h-11 min-w-0 flex-1 items-center gap-2 border px-3 text-left text-[15px]", v.membroId ? "border-[var(--a-borda)] bg-[var(--a-sup)] font-semibold" : "border-dashed border-[var(--a-borda)] text-[var(--a-suave)]")}>
                      {v.membroId ? <Rosto id={v.membroId} nome={nomes[v.membroId] ?? ""} foto={equipe.find((p) => p.membroId === v.membroId)?.foto} tam={28} /> : <UserRound size={16} className="shrink-0 text-[var(--a-suave)]" />}
                      <span className="truncate">{v.membroId ? nomes[v.membroId] ?? "—" : "Escolher pessoa"}</span>
                      {v.membroId && ausentes.has(v.membroId) && <CalendarOff size={15} className="ml-auto shrink-0 text-[var(--a-vermelho)]" aria-label="Marcou ausência" />}
                    </button>
                    <button onClick={() => mudar((x) => { x.vagas = x.vagas.filter((y) => y.chave !== v.chave); })} className="grid size-9 place-items-center text-[var(--a-suave)]" aria-label="Tirar a vaga"><X size={17} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="text-[12.5px] text-[var(--a-suave)]">Toque no + para mais de uma pessoa na mesma função (ex.: dois vocais) e no × para tirar a vaga desta escala.</p>
        </section>

        {m.repertorio && (
          <section className="grid gap-2">
            <div className="flex items-end justify-between"><p className="a-sobre"><Music size={13} /> Músicas</p><button onClick={() => setMusica(true)} className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--a-azul)]"><Plus size={15} /> Música</button></div>
            {f.musicas.length === 0 ? <p className="text-[13px] text-[var(--a-suave)]">Nenhuma ainda. Busque no hinário pelo número ou nome, ou inclua uma música livre.</p> : (
              <ol className="a-cartao">
                {f.musicas.map((mu, i) => (
                  <li key={mu.id || i} className="grid gap-2 border-b border-[var(--a-borda)] px-3 py-3 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-[13px] font-bold text-[var(--a-suave)]">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{mu.hino ? `${mu.hino} · ` : ""}{mu.titulo}</span>
                      <button disabled={!i} onClick={() => mudar((x) => { const [a] = x.musicas.splice(i, 1); x.musicas.splice(i - 1, 0, a!); })} className="grid size-8 place-items-center text-[var(--a-suave)] disabled:opacity-30" aria-label="Subir"><ArrowUp size={15} /></button>
                      <button disabled={i === f.musicas.length - 1} onClick={() => mudar((x) => { const [a] = x.musicas.splice(i, 1); x.musicas.splice(i + 1, 0, a!); })} className="grid size-8 place-items-center text-[var(--a-suave)] disabled:opacity-30" aria-label="Descer"><ArrowDown size={15} /></button>
                      <button onClick={() => mudar((x) => { x.musicas.splice(i, 1); })} className="grid size-8 place-items-center text-[var(--a-suave)]" aria-label="Tirar"><Trash2 size={15} /></button>
                    </div>
                    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 pl-7 [&>input:last-child]:col-start-2">
                      <select value={mu.tom ?? ""} onChange={(e) => mudar((x) => { x.musicas[i]!.tom = e.target.value || undefined; })} className="a-campo !h-10 !px-2 !text-[14px]"><option value="">Tom</option>{TONS.map((t) => <option key={t}>{t}</option>)}</select>
                      <input value={mu.link ?? ""} onChange={(e) => mudar((x) => { x.musicas[i]!.link = e.target.value || undefined; })} placeholder="Link para ouvir (YouTube…)" className="a-campo !h-10 !text-[14px]" inputMode="url" />
                      <input value={mu.cifra ?? ""} onChange={(e) => mudar((x) => { x.musicas[i]!.cifra = e.target.value || undefined; })} placeholder="Link da cifra (Cifra Club…)" className="a-campo !h-10 !text-[14px]" inputMode="url" />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        <section className="grid gap-2">
          <div className="flex items-end justify-between"><p className="a-sobre">Roteiro (opcional)</p>{duracaoRoteiro(f.roteiro) > 0 && <span className="text-[12.5px] font-semibold text-[var(--a-suave)]">{duracaoRoteiro(f.roteiro)} min</span>}</div>
          {f.roteiro.map((r, i) => (
            <div key={r.id || i} className="grid grid-cols-[minmax(0,1fr)_68px_36px] items-center gap-2">
              <input value={r.item} onChange={(e) => mudar((x) => { x.roteiro[i]!.item = e.target.value; })} placeholder="Ex.: Louvor, Avisos, Mensagem" className="a-campo !h-11 !text-[15px]" />
              <input value={r.minutos ?? ""} onChange={(e) => mudar((x) => { x.roteiro[i]!.minutos = Number(e.target.value) || undefined; })} placeholder="min" inputMode="numeric" className="a-campo !h-11 !px-2 text-center !text-[15px]" />
              <button onClick={() => mudar((x) => { x.roteiro.splice(i, 1); })} className="grid size-9 place-items-center text-[var(--a-suave)]" aria-label="Tirar"><X size={17} /></button>
            </div>
          ))}
          <button onClick={() => mudar((x) => { x.roteiro.push({ id: "", item: "" }); })} className="inline-flex items-center gap-1 justify-self-start text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--a-azul)]"><Plus size={15} /> Item do roteiro</button>
        </section>

        <label><Rotulo>Observações (opcional)</Rotulo><textarea value={f.observacoes} onChange={(e) => mudar((x) => { x.observacoes = e.target.value; })} rows={3} placeholder="Ex.: ensaio às 8h; roupa escura" className="a-campo !h-auto py-3" /></label>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-[var(--a-borda)] bg-[var(--a-sup)] p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        {f.situacao === "rascunho" ? (
          <>
            <button disabled={salvando} onClick={() => salvar(false)} className="a-btn a-btn-sec">Salvar rascunho</button>
            <button disabled={salvando || f.vagas.every((v) => !v.membroId)} onClick={() => salvar(true)} className="a-btn a-btn-pri">{salvando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Publicar</button>
          </>
        ) : <button disabled={salvando} onClick={() => salvar(false)} className="a-btn a-btn-pri col-span-2">{salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar e avisar quem mudou</button>}
      </div>

      {vagaAberta && (
        <Folha titulo={m.funcoes.find((x) => x.id === vagaAberta.funcaoId)?.nome ?? "Escolher"} aoFechar={() => setEscolher(null)}>
          <Escolha
            equipe={equipe} funcaoId={vagaAberta.funcaoId} atual={vagaAberta.membroId} ausentes={ausentes}
            jaNaEscala={new Set(f.vagas.filter((v) => v.chave !== vagaAberta.chave).map((v) => v.membroId).filter(Boolean) as string[])}
            ausencias={mi.ausencias} dia={f.dia}
            aoEscolher={(membroId) => { mudar((x) => { x.vagas.find((v) => v.chave === vagaAberta.chave)!.membroId = membroId; }); setEscolher(null); }}
          />
        </Folha>
      )}
      {musica && <AdicionarMusica usadas={mi.musicasUsadas} aoFechar={() => setMusica(false)} aoAdicionar={(mu) => { mudar((x) => { x.musicas.push(mu); }); setMusica(false); }} />}
    </div>
  );
}

function Escolha({ equipe, funcaoId, atual, ausentes, jaNaEscala, ausencias, dia, aoEscolher }: {
  equipe: Min["equipe"]; funcaoId: string; atual?: string; ausentes: Set<string>; jaNaEscala: Set<string>; ausencias: Min["ausencias"]; dia: string; aoEscolher: (id?: string) => void;
}) {
  const com = equipe.filter((p) => p.funcoes.includes(funcaoId)).sort((a, b) => Number(ausentes.has(a.membroId)) - Number(ausentes.has(b.membroId)) || a.vezes90 - b.vezes90);
  const outros = equipe.filter((p) => !p.funcoes.includes(funcaoId));
  const Linha = ({ p }: { p: Min["equipe"][number] }) => {
    const aus = ausencias.find((a) => a.membroId === p.membroId && a.de <= dia && dia <= a.ate);
    return (
      <button onClick={() => aoEscolher(p.membroId)} className={cn("flex w-full items-center gap-3 border-b border-[var(--a-borda)] px-1 py-2.5 text-left last:border-0", p.membroId === atual && "bg-[var(--a-realce)]")}>
        <Rosto id={p.membroId} nome={p.nome} foto={p.foto} tam={40} className={aus ? "opacity-50" : ""} />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[15px] font-semibold", aus && "text-[var(--a-suave)]")}>{p.nome}</span>
          <span className="block text-[12px] text-[var(--a-suave)]">{p.vezes90 ? `${p.vezes90}× em 90 dias` : "Não serviu nos últimos 90 dias"}{p.ultima ? ` · última ${dataBR(diaDe(p.ultima))}` : ""}{jaNaEscala.has(p.membroId) ? " · já está nesta escala" : ""}</span>
          {aus && <span className="flex items-center gap-1 text-[12px] font-semibold text-[var(--a-vermelho)]"><CalendarOff size={12} /> Ausente{aus.motivo ? `: ${aus.motivo}` : ""}</span>}
        </span>
        {p.membroId === atual && <Check size={18} className="text-[var(--a-azul)]" />}
      </button>
    );
  };
  return (
    <div className="grid gap-3">
      {com.length ? <div>{com.map((p) => <Linha key={p.membroId} p={p} />)}</div> : <p className="text-[13.5px] text-[var(--a-suave)]">Ninguém tem esta função ainda. Ajuste a equipe em Ministério → Equipe.</p>}
      {outros.length > 0 && <details><summary className="cursor-pointer text-[12.5px] font-bold uppercase tracking-[0.1em] text-[var(--a-suave)]">Outras pessoas do ministério</summary><div className="mt-1">{outros.map((p) => <Linha key={p.membroId} p={p} />)}</div></details>}
      {atual && <button onClick={() => aoEscolher(undefined)} className="a-btn a-btn-sec">Deixar a definir</button>}
    </div>
  );
}

function AdicionarMusica({ usadas, aoFechar, aoAdicionar }: { usadas: Min["musicasUsadas"]; aoFechar: () => void; aoAdicionar: (m: Musica) => void }) {
  const [q, setQ] = useState("");
  const hinos = q.trim() ? buscarHinos(q).slice(0, 8) : [];
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const ja = usadas.filter((u) => !u.hino && (!q.trim() || norm(`${u.titulo} ${u.artista ?? ""}`).includes(norm(q)))).slice(0, 8);
  return (
    <Folha titulo="Adicionar música" aoFechar={aoFechar}>
      <label className="relative"><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--a-suave)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número do hino ou nome da música" className="a-campo pl-10" /></label>
      {hinos.length > 0 && (
        <div><Rotulo>Salmos e Hinos</Rotulo>{hinos.map((h) => (
          <button key={h.numero} onClick={() => aoAdicionar({ id: "", hino: h.numero, titulo: h.titulo, tom: usadas.find((u) => u.hino === h.numero)?.tom })} className="flex w-full items-center gap-3 border-b border-[var(--a-borda)] py-2.5 text-left last:border-0">
            <span className="w-10 text-[14px] font-bold text-[var(--a-azul)]">{h.numero}</span><span className="min-w-0 flex-1 truncate text-[15px]">{h.titulo}</span><Plus size={16} className="text-[var(--a-azul)]" />
          </button>
        ))}</div>
      )}
      {ja.length > 0 && (
        <div><Rotulo>Já tocadas no ministério</Rotulo>{ja.map((u) => (
          <button key={u.titulo} onClick={() => aoAdicionar({ id: "", titulo: u.titulo, artista: u.artista, tom: u.tom, link: u.link, cifra: u.cifra })} className="flex w-full items-center gap-3 border-b border-[var(--a-borda)] py-2.5 text-left last:border-0">
            <span className="min-w-0 flex-1"><span className="block truncate text-[15px]">{u.titulo}</span><span className="text-[12px] text-[var(--a-suave)]">{[u.artista, u.tom && `tom ${u.tom}`, `${u.vezes}×`].filter(Boolean).join(" · ")}</span></span><Plus size={16} className="text-[var(--a-azul)]" />
          </button>
        ))}</div>
      )}
      {q.trim() && !/^\d+$/.test(q.trim()) && <button onClick={() => aoAdicionar({ id: "", titulo: q.trim() })} className="a-btn a-btn-sec"><Plus size={16} /> Incluir “{q.trim()}” como música livre</button>}
    </Folha>
  );
}
