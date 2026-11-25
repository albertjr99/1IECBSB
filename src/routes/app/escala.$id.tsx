import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Clock, ExternalLink, History, ListOrdered, MapPin, Music, Pencil, Send, Share2, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { escExcluir, escResponder, escSalvar, escVer } from "@/lib/api-escalas";
import { diaDe, duracaoRoteiro, textoDaEscala } from "@/lib/escalas";
import { dataComDia, dataHora, hora } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { IconeMinisterio } from "@/components/escalas/icones";
import { Cabecalho, Folha, Rotulo, Selo, compartilharTexto, falta } from "@/components/escalas/comum";

export const Route = createFileRoute("/app/escala/$id")({ component: VerEscala });

type Dados = Awaited<ReturnType<typeof escVer>>;

function VerEscala() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [d, setD] = useState<Dados | null | undefined>(undefined);
  const [erro, setErro] = useState("");
  const [recusa, setRecusa] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [historico, setHistorico] = useState(false);
  const carregar = useCallback(() => escVer({ data: { id } }).then(setD).catch((e) => { setErro(e instanceof Error ? e.message : "Erro"); setD(null); }), [id]);
  useEffect(() => { carregar(); }, [carregar]);

  if (d === undefined) return <div className="min-h-dvh"><Cabecalho titulo="Escala" /><div className="m-5 h-48 animate-pulse bg-[var(--a-borda)]" /></div>;
  if (!d) return <div className="min-h-dvh"><Cabecalho titulo="Escala" /><p className="px-6 py-16 text-center text-[var(--a-suave)]">{erro}</p></div>;

  const { escala: e, ministerio: m, lider, alertas } = d;
  const minhas = e.vagas.filter((v) => e.minhas.includes(v.id));
  const passou = new Date(e.inicio).getTime() < Date.now() - 3 * 3600e3;
  const nomes = Object.fromEntries(e.vagas.filter((v) => v.membroId).map((v) => [v.membroId!, v.nome!]));
  const responder = async (vagaId: string, resposta: "confirmado" | "recusado" | "pendente", mot?: string) => {
    try { await escResponder({ data: { id: e.id, vagaId, resposta, motivo: mot } }); toast.success(resposta === "confirmado" ? "Presença confirmada. Obrigado!" : resposta === "recusado" ? "A liderança foi avisada." : "Resposta desfeita."); carregar(); }
    catch (x) { toast.error(x instanceof Error ? x.message : "Erro"); }
  };
  const compartilhar = async () => {
    const t = textoDaEscala({ ...e, vagas: e.vagas.map((v) => ({ ...v, resposta: v.resposta })) }, m, nomes, `${dataComDia(diaDe(e.inicio))} às ${hora(e.inicio)}`);
    const r = await compartilharTexto(t);
    if (r === "copiado") toast.success("Texto copiado. Cole no WhatsApp do grupo.");
  };
  const publicar = async () => {
    try {
      await escSalvar({ data: { id: e.id, ministerioId: m.id, titulo: e.titulo, inicio: e.inicio, local: e.local, observacoes: e.observacoes, vagas: e.vagas.map((v) => ({ id: v.id, funcaoId: v.funcaoId, membroId: v.membroId })), roteiro: e.roteiro, musicas: e.musicas, publicar: true } });
      toast.success("Escala publicada. Os escalados foram avisados.");
      carregar();
    } catch (x) { toast.error(x instanceof Error ? x.message : "Erro"); }
  };
  // agrupa as vagas por função, na ordem do ministério
  const grupos = m.funcoes.map((f) => ({ f, vagas: e.vagas.filter((v) => v.funcaoId === f.id) })).filter((g) => g.vagas.length);

  return (
    <div className="min-h-dvh pb-10">
      <Cabecalho titulo={m.nome} direita={<button onClick={compartilhar} className="grid size-10 place-items-center text-[var(--a-suave)]" aria-label="Compartilhar"><Share2 size={18} /></button>} />
      <div className="a-entra grid gap-5 px-5 pt-5">
        <section>
          <p className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--a-suave)]">
            <IconeMinisterio chave={m.icone} size={14} /> {m.nome}
            {e.situacao === "rascunho" && <span className="bg-[var(--a-realce)] px-2 py-0.5 text-[var(--a-azul)]">Rascunho</span>}
          </p>
          <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[var(--a-azul)]">{e.titulo}</h1>
          <p className="mt-2 flex items-center gap-2 text-[15px] font-semibold"><Clock size={16} className="text-[var(--a-suave)]" /> {dataComDia(diaDe(e.inicio))} · {hora(e.inicio)} <span className="text-[13px] font-bold text-[var(--a-suave)]">({falta(e.inicio)})</span></p>
          {e.local && <p className="mt-1 flex items-center gap-2 text-[14px] text-[var(--a-suave)]"><MapPin size={16} /> {e.local}</p>}
        </section>

        {minhas.length > 0 && e.situacao === "publicada" && (
          <section className="a-cartao grid gap-3 border-t-[3px] !border-t-[#00436f] p-4">
            <p className="a-sobre">Você nesta escala</p>
            {minhas.map((v) => (
              <div key={v.id} className="grid gap-3">
                <div className="flex items-center justify-between gap-2"><span className="text-[17px] font-bold">{v.funcao}</span><Selo r={v.resposta} /></div>
                {!passou && (v.resposta === "pendente" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setRecusa(v.id); setMotivo(""); }} className="a-btn a-btn-sec !text-[var(--a-vermelho)]">Não poderei</button>
                    <button onClick={() => responder(v.id, "confirmado")} className="a-btn a-btn-pri">Confirmar</button>
                  </div>
                ) : (
                  <button onClick={() => responder(v.id, "pendente")} className="justify-self-start text-[12.5px] font-semibold text-[var(--a-suave)] underline underline-offset-4">Mudar a minha resposta</button>
                ))}
              </div>
            ))}
          </section>
        )}

        {lider && (
          <section className="grid gap-2">
            {e.situacao === "rascunho" && <p className="text-[13.5px] text-[var(--a-suave)]">Só a liderança vê este rascunho. Ao publicar, cada escalado recebe a notificação para confirmar.</p>}
            <div className="grid grid-cols-2 gap-2">
              <Link to="/app/escala/editar/$id" params={{ id: e.id }} search={{ min: m.id }} className="a-btn a-btn-sec"><Pencil size={16} /> Editar</Link>
              {e.situacao === "rascunho" ? <button onClick={publicar} disabled={!e.preenchidas} className="a-btn a-btn-pri"><Send size={16} /> Publicar</button>
                : <button onClick={compartilhar} className="a-btn a-btn-pri"><Share2 size={16} /> Enviar</button>}
            </div>
          </section>
        )}

        <section className="grid gap-2">
          <div className="flex items-end justify-between"><p className="a-sobre">Equipe</p><p className="text-[12.5px] font-semibold text-[var(--a-suave)]">{e.confirmados} de {e.preenchidas} confirmados</p></div>
          <div className="a-cartao">
            {grupos.map(({ f, vagas }) => (
              <div key={f.id} className="border-b border-[var(--a-borda)] px-4 py-3 last:border-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--a-suave)]">{f.nome}</p>
                {vagas.map((v) => (
                  <div key={v.id} className="mt-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-[15px] font-semibold", !v.membroId && "italic text-[var(--a-suave)]", e.minhas.includes(v.id) && "text-[var(--a-azul)]")}>{v.nome ?? "A definir"}</span>
                      {v.membroId && e.situacao === "publicada" && <Selo r={v.resposta} pequeno />}
                    </div>
                    {lider && v.motivo && <p className="text-[12.5px] text-[var(--a-vermelho)]">“{v.motivo}”</p>}
                    {lider && alertas[v.id]?.map((a) => <p key={a} className="mt-0.5 flex items-start gap-1.5 text-[12.5px] font-semibold text-[var(--a-vermelho)]"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {a}</p>)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {e.musicas.length > 0 && (
          <section className="grid gap-2">
            <p className="a-sobre"><Music size={13} /> Músicas</p>
            <ol className="a-cartao">
              {e.musicas.map((mu, i) => (
                <li key={mu.id} className="flex items-start gap-3 border-b border-[var(--a-borda)] px-4 py-3 last:border-0">
                  <span className="w-5 pt-0.5 text-[13px] font-bold text-[var(--a-suave)]">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    {mu.hino ? <Link to="/app/hinario" search={{ n: mu.hino }} className="text-[15px] font-semibold text-[var(--a-azul)] underline-offset-4 hover:underline">{mu.hino} · {mu.titulo}</Link> : <span className="text-[15px] font-semibold">{mu.titulo}</span>}
                    {(mu.artista || mu.obs) && <span className="block text-[12.5px] text-[var(--a-suave)]">{[mu.artista, mu.obs].filter(Boolean).join(" · ")}</span>}
                    {mu.link && <a href={mu.link} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--a-azul)]"><ExternalLink size={13} /> Ouvir / cifra</a>}
                  </span>
                  {mu.tom && <span className="shrink-0 border border-[var(--a-borda)] px-2 py-0.5 text-[13px] font-bold">{mu.tom}</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {e.roteiro.length > 0 && (
          <section className="grid gap-2">
            <div className="flex items-end justify-between"><p className="a-sobre"><ListOrdered size={13} /> Roteiro</p>{duracaoRoteiro(e.roteiro) > 0 && <p className="text-[12.5px] font-semibold text-[var(--a-suave)]">{duracaoRoteiro(e.roteiro)} min</p>}</div>
            <ol className="a-cartao">
              {(() => { let t = new Date(e.inicio).getTime(); return e.roteiro.map((r) => { const ini = t; t += (r.minutos ?? 0) * 60_000; return (
                <li key={r.id} className="flex items-start gap-3 border-b border-[var(--a-borda)] px-4 py-2.5 last:border-0">
                  <span className="w-12 shrink-0 pt-0.5 text-[12.5px] font-bold tabular-nums text-[var(--a-suave)]">{hora(new Date(ini).toISOString())}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-semibold">{r.item}</span>{r.obs && <span className="block text-[12.5px] text-[var(--a-suave)]">{r.obs}</span>}</span>
                  {r.minutos ? <span className="shrink-0 text-[12.5px] text-[var(--a-suave)]">{r.minutos} min</span> : null}
                </li>
              ); }); })()}
            </ol>
          </section>
        )}

        {e.observacoes && <section className="a-cartao flex gap-3 p-4 text-[14.5px] leading-relaxed"><StickyNote size={17} className="mt-0.5 shrink-0 text-[var(--a-suave)]" /><p className="whitespace-pre-line">{e.observacoes}</p></section>}

        {lider && (
          <section className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--a-borda)] pt-4">
            {e.historico && <button onClick={() => setHistorico(true)} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--a-suave)]"><History size={15} /> Histórico</button>}
            <button onClick={async () => { if (!confirm(e.situacao === "publicada" ? "Cancelar esta escala? Os escalados serão avisados." : "Apagar este rascunho?")) return; await escExcluir({ data: { id: e.id } }); toast.success("Escala apagada."); navigate({ to: "/app/ministerio/$id", params: { id: m.id } }); }} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--a-vermelho)]"><Trash2 size={15} /> {e.situacao === "publicada" ? "Cancelar escala" : "Apagar rascunho"}</button>
          </section>
        )}
      </div>

      {recusa && (
        <Folha titulo="Não poderei servir" aoFechar={() => setRecusa(null)}>
          <p className="text-[14px] text-[var(--a-suave)]">A liderança é avisada para achar alguém no seu lugar.</p>
          <label><Rotulo>Motivo (opcional, só a liderança vê)</Rotulo><textarea value={motivo} onChange={(x) => setMotivo(x.target.value)} rows={3} maxLength={300} className="a-campo !h-auto py-3" /></label>
          <button onClick={async () => { await responder(recusa, "recusado", motivo); setRecusa(null); }} className="a-btn bg-[var(--a-vermelho)] text-white">Avisar a liderança</button>
        </Folha>
      )}
      {historico && e.historico && (
        <Folha titulo="Histórico da escala" aoFechar={() => setHistorico(false)}>
          <ul className="grid gap-2">
            {[...e.historico].reverse().map((h, i) => <li key={i} className="text-[14px]"><span className="font-semibold">{h.quem}</span> · {h.o}<span className="block text-[12px] text-[var(--a-suave)]">{dataHora(h.em)}</span></li>)}
          </ul>
        </Folha>
      )}
    </div>
  );
}
