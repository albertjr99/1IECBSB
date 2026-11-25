import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, CalendarDays, ChevronRight, Clock, Gift, Newspaper, Video, Vote } from "lucide-react";
import { toast } from "sonner";
import { appEntrarReuniao, appInicio } from "@/lib/api-app";
import { obterConteudoPublico } from "@/lib/api";
import { useMembro } from "@/components/app/contexto";
import { primeiroNome, salaAberta } from "@/lib/membros";
import { hojeISO, periodo } from "@/lib/utils";
import type { Conteudo } from "@/lib/conteudo";
import { Avatar } from "@/components/painel/Avatar";
import { dataBR, emBrasilia, dataComDia, diaBrasilia, quando } from "@/lib/datas";

export const Route = createFileRoute("/app/")({ component: Inicio });

type Dados = Awaited<ReturnType<typeof appInicio>>;

function saudacao() {
  const h = emBrasilia().hora;
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function proximoEncontro(dias: Conteudo["programacao"]["dias"]) {
  const agora = emBrasilia(); // horário de Brasília, também no servidor
  for (let k = 0; k < 8; k++) {
    const dia = dias.find((x) => x.diaSemana === (agora.semana + k) % 7);
    if (!dia) continue;
    const itens = dia.itens
      .map((it) => { const m = /(\d{1,2})h(\d{2})?/.exec(it.horario); return { it, min: m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : 0 }; })
      .filter((x) => /culto|estudo|ebd|escola|consagra|ora/i.test(x.it.titulo) && (k > 0 || x.min > agora.hora * 60 + agora.minuto))
      .sort((a, b) => a.min - b.min);
    if (itens[0]) return { quando: k === 0 ? "Hoje" : k === 1 ? "Amanhã" : dia.dia, ...itens[0].it };
  }
  return null;
}

function Secao({ titulo, para, children }: { titulo: string; para?: string; children: React.ReactNode }) {
  return (
    <section className="px-5">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--a-suave)]">{titulo}</h2>
        {para && <Link to={para} className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--a-azul)]">Ver tudo</Link>}
      </div>
      {children}
    </section>
  );
}

