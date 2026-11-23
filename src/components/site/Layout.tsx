import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Menu, Phone, X } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { useAoVivo } from "@/lib/ao-vivo";
import { cn, linkTelefone, linkWhatsapp } from "@/lib/utils";
import { LinkSite } from "./Link";
import { IconeFacebook, IconeInstagram, IconeSpotify, IconeWhatsapp, IconeYoutube } from "./Icones";
import { AvisoEvento } from "./AvisoEvento";

/** Divide o nome em duas linhas equilibradas, como no logotipo. */
function duasLinhas(nome: string): [string, string] {
  const p = nome.split(" ");
  if (p.length < 3) return [nome, ""];
  let melhor = 1, dif = Infinity;
  for (let i = 1; i < p.length; i++) {
    const d = Math.abs(p.slice(0, i).join(" ").length - p.slice(i).join(" ").length);
    if (d < dif) { dif = d; melhor = i; }
  }
  return [p.slice(0, melhor).join(" "), p.slice(melhor).join(" ")];
}

export function Marca({ negativo = false, compacta = false }: { negativo?: boolean; compacta?: boolean }) {
  const { geral } = useConteudo();
  const [l1, l2] = duasLinhas(geral.nome);
  return (
    <span className="flex items-center gap-3">
      <img
        src={negativo ? "/simbolo-negativo.svg" : "/simbolo.svg"}
        alt=""
        className={cn("h-auto shrink-0", compacta ? "w-12" : "w-14 sm:w-16")}
      />
      <span
        className={cn(
          "font-[family-name:var(--font-titulo)] font-semibold uppercase leading-[1.15] tracking-[0.04em]",
          compacta ? "text-[10.5px]" : "text-[11px] sm:text-[12.5px]",
          negativo ? "text-white" : "text-marca",
        )}
      >
        {l1}
        {l2 && <><br />{l2}</>}
      </span>
    </span>
  );
}

export function Redes({ claro = false, tamanho = 17 }: { claro?: boolean; tamanho?: number }) {
  const { geral } = useConteudo();
  const r = geral.redes;
  const itens = [
    { url: r.instagram, nome: "Instagram", Icone: IconeInstagram },
    { url: r.youtube, nome: "YouTube", Icone: IconeYoutube },
    { url: r.facebook, nome: "Facebook", Icone: IconeFacebook },
    { url: r.spotify, nome: "Spotify", Icone: IconeSpotify },
  ].filter((i) => i.url);
  return (
    <div className="flex items-center gap-1">
      {itens.map(({ url, nome, Icone }) => (
        <a
          key={nome}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={nome}
          title={nome}
          className={cn(
            "grid size-9 place-items-center rounded-full transition-colors",
            claro ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-marca hover:bg-marca-clara",
          )}
        >
          <Icone size={tamanho} />
        </a>
      ))}
    </div>
  );
}

function SeloAoVivo() {
  const { mensagens } = useConteudo();
  const s = useAoVivo(mensagens.canal);
  if (!s?.aoVivo) return null;
  return (
    <Link
      to="/ao-vivo"
      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-destaque px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-destaque-escuro"
    >
      <span className="ponto-vivo size-2 rounded-full bg-white" />
      Ao vivo
    </Link>
  );
}

