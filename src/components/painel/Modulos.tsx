import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Repeat, Video, Vote, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuloVotacao } from "./votacao/ModuloVotacao";

/** Página de algo que ainda está sendo preparado: sóbria, com situação real e próximos passos. */
export function EmBreve({ sobre = "Igreja", titulo, texto, situacao, itens, passos }: {
  Icone?: unknown; sobre?: string; titulo: string; texto: string; situacao?: string; itens: string[]; passos?: { texto: string; feito?: boolean }[];
}) {
  return (
    <div className="grid gap-8">
      <header className="max-w-[68ch]">
        <p className="ef-sobre">{sobre}</p>
        <h1 className="ef-titulo mt-2.5">{titulo}</h1>
        <p className="ef-sub mt-1.5">{texto}</p>
        <p className="mt-4 inline-flex items-center gap-2 border border-p-borda bg-p-superficie px-3 py-1.5 text-[12px] font-semibold text-p-texto-2">
          <span className="size-2 rounded-full bg-amber-400" /> {situacao ?? "Em planejamento"}
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="ef-peca ef-peca-filete px-6 py-5">
          <h2 className="ef-h2">O que vai ter</h2>
          <ul className="mt-3 divide-y divide-p-borda">
            {itens.map((i) => <li key={i} className="py-2.5 text-[14.5px] leading-relaxed text-p-texto-2">{i}</li>)}
          </ul>
        </section>
        {passos && (
          <section className="ef-peca px-6 py-5">
            <h2 className="ef-h2">Próximos passos</h2>
            <ol className="mt-3 grid gap-3">
              {passos.map((p, n) => (
                <li key={p.texto} className="flex gap-3 text-[14px] leading-snug">
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold", p.feito ? "bg-p-acento text-white" : "border border-p-borda-forte text-p-suave")}>{p.feito ? "✓" : n + 1}</span>
                  <span className={p.feito ? "text-p-suave line-through decoration-p-borda-forte" : "text-p-texto-2"}>{p.texto}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

/** Endereço do Gratia Ars para a igreja — preencher quando estiver no ar. */
const GRATIA_ARS_URL = "";

export function ModuloAgentes() {
  const passos = [
    { texto: "Manual da marca da igreja (cores, fontes, logos e grafismos)", feito: true },
    { texto: "Artes de referência da comunicação: posts, stories e telão já usados" },
    { texto: "Modelos da igreja configurados no Gratia Ars" },
    { texto: "Acesso liberado para a equipe de comunicação" },
  ];
  const pedidos = [
    "Post de aviso do Congresso dos Juniores, dias 28 e 29/11, com a foto do ensaio.",
    "Story com o versículo do boletim de domingo.",
    "Slide de telão para o Culto de Gratidão dos 54 anos.",
    "Versão quadrada e vertical da mesma arte do evento.",
  ];
  return (
    <div className="mx-auto grid max-w-5xl gap-8 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[64ch]">
          <p className="ef-sobre">Criação</p>
          <h1 className="ef-titulo mt-2.5">Gratia Ars</h1>
          <p className="ef-sub mt-1.5">O estúdio de artes da GRATIA, preparado para a comunicação da 1ª IEC Brasília. A equipe descreve a peça; o Gratia Ars entrega a arte já no padrão visual da igreja, pronta para revisar e publicar.</p>
        </div>
        <img src="/logo-gratia-escuro.svg" alt="GRATIA" className="h-6 w-auto opacity-80 dark:hidden" />
        <img src="/logo-gratia-branco.svg" alt="GRATIA" className="hidden h-6 w-auto opacity-80 dark:block" />
      </header>

      <section className="ef-peca ef-peca-filete grid gap-6 px-6 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400"><span className="size-2 rounded-full bg-amber-400" /> Em preparação</p>
          <p className="mt-2 text-[16px] font-bold text-p-texto">Aguardando as artes de referência da comunicação</p>
          <p className="mt-1 text-[14px] leading-relaxed text-p-suave">O manual da marca já está aqui. Com as artes que a igreja já usa, o Gratia Ars aprende o jeito da igreja comunicar e a seção é liberada.</p>
        </div>
        {GRATIA_ARS_URL ? (
          <a href={GRATIA_ARS_URL} target="_blank" rel="noopener" className="ef-btn ef-btn-pri !h-12">Abrir o Gratia Ars <ArrowRight size={16} /></a>
        ) : (
          <button disabled className="ef-btn ef-btn-sec !h-12">Abrir o Gratia Ars</button>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ef-peca px-6 py-5">
          <h2 className="ef-h2">Preparação</h2>
          <ol className="mt-4 grid gap-3.5">
            {passos.map((p, n) => (
              <li key={p.texto} className="flex gap-3 text-[14px] leading-snug">
                <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold", p.feito ? "bg-p-acento text-white" : "border border-p-borda-forte text-p-suave")}>{p.feito ? "✓" : n + 1}</span>
                <span className={p.feito ? "text-p-suave" : "text-p-texto-2"}>{p.texto}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="ef-peca px-6 py-5">
          <h2 className="ef-h2">Exemplos do que a equipe poderá pedir</h2>
          <ul className="mt-3 divide-y divide-p-borda">
            {pedidos.map((p) => <li key={p} className="py-2.5 text-[14px] leading-relaxed text-p-texto-2">“{p}”</li>)}
          </ul>
        </section>
      </div>
      <p className="text-[12.5px] text-p-suave">Disponível para a equipe de comunicação e para os administradores.</p>
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
          sobre="Deliberação"
          titulo="Assembleia Online"
          texto="Reuniões por áudio e vídeo pelo próprio site, das assembleias da igreja às reuniões de liderança."
          itens={["Sala com link de convite para cada membro.", "Áudio, vídeo e compartilhamento de tela.", "Lista de presença feita sozinha, para o quórum.", "Votações durante a reunião, ligadas à Votação Online.", "Ata com presença e resultados ao final.", "Funciona no celular, sem instalar nada."]}
        />
      )}
      {(!escolha || trocando) && <JanelaEscolha onEscolher={(e) => { setEscolha(e); setTrocando(false); }} {...(trocando ? { onFechar: () => setTrocando(false) } : {})} />}
    </div>
  );
}

export function ModuloFinancas() {
  return (
    <EmBreve
      sobre="Igreja"
      titulo="Finanças"
      texto="Controle financeiro da igreja dentro do painel, com acesso só para a tesouraria e a administração."
      situacao="Em planejamento com a tesouraria"
      itens={[
        "Lançamento de dízimos e ofertas por culto, com conferência em dupla.",
        "Caixa e contas bancárias, com saldo do dia.",
        "Receitas e despesas por categoria e por departamento.",
        "Comprovantes anexados a cada lançamento.",
        "Balancete mensal em PDF para a assembleia e o conselho fiscal.",
      ]}
      passos={[
        { texto: "Reunião com a tesouraria para definir as categorias de receita e despesa" },
        { texto: "Modelo do balancete usado hoje pela igreja" },
        { texto: "Perfil de acesso da tesouraria no painel" },
      ]}
    />
  );
}

export function Contorno({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-5xl p-4 sm:p-8">{children}</div>;
}