function Inicio() {
  const { membro } = useMembro();
  const [d, setD] = useState<Dados | null>(null);
  const [c, setC] = useState<Conteudo | null>(null);
  useEffect(() => {
    appInicio().then(setD).catch((e) => toast.error(e.message));
    obterConteudoPublico().then(setC).catch(() => {});
  }, []);
  const hoje = hojeISO();
  const aniversario = membro.nascimento && membro.nascimento.slice(5) === hoje.slice(5);
  const prox = c ? proximoEncontro(c.programacao.dias) : null;
  const eventos = (c?.eventos.itens ?? []).filter((e) => e.publicado && (e.dataFim || e.data) >= hoje).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 3);
  const pendentes = d?.votacoes.filter((v) => v.situacao === "em_andamento" && !v.votou) ?? [];
  const ultima = membro.ultimaLeitura;

  return (
    <div className="a-entra grid gap-6">
      <header className="a-topo">
        <div className="flex items-center justify-between">
          <img src="/marca/logo-horizontal-negativo-branco-cruz-vermelha.svg" alt="1ª IEC Brasília" className="h-8 w-auto" />
          <Link to="/app/mais" aria-label="Meu perfil"><Avatar nome={membro.nome} foto={membro.foto} tamanho={38} className="ring-2 ring-white/25" /></Link>
        </div>
        <p className="mt-7 text-[14px] text-white/70">{dataComDia(diaBrasilia())}</p>
        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">{saudacao()}, {primeiroNome(membro.nome)}</h1>
        {prox && (
          <div className="mt-5 flex items-center gap-3 border border-white/20 bg-white/[0.08] px-4 py-3 backdrop-blur">
            <Clock size={18} className="shrink-0 text-white/80" />
            <div className="min-w-0 text-[13.5px]"><span className="font-bold">{prox.quando}, {prox.horario}</span> · {prox.titulo}</div>
          </div>
        )}
      </header>

      {aniversario && (
        <div className="mx-5 flex items-center gap-4 border-l-[3px] border-[var(--a-vermelho)] bg-[var(--a-sup)] px-4 py-4 shadow-sm">
          <Gift size={26} className="shrink-0 text-[var(--a-azul)]" />
          <p className="text-[14.5px] leading-snug"><strong>Feliz aniversário, {primeiroNome(membro.nome)}!</strong> A igreja agradece a Deus pela sua vida.</p>
        </div>
      )}

      {pendentes.length > 0 && (
        <Secao titulo="Sua participação">
          <div className="grid gap-2">
            {pendentes.map((v) => (
              <a key={v.id} href={`/votar/${v.token}`} className="a-cartao a-filete flex items-center gap-4 px-4 py-4">
                <Vote size={24} className="shrink-0 text-[var(--a-azul)]" />
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{v.titulo}</span><span className="text-[12.5px] text-[var(--a-suave)]">Votação aberta até {quando(v.fim)}</span></span>
                <span className="a-btn a-btn-pri !h-10 !px-4 !text-[11px]">Votar</span>
              </a>
            ))}
          </div>
        </Secao>
      )}

      {d?.reunioes.length ? (
        <Secao titulo="Reuniões online">
          <div className="grid gap-2">
            {d.reunioes.map((r) => {
              const aberta = salaAberta({ ...r, presencas: [] });
              return (
                <div key={r.id} className="a-cartao flex items-center gap-4 px-4 py-4">
                  <Video size={22} className="shrink-0 text-[var(--a-azul)]" />
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{r.titulo}</span><span className="text-[12.5px] text-[var(--a-suave)]">{quando(r.inicio)}</span></span>
                  <button disabled={!aberta} onClick={async () => { try { const { url } = await appEntrarReuniao({ data: { id: r.id } }); window.open(url, "_blank"); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } }} className="a-btn a-btn-pri !h-10 !px-4 !text-[11px]">{aberta ? "Entrar" : "Em breve"}</button>
                </div>
              );
            })}
          </div>
        </Secao>
      ) : null}

      {d?.boletim?.versiculo && (
        <Secao titulo="Versículo da semana">
          <figure className="a-cartao a-filete px-5 py-5">
            <blockquote className="font-serif text-[19px] italic leading-relaxed">“{d.boletim.versiculo}”</blockquote>
            <figcaption className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--a-suave)]">{d.boletim.referencia}</figcaption>
          </figure>
        </Secao>
      )}

      <Secao titulo="Para você">
        <div className="grid grid-cols-2 gap-2">
          <Link to="/app/biblia" search={{ ref: undefined }} className="a-cartao flex flex-col gap-3 px-4 py-4">
            <BookOpen size={22} className="text-[var(--a-azul)]" />
            <span><span className="block text-[14.5px] font-bold">{ultima ? "Continuar leitura" : "Bíblia"}</span><span className="text-[12px] text-[var(--a-suave)]">{ultima ? `${ultima.livro} ${ultima.capitulo}` : "Duas versões, sem internet"}</span></span>
          </Link>
          {d?.boletim ? (
            <Link to="/app/boletim/$data" params={{ data: d.boletim.data }} className="a-cartao flex flex-col gap-3 px-4 py-4">
              <Newspaper size={22} className="text-[var(--a-azul)]" />
              <span><span className="block text-[14.5px] font-bold">Boletim</span><span className="line-clamp-2 text-[12px] text-[var(--a-suave)]">{d.boletim.pastoral || "Desta semana"}</span></span>
            </Link>
          ) : null}
        </div>
      </Secao>

      {d && d.avisos.length > 0 && (
        <Secao titulo="Avisos da semana" {...(d.boletim ? { para: `/app/boletim/${d.boletim.data}` } : {})}>
          <ul className="a-cartao divide-y divide-[var(--a-borda)]">
            {d.avisos.map((a) => (
              <li key={a.titulo} className="px-4 py-3.5">
                <p className="text-[14.5px] font-bold text-[var(--a-azul)]">{a.titulo}</p>
                <p className="mt-1 line-clamp-3 text-[13.5px] leading-relaxed text-[var(--a-texto)]/85">{a.texto.replace(/\*\*?/g, "")}</p>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {eventos.length > 0 && (
        <Secao titulo="Próximos eventos">
          <ul className="a-cartao divide-y divide-[var(--a-borda)]">
            {eventos.map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-4 py-3.5">
                <span className="w-11 shrink-0 text-center text-[var(--a-azul)]"><span className="block text-[22px] font-bold leading-none">{e.data.slice(8, 10)}</span><span className="text-[9.5px] font-bold uppercase tracking-[0.16em]">/{dataBR(e.data).slice(3, 5)}</span></span>
                <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-bold leading-snug">{e.titulo}</span><span className="text-[12px] text-[var(--a-suave)]">{periodo(e.data, e.dataFim)}{e.horario && ` · ${e.horario}`}</span></span>
                <CalendarDays size={16} className="shrink-0 text-[var(--a-suave)]" />
              </li>
            ))}
          </ul>
        </Secao>
      )}
      <Link to="/app/mais" className="mx-5 flex items-center justify-between border-t border-[var(--a-borda)] py-4 text-[13px] font-semibold text-[var(--a-suave)]">Votações, reuniões, boletins e perfil <ChevronRight size={16} /></Link>
    </div>
  );
}
