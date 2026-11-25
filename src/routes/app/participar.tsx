import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Clock, Lock, Radio, Users, Video, Vote } from "lucide-react";
import { toast } from "sonner";
import { appEntrarReuniao, appParticipar } from "@/lib/api-app";
import { cn } from "@/lib/utils";
import { quandoLongo } from "@/lib/datas";

export const Route = createFileRoute("/app/participar")({ component: Participar });

type Dados = Awaited<ReturnType<typeof appParticipar>>;
const SIGILO = { secreta: "Voto secreto", presidencia: "Voto visível só à presidência", aberta: "Voto aberto" } as const;
const quando = (iso: string) => quandoLongo(iso);
function falta(iso: string) {
  const min = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (min <= 0) return "agora";
  if (min < 60) return `em ${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `em ${h} h` : `em ${Math.round(h / 24)} dias`;
}

function Participar() {
  const [d, setD] = useState<Dados | null>(null);
  const [aba, setAba] = useState<"votacoes" | "reunioes">("votacoes");
  const carregar = useCallback(() => appParticipar().then(setD).catch((e) => toast.error(e instanceof Error ? e.message : "Sem conexão.")), []);
  useEffect(() => { carregar(); const t = setInterval(carregar, 45_000); return () => clearInterval(t); }, [carregar]);
  const abertas = d?.votacoes.filter((v) => v.situacao === "em_andamento" && !v.votou).length ?? 0;
  const aoVivo = d?.reunioes.filter((r) => r.aoVivo && !r.cancelada).length ?? 0;
  const entrar = async (id: string) => {
    try { const { url } = await appEntrarReuniao({ data: { id } }); window.open(url, "_blank"); carregar(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível entrar."); }
  };
  return (
    <div className="a-entra grid gap-5 pb-6">
      <header className="a-topo">
        <p className="a-sobre !text-white/80">Igreja</p>
        <h1 className="mt-2 text-[28px] font-bold tracking-[-0.02em]">Participar</h1>
        <p className="mt-1 text-[14px] text-white/75">Votações da igreja e reuniões online, direto pelo celular.</p>
      </header>
      <div className="mx-5 grid grid-cols-2 border border-[var(--a-borda)] bg-[var(--a-sup)]">
        {([["votacoes", "Votações", Vote, abertas], ["reunioes", "Reuniões", Video, aoVivo]] as const).map(([k, r, I, n]) => (
          <button key={k} onClick={() => setAba(k)} className={cn("flex h-12 items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em]", aba === k ? "bg-[#00436f] text-white" : "text-[var(--a-suave)]")}>
            <I size={17} /> {r}{n > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-[var(--a-vermelho)] px-1.5 text-[11px] text-white">{n}</span>}
          </button>
        ))}
      </div>
      <div className="grid gap-3 px-5">
        {!d ? <div className="h-32 animate-pulse bg-[var(--a-borda)]" /> : aba === "votacoes" ? (
          d.votacoes.length === 0 ? <Vazio texto="Nenhuma votação para você no momento. Quando a igreja abrir uma votação, ela aparece aqui." /> :
          d.votacoes.map((v) => {
            const aberta = v.situacao === "em_andamento"; const pendente = aberta && !v.votou;
            const pct = v.participacao.eleitores ? Math.round((v.participacao.votaram / v.participacao.eleitores) * 100) : 0;
            return (
              <Link key={v.id} to="/votar/$token" params={{ token: v.token }} className={cn("a-cartao block p-[18px]", pendente && "!border-[#00436f] !bg-[#00436f] text-white")}>
                <p className={cn("flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em]", pendente ? "text-[#d9e6ef]" : v.votou ? "text-[var(--a-azul)]" : "text-[var(--a-suave)]")}>
                  {pendente ? <Radio size={14} /> : v.votou ? <CheckCircle2 size={14} /> : v.situacao === "agendada" ? <Clock size={14} /> : <Lock size={14} />}
                  {pendente ? "Aberta · falta o seu voto" : v.votou && aberta ? "Você já votou" : v.situacao === "agendada" ? `Começa ${falta(v.inicio)}` : v.votou ? "Encerrada · você votou" : "Encerrada"}
                </p>
                <p className={cn("mt-2 text-[18px] font-bold leading-snug", !pendente && "text-[var(--a-azul)]")}>{v.titulo}</p>
                {v.descricao && <p className={cn("mt-1 line-clamp-2 text-[14px]", pendente ? "text-white/85" : "")}>{v.descricao}</p>}
                {aberta ? (
                  <div className="mt-3">
                    <div className={cn("h-1", pendente ? "bg-white/25" : "bg-[var(--a-realce)]")}><div className={cn("h-1", pendente ? "bg-white" : "bg-[#00436f]")} style={{ width: `${pct}%` }} /></div>
                    <p className={cn("mt-1.5 text-[12px] font-semibold", pendente ? "text-[#d9e6ef]" : "text-[var(--a-suave)]")}>{v.participacao.votaram} de {v.participacao.eleitores} já votaram · até {quando(v.fim)}</p>
                  </div>
                ) : <p className="mt-2 text-[12.5px] font-semibold text-[var(--a-suave)]">{v.situacao === "agendada" ? quando(v.inicio) : `Encerrada em ${quando(v.fim)}`} · {SIGILO[v.sigilo]}</p>}
                <p className={cn("mt-3 flex items-center justify-end gap-1 text-[12px] font-bold uppercase tracking-[0.12em]", pendente ? "text-white" : "text-[var(--a-azul)]")}>{pendente ? "Votar agora" : v.situacao === "encerrada" ? "Ver resultado" : "Abrir"} <ChevronRight size={17} /></p>
              </Link>
            );
          })
        ) : (
          d.reunioes.length === 0 ? <Vazio texto="Nenhuma reunião online agendada. Quando houver, ela aparece aqui com o botão para entrar." /> :
          <>
            {d.reunioes.map((r) => {
              const vivo = r.aoVivo && !r.cancelada;
              return (
                <div key={r.id} className={cn("a-cartao p-[18px]", !r.passou && "border-t-[3px] !border-t-[#00436f]", vivo && "!bg-[#eaf1f7] dark:!bg-[#002a47]", r.passou && "opacity-80")}>
                  <p className={cn("flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em]", vivo ? "text-[var(--a-vermelho)]" : "text-[var(--a-suave)]")}>
                    {vivo && <span className="size-2 animate-pulse rounded-full bg-[var(--a-vermelho)]" />}
                    {r.cancelada ? "Cancelada" : vivo ? "Acontecendo agora" : r.passou ? (r.participei ? "Realizada · você participou" : "Realizada") : `Começa ${falta(r.inicio)}`}
                  </p>
                  <p className={cn("mt-2 text-[18px] font-bold leading-snug text-[var(--a-azul)]", r.cancelada && "line-through")}>{r.titulo}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-[var(--a-suave)]"><Clock size={14} /> {quando(r.inicio)} · {r.duracaoMin} min</p>
                  {r.descricao && <p className="mt-2 text-[14px]">{r.descricao}</p>}
                  {r.passou ? <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-[var(--a-suave)]"><Users size={14} /> {r.presentes} participante{r.presentes === 1 ? "" : "s"}</p>
                    : !r.cancelada && <button disabled={!vivo} onClick={() => entrar(r.id)} className={cn("mt-3 flex h-12 w-full items-center justify-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.12em]", vivo ? "bg-[#00436f] text-white" : "border-[1.5px] border-[var(--a-borda)] text-[var(--a-suave)]")}><Video size={17} /> {vivo ? "Entrar na reunião" : "A sala abre 15 min antes"}</button>}
                </div>
              );
            })}
            <p className="flex gap-2 text-[12.5px] text-[var(--a-suave)]"><Video size={15} className="mt-0.5 shrink-0" /> As reuniões usam o Jitsi Meet, que abre numa nova aba. A sala abre 15 minutos antes.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <div className="a-cartao p-6 text-center text-[14px] text-[var(--a-suave)]">{texto}</div>;
}
