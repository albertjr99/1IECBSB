import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Landmark, Repeat, Sparkles, Video, Vote, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuloVotacao } from "./votacao/ModuloVotacao";

export function EmBreve({ Icone, sobre = "Em desenvolvimento", titulo, texto, itens }: { Icone: typeof Vote; sobre?: string; titulo: string; texto: string; itens: string[] }) {
  return (
    <div className="grid gap-6">
      <section className="ef-vitrine relative px-6 py-10 sm:px-10 sm:py-12">
        <Icone aria-hidden strokeWidth={1} className="pointer-events-none absolute -right-6 -top-6 size-56 text-white/[0.06] sm:size-72" />
        <span className="ef-chip-vidro"><span className="ef-ponto ef-ponto-rascunho" /> Em breve</span>
        <p className="ef-sobre mt-6 !text-white/80">{sobre}</p>
        <h2 className="mt-3 max-w-[22ch] text-[clamp(26px,3vw,38px)] font-bold leading-[1.08] tracking-[-0.025em]">{titulo}</h2>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-white/75">{texto}</p>
      </section>
      <section className="ef-peca ef-peca-filete">
        <h3 className="ef-h2 border-b border-p-borda px-6 py-4">O que vem por aí</h3>
        <ol className="grid sm:grid-cols-2">
          {itens.map((i, n) => (
            <li key={i} className="flex gap-4 border-b border-p-borda px-6 py-4 text-[14.5px] text-p-texto-2 sm:odd:border-r">
              <span className="ef-num shrink-0 text-[12px] font-bold text-p-acento">{String(n + 1).padStart(2, "0")}</span> {i}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** Endereço do Gratia Ars para a igreja — preencher quando estiver no ar. */
const GRATIA_ARS_URL = "";

export function ModuloAgentes() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-4 sm:p-8">
      <section className="ef-vitrine relative px-6 py-10 sm:px-10 sm:py-14">
        <Sparkles aria-hidden strokeWidth={0.8} className="pointer-events-none absolute -right-8 -top-8 size-64 text-white/[0.06] sm:size-80" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="ef-chip-vidro"><span className="ef-ponto ef-ponto-rascunho" /> Em breve</span>
          <span className="ef-chip-vidro">Comunicação e administradores</span>
        </div>
        <p className="ef-sobre mt-7 !text-white/80">Gratia Ars · Agentes de IA</p>
        <h2 className="mt-3 max-w-[20ch] text-[clamp(28px,3.4vw,44px)] font-bold leading-[1.05] tracking-[-0.028em]">Artes da igreja, criadas por agentes de IA</h2>
        <p className="mt-5 max-w-[62ch] text-[15.5px] leading-relaxed text-white/75">
          O Gratia Ars vai trabalhar para a 1ª IEC Brasília: aprender a identidade visual da igreja com as referências da comunicação e criar peças prontas para usar, sempre no padrão da marca.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          {GRATIA_ARS_URL ? (
            <a href={GRATIA_ARS_URL} target="_blank" rel="noopener" className="ef-btn ef-btn-branco !h-[52px] !px-7"><Sparkles size={17} /> Abrir o Gratia Ars <ArrowRight size={17} /></a>
          ) : (
            <button disabled className="ef-btn ef-btn-branco !h-[52px] !px-7 !opacity-60"><Sparkles size={17} /> Abrir o Gratia Ars</button>
          )}
          <span className="text-[13px] text-white/60">{GRATIA_ARS_URL ? "Abre em uma nova aba." : "Disponível assim que as referências visuais da igreja forem carregadas."}</span>
        </div>
        <div className="mt-12 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Desenvolvido por <img src="/logo-gratia-branco.svg" alt="GRATIA" className="h-4 w-auto opacity-80" />
        </div>
      </section>
      <section className="ef-peca ef-peca-filete">
        <h3 className="ef-h2 border-b border-p-borda px-6 py-4">O que vem por aí</h3>
        <ol className="grid sm:grid-cols-2">
          {[
            "Artes para o Instagram: feed e stories",
            "Slides e fundos para o telão",
            "Peças de eventos, avisos e campanhas",
            "Sempre com as cores, fontes e grafismos da igreja",
            "Aprende com as artes de referência enviadas pela comunicação",
            "Acesso da equipe de comunicação e dos administradores",
          ].map((i, n) => (
            <li key={i} className="flex gap-4 border-b border-p-borda px-6 py-4 text-[14.5px] text-p-texto-2 sm:odd:border-r">
              <span className="ef-num shrink-0 text-[12px] font-bold text-p-acento">{String(n + 1).padStart(2, "0")}</span> {i}
            </li>
          ))}
        </ol>
      </section>
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
    <div className={cn("absolute inset-0 z-30 grid place-items-center p-4 transition-all duration-300", visivel ? "bg-[#001d33]/45 backdrop-blur-md" : "bg-transparent backdrop-blur-0")}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Escolha o tipo de deliberação"
        className={cn("ef-janela relative w-full max-w-3xl p-6 transition-all duration-500 sm:p-9", visivel ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-95 opacity-0")}
        style={{ transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      >
        {onFechar && <button onClick={onFechar} className="absolute right-4 top-4 rounded-full p-2 text-p-suave hover:bg-p-hover" aria-label="Fechar"><X size={18} /></button>}
        <p className="ef-sobre">Deliberação</p>
        <h2 className="mt-3 text-[24px] font-bold tracking-[-0.02em] text-p-texto">Como a igreja vai decidir?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {OPCOES.map((o, i) => (
            <button
              key={o.id}
              onClick={() => onEscolher(o.id)}
              className={cn(
                "ef-peca group relative flex flex-col gap-2 overflow-hidden border-t-[3px] !border-t-p-acento p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_50px_-30px_rgba(0,42,71,0.6)]",
                visivel ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
              )}
              style={{ transitionDelay: visivel ? `${120 + i * 90}ms` : "0ms" }}
            >
                            <span className="relative grid size-12 place-items-center bg-p-realce text-p-acento"><o.Icone size={22} /></span>
              <span className="relative mt-2 flex items-center gap-2 text-[16px] font-semibold text-p-texto">
                {o.titulo}
                {o.breve && <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Em breve</span>}
              </span>
              <span className="relative text-[13.5px] leading-relaxed text-p-texto-2">{o.texto}</span>
              <span className="relative text-[12.5px] text-p-suave">{o.exemplo}</span>
              <span className="relative mt-auto inline-flex items-center gap-1.5 pt-3 text-[11.5px] font-bold uppercase tracking-[0.14em] text-p-acento">Abrir <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
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
          <div>
            <p className="ef-sobre">Deliberação</p>
            <h1 className="ef-titulo mt-2.5">{escolha === "votacao" ? "Votação Online" : "Assembleia Online"}</h1>
          </div>
          <button onClick={() => setTrocando(true)} className="ef-btn ef-btn-sec ml-auto !h-10">
            <Repeat size={13} /> Ir para {outra === "votacao" ? "Votação Online" : "Assembleia Online"}
          </button>
        </div>
      )}
      {escolha === "votacao" && <ModuloVotacao />}
      {escolha === "assembleia" && (
        <EmBreve
          Icone={Video}
          sobre="Deliberação"
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
      sobre="Igreja"
      titulo="Finanças"
      texto="Controle financeiro da igreja integrado ao painel. Vamos definir juntos as funcionalidades."
      itens={["Dízimos e ofertas por culto", "Caixa e contas bancárias", "Receitas e despesas por categoria", "Balancete e relatórios em PDF", "Comprovantes anexados", "Acesso restrito à tesouraria"]}
    />
  );
}

export function Contorno({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-5xl p-4 sm:p-8">{children}</div>;
}
