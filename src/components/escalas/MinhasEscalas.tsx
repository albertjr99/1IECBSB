/** Aba "Escalas" do Participar: o que eu sirvo, meus ministérios e minhas ausências. */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarOff, ChevronRight, Crown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { escAusencia, escAusenciaRemover, escResponder, type escInicio } from "@/lib/api-escalas";
import { dataBR, dataComDia, hora } from "@/lib/datas";
import { diaDe } from "@/lib/escalas";
import { cn } from "@/lib/utils";
import { IconeMinisterio } from "./icones";
import { Folha, Rotulo, Selo, falta } from "./comum";

export type DadosEscalas = Awaited<ReturnType<typeof escInicio>>;

export function MinhasEscalas({ d, recarregar }: { d: DadosEscalas; recarregar: () => void }) {
  const [ausencia, setAusencia] = useState<{ de: string; ate: string; motivo: string } | null>(null);
  const [recusa, setRecusa] = useState<{ id: string; vagaId: string; motivo: string; titulo: string } | null>(null);
  const responder = async (id: string, vagaId: string, resposta: "confirmado" | "recusado", motivo?: string) => {
    try { await escResponder({ data: { id, vagaId, resposta, motivo } }); toast.success(resposta === "confirmado" ? "Presença confirmada. Obrigado!" : "A liderança foi avisada."); recarregar(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível responder."); }
  };

  if (!d.ministerios.length) {
    return (
      <div className="a-cartao grid gap-2 p-6 text-center text-[14px] text-[var(--a-suave)]">
        <p className="text-[16px] font-bold text-[var(--a-texto)]">Você ainda não está em nenhum ministério</p>
        <p>Quando a liderança incluir você (no Louvor, na Recepção, na Multimídia…), as suas escalas aparecem aqui para confirmar.</p>
      </div>
    );
  }
  const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <p className="a-sobre">Quando eu sirvo</p>
        {d.proximas.length === 0 ? <div className="a-cartao p-5 text-[14px] text-[var(--a-suave)]">Nenhuma escala publicada com o seu nome por enquanto.</div> : d.proximas.map((e) => {
          const minhas = e.vagas.filter((v) => e.minhas.includes(v.id));
          const pendente = minhas.some((v) => v.resposta === "pendente");
          return (
            <div key={e.id} className={cn("a-cartao overflow-hidden", pendente && "!border-[#00436f]")}>
              <Link to="/app/escala/$id" params={{ id: e.id }} className="block p-[18px]">
                <p className="flex items-center justify-between gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--a-suave)]">
                  <span className="inline-flex items-center gap-1.5"><IconeMinisterio chave={e.icone} size={14} /> {e.ministerio}</span>
                  <span className={cn(falta(e.inicio) === "Hoje" || falta(e.inicio) === "Amanhã" ? "text-[var(--a-vermelho)]" : "")}>{falta(e.inicio)}</span>
                </p>
                <p className="mt-2 text-[18px] font-bold leading-snug text-[var(--a-azul)]">{e.titulo}</p>
                <p className="mt-0.5 text-[14px] text-[var(--a-suave)]">{dataComDia(diaDe(e.inicio))} · {hora(e.inicio)}{e.local ? ` · ${e.local}` : ""}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {minhas.map((v) => <span key={v.id} className="inline-flex items-center gap-2 bg-[var(--a-realce)] px-2.5 py-1 text-[13px] font-bold text-[var(--a-azul)]">{v.funcao}</span>)}
                  {minhas.map((v) => <Selo key={`s${v.id}`} r={v.resposta} />).slice(0, 1)}
                </div>
                <p className="mt-2 text-[12.5px] text-[var(--a-suave)]">{e.confirmados} de {e.preenchidas} confirmados{e.musicas.length ? ` · ${e.musicas.length} músicas` : ""}</p>
              </Link>
              {pendente && (
                <div className="grid grid-cols-2 border-t border-[var(--a-borda)]">
                  <button onClick={() => setRecusa({ id: e.id, vagaId: minhas[0]!.id, motivo: "", titulo: e.titulo })} className="h-12 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--a-vermelho)]">Não poderei</button>
                  <button onClick={() => Promise.all(minhas.filter((v) => v.resposta === "pendente").map((v) => responder(e.id, v.id, "confirmado")))} className="h-12 bg-[#00436f] text-[12px] font-bold uppercase tracking-[0.12em] text-white">Confirmar</button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="grid gap-3">
        <p className="a-sobre">Meus ministérios</p>
        <div className="grid gap-2">
          {d.ministerios.map((m) => {
            const corpo = (
              <>
                <span className="grid size-11 shrink-0 place-items-center bg-[#00436f] text-white"><IconeMinisterio chave={m.icone} size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[16px] font-bold">{m.nome}{m.lider && <Crown size={14} className="text-[var(--a-vermelho)]" aria-label="Líder" />}</span>
                  <span className="block truncate text-[13px] text-[var(--a-suave)]">{m.funcoes.join(", ") || "Sem função definida"} · {m.pessoas} pessoas</span>
                  {m.lider && (m.rascunhos > 0 || m.recusas > 0) && (
                    <span className="mt-1 flex flex-wrap gap-2 text-[11.5px] font-bold">
                      {m.recusas > 0 && <span className="text-[var(--a-vermelho)]">{m.recusas} com ausência avisada</span>}
                      {m.rascunhos > 0 && <span className="text-[var(--a-azul)]">{m.rascunhos} em rascunho</span>}
                    </span>
                  )}
                </span>
                {m.lider && <ChevronRight size={18} className="text-[var(--a-suave)]" />}
              </>
            );
            return m.lider
              ? <Link key={m.id} to="/app/ministerio/$id" params={{ id: m.id }} className="a-cartao flex items-center gap-3 p-3.5">{corpo}</Link>
              : <div key={m.id} className="a-cartao flex items-center gap-3 p-3.5">{corpo}</div>;
          })}
        </div>
        {d.ministerios.some((m) => m.lider) && <p className="text-[12.5px] text-[var(--a-suave)]">Você lidera: toque no ministério para montar e publicar as escalas.</p>}
      </section>

      <section className="grid gap-3">
        <div className="flex items-end justify-between">
          <p className="a-sobre">Minhas ausências</p>
          <button onClick={() => setAusencia({ de: hoje, ate: hoje, motivo: "" })} className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--a-azul)]"><Plus size={15} /> Marcar</button>
        </div>
        {d.ausencias.length === 0 ? <p className="text-[13.5px] text-[var(--a-suave)]">Vai viajar ou não poderá servir em algumas datas? Marque aqui e a liderança já vê ao montar a escala.</p> : (
          <ul className="a-cartao">
            {d.ausencias.map((a) => (
              <li key={a.id} className="flex items-center gap-3 border-b border-[var(--a-borda)] px-4 py-3 last:border-0">
                <CalendarOff size={18} className="shrink-0 text-[var(--a-suave)]" />
                <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-semibold">{a.de === a.ate ? dataBR(a.de) : `${dataBR(a.de)} a ${dataBR(a.ate)}`}</span>{a.motivo && <span className="block text-[12.5px] text-[var(--a-suave)]">{a.motivo}</span>}</span>
                <button onClick={async () => { await escAusenciaRemover({ data: { id: a.id } }); recarregar(); }} className="grid size-9 place-items-center text-[var(--a-suave)]" aria-label="Remover"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {d.recentes.length > 0 && (
        <section className="grid gap-2">
          <p className="a-sobre">Servi recentemente</p>
          <ul className="a-cartao">
            {d.recentes.map((e) => (
              <li key={e.id}><Link to="/app/escala/$id" params={{ id: e.id }} className="flex items-center gap-3 border-b border-[var(--a-borda)] px-4 py-3 text-[14px] last:border-0">
                <span className="w-[82px] shrink-0 text-[12.5px] font-semibold text-[var(--a-suave)]">{dataBR(diaDe(e.inicio))}</span>
                <span className="min-w-0 flex-1 truncate">{e.ministerio} · {e.titulo}</span>
              </Link></li>
            ))}
          </ul>
        </section>
      )}

      {ausencia && (
        <Folha titulo="Marcar ausência" aoFechar={() => setAusencia(null)}>
          <div className="grid grid-cols-2 gap-3">
            <label><Rotulo>De</Rotulo><input type="date" value={ausencia.de} min={hoje} onChange={(e) => setAusencia({ ...ausencia, de: e.target.value, ate: e.target.value > ausencia.ate ? e.target.value : ausencia.ate })} className="a-campo" /></label>
            <label><Rotulo>Até</Rotulo><input type="date" value={ausencia.ate} min={ausencia.de} onChange={(e) => setAusencia({ ...ausencia, ate: e.target.value })} className="a-campo" /></label>
          </div>
          <label><Rotulo>Motivo (opcional, só a liderança vê)</Rotulo><input value={ausencia.motivo} onChange={(e) => setAusencia({ ...ausencia, motivo: e.target.value })} placeholder="Ex.: viagem" className="a-campo" maxLength={120} /></label>
          <button onClick={async () => { try { await escAusencia({ data: ausencia }); toast.success("Ausência marcada."); setAusencia(null); recarregar(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } }} className="a-btn a-btn-pri">Salvar</button>
        </Folha>
      )}
      {recusa && (
        <Folha titulo="Não poderei servir" aoFechar={() => setRecusa(null)}>
          <p className="text-[14px] text-[var(--a-suave)]">{recusa.titulo}: a liderança é avisada para achar alguém no seu lugar.</p>
          <label><Rotulo>Motivo (opcional, só a liderança vê)</Rotulo><textarea value={recusa.motivo} onChange={(e) => setRecusa({ ...recusa, motivo: e.target.value })} rows={3} maxLength={300} className="a-campo !h-auto py-3" /></label>
          <button onClick={async () => { const e = d.proximas.find((x) => x.id === recusa.id); for (const v of e?.vagas.filter((x) => e.minhas.includes(x.id) && x.resposta === "pendente") ?? []) await responder(recusa.id, v.id, "recusado", recusa.motivo); setRecusa(null); }} className="a-btn bg-[var(--a-vermelho)] text-white">Avisar a liderança</button>
        </Folha>
      )}
    </div>
  );
}
