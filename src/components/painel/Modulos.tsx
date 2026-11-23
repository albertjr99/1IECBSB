import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Landmark, Repeat, Video, Vote, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuloVotacao } from "./votacao/ModuloVotacao";

export function EmBreve({ Icone, titulo, texto, itens }: { Icone: typeof Vote; titulo: string; texto: string; itens: string[] }) {
  return (
    <div className="mx-auto grid max-w-2xl place-items-center p-6 text-center">
      <span className="grid size-16 place-items-center rounded-lg bg-p-realce text-p-acento"><Icone size={28} /></span>
      <span className="mt-5 rounded bg-amber-500/15 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Em breve</span>
      <h2 className="mt-3 text-xl font-semibold">{titulo}</h2>
      <p className="mt-2 text-[15px] text-p-suave">{texto}</p>
      <ul className="mt-6 grid w-full gap-2 text-left sm:grid-cols-2">
        {itens.map((i) => <li key={i} className="rounded-md border border-p-borda bg-p-superficie px-4 py-3 text-[13.5px] text-p-texto-2">{i}</li>)}
      </ul>
    </div>
  );
}

type Escolha = "votacao" | "assembleia";

const OPCOES: { id: Escolha; titulo: string; texto: string; exemplo: string; Icone: typeof Vote; breve?: boolean }[] = [
  {
    id: "votacao", titulo: "Votação Online", Icone: Vote,
    texto: "Pauta com voto pelo celular: link individual para cada votante, voto secreto ou aberto, prazo, quórum e apuração automática.",
    exemplo: "Ex.: eleição de oficiais, aprovação de contas, decisões de assembleia.",
  },
  {
    id: "assembleia", titulo: "Assembleia Online", Icone: Video, breve: true,
    texto: "Reunião por chamada de áudio e vídeo, direto do site: da assembleia da igreja a pequenas reuniões de liderança.",
    exemplo: "Ex.: assembleia geral, reunião do conselho, encontro de departamento.",
  },
];

function JanelaEscolha({ onEscolher, onFechar }: { onEscolher: (e: Escolha) => void; onFechar?: () => void }) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisivel(true), 20); return () => clearTimeout(t); }, []);
  return (
    <div className={cn("absolute inset-0 z-30 grid place-items-center p-4 transition-all duration-300", visivel ? "bg-slate-900/50 backdrop-blur-md" : "bg-slate-900/0 backdrop-blur-0")}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Escolha o tipo de deliberação"
        className={cn("relative w-full max-w-3xl rounded-xl bg-p-superficie p-6 shadow-[0_30px_80px_-20px_rgba(0,30,70,0.5)] transition-all duration-500 sm:p-8", visivel ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-95 opacity-0")}
        style={{ transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      >
        {onFechar && <button onClick={onFechar} className="absolute right-4 top-4 rounded-full p-2 text-p-suave hover:bg-p-hover" aria-label="Fechar"><X size={18} /></button>}
        <h2 className="text-xl font-semibold text-p-texto">Como a igreja vai decidir?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {OPCOES.map((o, i) => (
            <button
              key={o.id}
              onClick={() => onEscolher(o.id)}
              className={cn(
                "group relative flex flex-col gap-2 overflow-hidden rounded-lg border border-p-borda p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-p-acento/50 hover:shadow-xl",
                visivel ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
              )}
              style={{ transitionDelay: visivel ? `${120 + i * 90}ms` : "0ms" }}
            >
                            <span className="relative grid size-12 place-items-center rounded-md bg-p-realce text-p-acento "><o.Icone size={22} /></span>
              <span className="relative mt-2 flex items-center gap-2 text-[16px] font-semibold text-p-texto">
                {o.titulo}
                {o.breve && <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Em breve</span>}
              </span>
              <span className="relative text-[13.5px] leading-relaxed text-p-texto-2">{o.texto}</span>
              <span className="relative text-[12.5px] text-p-suave">{o.exemplo}</span>
              <span className="relative mt-auto inline-flex items-center gap-1.5 pt-3 text-[13px] font-bold text-p-acento">Abrir <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ModuloDeliberacao() {
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const [trocando, setTrocando] = useState(false);
  const outra: Escolha = escolha === "votacao" ? "assembleia" : "votacao";
  return (
    <div className="grid gap-5">
      {escolha && (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <h1 className="text-xl font-bold">Deliberação <span className="font-normal text-p-suave">›</span> {escolha === "votacao" ? "Votação Online" : "Assembleia Online"}</h1>
          <button onClick={() => setTrocando(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-p-borda-forte bg-p-superficie px-3 py-1.5 text-[12.5px] font-semibold text-p-acento hover:border-p-acento">
            <Repeat size={13} /> Ir para {outra === "votacao" ? "Votação Online" : "Assembleia Online"}
          </button>
        </div>
      )}
      {escolha === "votacao" && <ModuloVotacao />}
      {escolha === "assembleia" && (
        <EmBreve
          Icone={Video}
          titulo="Assembleia Online"
          texto="Chamadas de áudio e vídeo pelo próprio site, para assembleias e reuniões de qualquer tamanho."
          itens={["Sala com link de convite", "Áudio, vídeo e compartilhamento de tela", "Lista de presença automática", "Votações durante a reunião", "Gravação e ata", "Funciona no celular"]}
        />
      )}
      {(!escolha || trocando) && <JanelaEscolha onEscolher={(e) => { setEscolha(e); setTrocando(false); }} {...(trocando ? { onFechar: () => setTrocando(false) } : {})} />}
    </div>
  );
}

export function ModuloFinancas() {
  return (
    <EmBreve
      Icone={Landmark}
      titulo="Finanças"
      texto="Controle financeiro da igreja integrado ao painel. Vamos definir juntos as funcionalidades."
      itens={["Dízimos e ofertas por culto", "Caixa e contas bancárias", "Receitas e despesas por categoria", "Balancete e relatórios em PDF", "Comprovantes anexados", "Acesso restrito à tesouraria"]}
    />
  );
}

export function Contorno({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-5xl p-4 sm:p-6">{children}</div>;
}
