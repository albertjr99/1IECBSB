import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CalendarClock, Check, CheckCircle2, Loader2, Lock, ShieldCheck } from "lucide-react";
import { abrirCedula, votar } from "@/lib/api-votacao";
import { SIGILO_DESC, SIGILO_ROTULO } from "@/lib/votacao";
import { useConteudo } from "@/lib/contexto";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/votar/$token")({
  ssr: false,
  loader: ({ params }) => abrirCedula({ data: { token: params.token } }),
  head: () => ({ meta: [{ title: "Votação online" }, { name: "robots", content: "noindex" }] }),
  component: Cedula,
  pendingComponent: () => <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-marca" /></div>,
});

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

function Moldura({ children }: { children: React.ReactNode }) {
  const { geral } = useConteudo();
  return (
    <div className="relative min-h-screen overflow-hidden bg-marca-funda px-4 py-10 sm:py-16">
      <div className="relative mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <img src="/simbolo-negativo.svg" alt="" className="w-12" />
          <span className="text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-white/85">{geral.nome}</span>
        </div>
        <div className="rounded-lg bg-white p-6 sm:p-9">{children}</div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[12px] text-white/50"><ShieldCheck size={13} /> Link pessoal e intransferível — vale um único voto.</p>
      </div>
    </div>
  );
}

function Cedula() {
  const d = Route.useLoaderData();
  const { token } = Route.useParams();
  const router = useRouter();
  const [escolha, setEscolha] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [comprovante, setComprovante] = useState<string | null>(null);

  if (!d.encontrada) {
    return <Moldura><h1 className="text-xl font-semibold text-marca-funda">Link inválido</h1><p className="mt-2 text-tinta-suave">Este link de votação não existe ou foi removido. Confira com a secretaria da igreja.</p></Moldura>;
  }

  const enviar = async () => {
    if (!escolha) return;
    setEnviando(true);
    setErro("");
    try {
      const r = await votar({ data: { token, opcao: escolha } });
      if (r.ok) setComprovante(r.comprovante);
      else { setErro(r.erro); setConfirmando(false); router.invalidate(); }
    } catch {
      setErro("Não foi possível registrar o voto. Verifique a conexão e tente de novo.");
    } finally { setEnviando(false); }
  };

  const textoOpcao = d.opcoes.find((o) => o.id === escolha)?.texto;

  return (
    <Moldura>
      <h1 className="mt-2 text-2xl font-bold text-marca-funda sm:text-[1.75rem]">{d.titulo}</h1>
      {d.descricao && <p className="mt-3 whitespace-pre-line text-[15.5px] text-tinta-suave">{d.descricao}</p>}
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-y border-linha/60 py-3 text-[13px] text-tinta-suave">
        <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} className="text-destaque" /> Até {quando(d.fim)}</span>
        <span className="inline-flex items-center gap-1.5" title={SIGILO_DESC[d.sigilo]}><Lock size={14} className="text-destaque" /> {SIGILO_ROTULO[d.sigilo]}</span>
      </div>

      {comprovante ? (
        <div className="mt-8 text-center">
          <CheckCircle2 size={56} className="mx-auto text-emerald-600" />
          <h2 className="mt-3 text-xl font-semibold text-marca-funda">Voto registrado!</h2>
          <p className="mt-1 text-tinta-suave">Obrigado, {d.eleitor.split(" ")[0]}. Seu voto foi computado.</p>
          <p className="mt-5 text-[12px] uppercase tracking-wider text-tinta-suave">Comprovante</p>
          <p className="font-mono text-lg font-bold tracking-widest text-marca">{comprovante}</p>
          <p className="mt-4 text-[13px] text-tinta-suave">O resultado aparece neste mesmo link quando a votação for encerrada.</p>
        </div>
      ) : d.situacao === "encerrada" ? (
        <div className="mt-6">
          <h2 className="font-bold text-marca-funda">Votação encerrada</h2>
          {d.resultado && (
            <ul className="mt-4 grid gap-3">
              {d.resultado.contagem.map((c) => {
                const pct = d.resultado!.votaram ? Math.round((c.votos / d.resultado!.votaram) * 100) : 0;
                return (
                  <li key={c.id}>
                    <div className="flex justify-between text-[15px]"><span className="font-semibold">{c.texto}</span><span>{c.votos} voto(s) · {pct}%</span></div>
                    <div className="mt-1 h-3 overflow-hidden rounded-full bg-marca-clara"><div className="h-full rounded-full bg-marca" style={{ width: `${pct}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
          {d.resultado && <p className="mt-4 text-[13px] text-tinta-suave">Participação: {d.resultado.votaram} de {d.resultado.totalEleitores}.</p>}
        </div>
      ) : d.jaVotou ? (
        <div className="mt-8 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-600" />
          <h2 className="mt-3 text-lg font-bold text-marca-funda">Seu voto já foi registrado</h2>
          <p className="mt-1 text-tinta-suave">O resultado aparece aqui quando a votação for encerrada.</p>
        </div>
      ) : d.situacao === "agendada" || d.situacao === "rascunho" ? (
        <div className="mt-6 rounded-md bg-marca-clara p-5 text-marca">
          <p className="font-semibold">A votação ainda não começou.</p>
          {d.situacao === "agendada" && <p className="mt-1 text-[14px]">Abre {quando(d.inicio)}. Volte por este mesmo link.</p>}
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-[15px]">Olá, <strong>{d.eleitor}</strong>. Escolha uma opção:</p>
          <div className="mt-4 grid gap-2.5" role="radiogroup">
            {d.opcoes.map((o) => (
              <button
                key={o.id}
                role="radio"
                aria-checked={escolha === o.id}
                disabled={confirmando}
                onClick={() => setEscolha(o.id)}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-5 py-4 text-left text-[16px] font-medium transition-colors",
                  escolha === o.id ? "border-marca bg-marca-clara text-marca" : "border-linha hover:border-marca/40",
                )}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", escolha === o.id ? "border-marca bg-marca text-white" : "border-linha")}>
                  {escolha === o.id && <Check size={14} />}
                </span>
                {o.texto}
              </button>
            ))}
          </div>
          {erro && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700" role="alert">{erro}</p>}
          {!confirmando ? (
            <button disabled={!escolha} onClick={() => setConfirmando(true)} className="btn-primario mt-6 w-full !py-4 text-[15px]">Continuar</button>
          ) : (
            <div className="mt-6 rounded-md border border-marca/30 bg-marca-clara p-5">
              <p className="text-[15px]">Confirma o voto em <strong>“{textoOpcao}”</strong>? Depois de confirmado, não é possível alterar.</p>
              <div className="mt-4 flex gap-2">
                <button disabled={enviando} onClick={() => setConfirmando(false)} className="btn-contorno flex-1">Voltar</button>
                <button disabled={enviando} onClick={enviar} className="btn-destaque flex-1">{enviando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Confirmar voto</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Moldura>
  );
}