function Cabecalho() {
  const c = useConteudo();
  const [aberto, setAberto] = useState(false);
  const [rolou, setRolou] = useState(false);
  const caminho = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setAberto(false), [caminho]);
  useEffect(() => {
    const f = () => setRolou(window.scrollY > 12);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  const itens = c.menu.filter((m) => m.visivel);
  const principal = itens.filter((m) => m.id !== "contribua");
  const contribua = itens.find((m) => m.id === "contribua");
  const ativo = (para: string) => (para === "/" ? caminho === "/" : caminho.startsWith(para));
  const g = c.geral;

  return (
    <header className="sticky top-0 z-40">
      {(g.horarioAtendimento || g.telefone || g.email) && (
        <div className="hidden bg-marca-funda text-[13px] text-white/85 md:block">
          <div className="container-site flex h-10 items-center justify-between">
            <div className="flex items-center gap-6">
              {g.horarioAtendimento && <span className="inline-flex items-center gap-2"><Clock size={14} />{g.horarioAtendimento}</span>}
              {g.telefone && <a href={linkTelefone(g.telefone)} className="inline-flex items-center gap-2 hover:text-white"><Phone size={14} />{g.telefone}</a>}
              {g.email && <a href={`mailto:${g.email}`} className="inline-flex items-center gap-2 hover:text-white"><Mail size={14} />{g.email}</a>}
            </div>
            <Redes claro tamanho={15} />
          </div>
        </div>
      )}
      <div className={cn("border-b bg-white/95 backdrop-blur transition-shadow", rolou ? "border-linha/60 shadow-[0_6px_24px_-18px_rgba(0,0,0,0.4)]" : "border-transparent")}>
        <div className="container-site flex h-[76px] items-center justify-between gap-4">
          <Link to="/" aria-label="Página inicial" className="shrink-0"><Marca /></Link>

          <nav className="hidden items-center xl:flex">
            {principal.map((m) => (
              <LinkSite
                key={m.id}
                para={m.para}
                className={cn(
                  "relative whitespace-nowrap rounded-full px-3 py-2 text-[13.5px] font-semibold text-tinta-suave transition-colors hover:text-marca",
                  "font-[family-name:var(--font-titulo)]",
                  ativo(m.para) && "text-marca after:absolute after:inset-x-3 after:-bottom-[3px] after:h-[2px] after:rounded-full after:bg-destaque",
                )}
              >
                {m.rotulo}
              </LinkSite>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <SeloAoVivo />
            {contribua && (
              <LinkSite para={contribua.para} className="btn-primario hidden !px-5 !py-2.5 sm:inline-flex">{contribua.rotulo}</LinkSite>
            )}
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              className="grid size-11 place-items-center rounded-full text-marca hover:bg-marca-clara xl:hidden"
              aria-label={aberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={aberto}
            >
              {aberto ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {aberto && (
        <div className="border-b border-linha/60 bg-white shadow-lg xl:hidden">
          <nav className="container-site flex flex-col py-3">
            {itens.map((m) => (
              <LinkSite
                key={m.id}
                para={m.para}
                className={cn(
                  "rounded-lg px-3 py-3 text-[15px] font-semibold font-[family-name:var(--font-titulo)]",
                  ativo(m.para) ? "bg-marca-clara text-marca" : "text-tinta hover:bg-fundo",
                )}
              >
                {m.rotulo}
              </LinkSite>
            ))}
            <div className="mt-2 border-t border-linha/50 pt-3"><Redes /></div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Rodape() {
  const c = useConteudo();
  const g = c.geral;
  const zap = linkWhatsapp(g.whatsapp, "Olá! Vim pelo site.");
  return (
    <footer className="relative overflow-hidden bg-marca-funda text-white/80">
      <div aria-hidden className="arco-fundo pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="container-site relative grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Marca negativo />
          {c.rodape.texto && <p className="mt-5 max-w-sm text-[15px] text-white/70">{c.rodape.texto}</p>}
          <div className="mt-5 -ml-2"><Redes claro /></div>
        </div>
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-[0.18em] text-white">Navegue</h4>
          <ul className="mt-4 grid gap-2 text-[15px]">
            {c.menu.filter((m) => m.visivel).map((m) => (
              <li key={m.id}><LinkSite para={m.para} className="hover:text-white">{m.rotulo}</LinkSite></li>
            ))}
            <li><Link to="/ao-vivo" className="hover:text-white">Ao vivo</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-[0.18em] text-white">Visite-nos</h4>
          <ul className="mt-4 grid gap-3 text-[15px]">
            <li className="flex gap-3">
              <MapPin size={17} className="mt-1 shrink-0 text-white/60" />
              <span>{g.endereco.linha1}{g.endereco.linha2 && <><br />{g.endereco.linha2}</>}{g.endereco.cep && <><br />CEP {g.endereco.cep}</>}</span>
            </li>
            {g.telefone && <li className="flex gap-3"><Phone size={17} className="mt-1 shrink-0 text-white/60" /><a href={linkTelefone(g.telefone)} className="hover:text-white">{g.telefone}</a></li>}
            {g.email && <li className="flex gap-3"><Mail size={17} className="mt-1 shrink-0 text-white/60" /><a href={`mailto:${g.email}`} className="break-all hover:text-white">{g.email}</a></li>}
            {g.horarioAtendimento && <li className="flex gap-3"><Clock size={17} className="mt-1 shrink-0 text-white/60" />{g.horarioAtendimento}</li>}
          </ul>
          {zap && (
            <a href={zap} target="_blank" rel="noopener noreferrer" className="btn-claro mt-5 !py-2.5">
              <IconeWhatsapp size={16} /> WhatsApp
            </a>
          )}
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="container-site flex flex-col gap-2 py-5 text-[13px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {g.nome}</p>
          <Link to="/admin" className="hover:text-white/80">Área administrativa</Link>
        </div>
      </div>
    </footer>
  );
}

export function LayoutSite({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2">Pular para o conteúdo</a>
      <Cabecalho />
      <main id="conteudo" className="flex-1">{children}</main>
      <Rodape />
      <AvisoEvento />
    </div>
  );
}

/** Cabeçalho das páginas internas. */
export function CapaPagina({ rotulo, titulo, texto }: { rotulo?: string; titulo: string; texto?: string }) {
  return (
    <section className="relative overflow-hidden bg-marca text-white">
      <div aria-hidden className="arco-fundo pointer-events-none absolute inset-0 opacity-[0.08]" />
      <div className="container-site relative py-16 sm:py-20">
        {rotulo && <p className="rotulo-secao !text-white/85 before:!bg-destaque">{rotulo}</p>}
        <h1 className="surgir mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">{titulo}</h1>
        {texto && <p className="surgir mt-4 max-w-2xl text-lg text-white/80" style={{ animationDelay: "80ms" }}>{texto}</p>}
      </div>
    </section>
  );
}
