import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Clock, LockKeyhole, Mail, MapPin, Menu, Phone, X } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { useAoVivo } from "@/lib/ao-vivo";
import { cn, linkTelefone, linkWhatsapp } from "@/lib/utils";
import { LinkSite } from "./Link";
import { IconeFacebook, IconeInstagram, IconeSpotify, IconeWhatsapp, IconeYoutube } from "./Icones";
import { AvisoEvento } from "./AvisoEvento";

/**
 * Logo horizontal oficial (Manual da Marca, versão vetorial). Colorida sobre
 * branco; negativa (branca com cruz vermelha) sobre o azul. Largura mínima no
 * digital: 260 px — abaixo disso o manual pede só o símbolo.
 */
export function Marca({ negativo = false, className }: { negativo?: boolean; className?: string }) {
  const { geral } = useConteudo();
  return (
    <img
      src={negativo ? "/marca/logo-horizontal-negativo-branco-cruz-vermelha.svg" : "/marca/logo-horizontal-colorida.svg"}
      alt={geral.nome}
      width={897}
      height={131}
      className={cn("block h-auto w-[260px] max-w-none", className)}
    />
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
      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-destaque px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-destaque-escuro"
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
      {(

        <div className="hidden bg-marca-funda text-[13px] text-white/85 md:block">
          <div className="mx-auto flex h-10 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 xl:px-10 2xl:px-14">
            <div className="flex items-center gap-6">
              {g.horarioAtendimento && <span className="inline-flex items-center gap-2"><Clock size={14} />{g.horarioAtendimento}</span>}
              {g.email && <a href={`mailto:${g.email}`} className="inline-flex items-center gap-2 hover:text-white"><Mail size={14} />{g.email}</a>}
            </div>
            <div className="flex items-center">
              <Redes claro tamanho={15} />
              <span className="mx-2 h-4 w-px bg-white/20" aria-hidden />
              <Link
                to="/admin"
                title="Área administrativa"
                aria-label="Área administrativa"
                className="grid size-8 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LockKeyhole size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
      <div className={cn("border-b bg-white/95 backdrop-blur transition-shadow", rolou ? "border-linha shadow-[0_6px_24px_-18px_rgba(0,0,0,0.4)]" : "border-transparent")}>
        <div className="mx-auto flex h-[76px] w-full max-w-[1440px] items-center gap-6 px-5 sm:px-8 xl:h-[88px] xl:px-10 2xl:px-14">
          <Link to="/" aria-label="Página inicial" className="shrink-0"><Marca className="sm:w-[290px] 2xl:w-[320px]" /></Link>

          <div className="ml-auto flex items-center gap-2 xl:gap-0">
            <nav className="hidden items-center xl:flex" aria-label="Principal">
              {principal.map((m) => (
                <LinkSite
                  key={m.id}
                  para={m.para}
                  className={cn(
                    "relative whitespace-nowrap px-2.5 py-2 text-[13.5px] font-medium text-tinta transition-colors hover:text-marca 2xl:px-4 2xl:text-[14.5px]",
                    "after:absolute after:inset-x-2.5 after:-bottom-[24px] after:h-[3px] after:origin-center after:scale-x-0 after:bg-marca after:transition-transform 2xl:after:inset-x-4",
                    ativo(m.para) && "font-semibold text-marca after:scale-x-100",
                  )}
                >
                  {m.rotulo}
                </LinkSite>
              ))}
            </nav>

            <SeloAoVivo />
            {contribua && (
              <>
                <span className="mx-4 hidden h-7 w-px bg-linha xl:block 2xl:mx-6" aria-hidden />
                <LinkSite para={contribua.para} className="btn-primario hidden !h-11 !px-6 sm:inline-flex">{contribua.rotulo}</LinkSite>
              </>
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
        <div className="border-b border-linha bg-white shadow-lg xl:hidden">
          <nav className="container-site flex flex-col py-3">
            {itens.map((m) => (
              <LinkSite
                key={m.id}
                para={m.para}
                className={cn(
                  "rounded-md px-3 py-3 text-[16px] font-medium",
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
    <footer className="grafismo-monte-escuro relative overflow-hidden bg-marca text-white/85">
      <div className="container-site relative grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Marca negativo className="w-[300px]" />
          {c.rodape.texto && <p className="texto-justificado mt-5 max-w-sm text-[15px] text-white/70">{c.rodape.texto}</p>}
          <div className="mt-5 -ml-2"><Redes claro /></div>
        </div>
        <div>
          <h4 className="text-[11.5px] font-bold uppercase tracking-[0.24em] text-white">Navegue</h4>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[15px]">
            {c.menu.filter((m) => m.visivel).map((m) => (
              <li key={m.id}><LinkSite para={m.para} className="hover:text-white">{m.rotulo}</LinkSite></li>
            ))}
            <li><Link to="/ao-vivo" className="hover:text-white">Ao vivo</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[11.5px] font-bold uppercase tracking-[0.24em] text-white">Visite-nos</h4>
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
            <a href={zap} target="_blank" rel="noopener noreferrer" className="btn-branco mt-5 !h-11">
              <IconeWhatsapp size={16} /> WhatsApp
            </a>
          )}
        </div>
      </div>
      <div className="relative border-t border-white/15">
        <div className="container-site flex flex-col gap-2 py-5 text-[13px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {g.nome}</p>
          <Link to="/admin" className="hover:text-white/80">Área administrativa</Link>
        </div>
        {/* Crédito de quem produziu o site. */}
        <div className="container-site flex items-center justify-center gap-2 pb-6 text-[12px] text-white/50">
          <span>Produzido por</span>
          <span aria-hidden className="text-white/25">|</span>
          <a
            href={`mailto:contato.gratiast@gmail.com?subject=${encodeURIComponent(`Contato pelo site da ${g.nomeCurto}`)}`}
            title="GRATIA Software e Tecnologia — enviar e-mail"
            className="rounded opacity-80 transition-opacity hover:opacity-100"
          >
            <img src="/logo-gratia-branco.svg" alt="GRATIA Software e Tecnologia" width={130} height={28} className="h-7 w-auto" />
          </a>
        </div>
      </div>
    </footer>
  );
}

export function LayoutSite({ children }: { children: ReactNode }) {
  return (
    <div className="site flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2">Pular para o conteúdo</a>
      <Cabecalho />
      <main id="conteudo" className="flex-1">{children}</main>
      <Rodape />
      <AvisoEvento />
    </div>
  );
}

/** Cabeçalho de seção: sobretítulo com a cruzinha, título, texto e um link à direita. */
export function CabecalhoSecao({ rotulo, titulo, texto, link, rotuloLink, claro = false }: { rotulo?: string; titulo: string; texto?: string; link?: string; rotuloLink?: string; claro?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="max-w-2xl">
        {rotulo && <p className={cn("rotulo-secao mb-3", claro && "!text-white")}>{rotulo}</p>}
        <h2 className={claro ? "text-[1.9rem] font-bold leading-[1.12] tracking-[-0.02em] text-white sm:text-[2.4rem]" : "titulo-secao"}>{titulo}</h2>
        {texto && <p className={claro ? "texto-justificado mt-3 text-white/75" : "texto-justificado mt-3 text-tinta"}>{texto}</p>}
      </div>
      {link && rotuloLink && (
        <LinkSite para={link} className={`inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] ${claro ? "text-white hover:text-white/80" : "text-marca hover:text-marca-funda"}`}>
          {rotuloLink} <ArrowRight size={15} />
        </LinkSite>
      )}
    </div>
  );
}

/** Cabeçalho das páginas internas: azul-noite com o grafismo Monte ao fundo. */
export function CapaPagina({ rotulo, titulo, texto }: { rotulo?: string; titulo: string; texto?: string }) {
  return (
    <section className="grafismo-monte-escuro overflow-hidden bg-marca-funda text-white">
      <div className="container-site py-16 sm:py-20">
        {rotulo && <p className="rotulo-secao mb-4 !text-white">{rotulo}</p>}
        <h1 className="max-w-3xl text-[2.3rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[3rem]">{titulo}</h1>
        {texto && <p className="texto-justificado mt-4 max-w-2xl text-[16.5px] leading-relaxed text-white/75">{texto}</p>}
      </div>
    </section>
  );
}
