import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HandHeart, MapPin, Radio } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { useAoVivo } from "@/lib/ao-vivo";
import { listarVideos } from "@/lib/api";
import type { Video } from "@/server/youtube";
import { hojeISO, paragrafos } from "@/lib/utils";
import { LinkSite } from "@/components/site/Link";
import { BotoesRota, CartaoAtividade, CartaoEvento, CartaoVideo, EsqueletoVideos, Mapa, PlayerVideo } from "@/components/site/Blocos";

export const Route = createFileRoute("/_site/")({ component: Inicio });

function Hero() {
  const c = useConteudo();
  const h = c.inicio.hero;
  const vivo = useAoVivo(c.mensagens.canal);
  const proxima = c.programacao.atividades[0];

  return (
    <section className="relative isolate overflow-hidden bg-marca-funda text-white">
      {h.imagem ? (
        <>
          <img src={h.imagem} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-marca-funda via-marca-funda/85 to-marca-funda/30" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_20%,color-mix(in_oklab,var(--cor-primaria)_80%,white_6%),transparent_60%)]" />
          <img src="/simbolo-branco.svg" alt="" aria-hidden className="pointer-events-none absolute -bottom-[8%] left-1/2 -z-10 w-[130%] max-w-none -translate-x-1/2 opacity-[0.06] sm:w-[105%]" />
        </>
      )}

      <div className="container-site grid min-h-[min(82vh,720px)] items-center gap-12 py-20 lg:grid-cols-[1.35fr_1fr]">
        <div>
          {h.sobretitulo && <p className="surgir rotulo-secao !text-white/80">{h.sobretitulo}</p>}
          <h1 className="surgir mt-4 text-[2.4rem] font-extrabold leading-[1.05] sm:text-6xl" style={{ animationDelay: "60ms" }}>{h.titulo}</h1>
          {h.subtitulo && <p className="surgir mt-6 max-w-xl text-lg text-white/80 sm:text-xl" style={{ animationDelay: "120ms" }}>{h.subtitulo}</p>}
          {h.botoes.length > 0 && (
            <div className="surgir mt-9 flex flex-wrap gap-3" style={{ animationDelay: "180ms" }}>
              {h.botoes.map((b, i) => (
                <LinkSite key={i} para={b.link} className={i === 0 ? "btn-destaque" : "btn-claro"}>{b.rotulo}</LinkSite>
              ))}
            </div>
          )}
        </div>

        <div className="surgir hidden justify-self-end lg:block" style={{ animationDelay: "260ms" }}>
          {vivo?.aoVivo ? (
            <Link to="/ao-vivo" className="block w-[380px] overflow-hidden rounded-3xl bg-white text-tinta shadow-2xl transition-transform hover:-translate-y-1">
              <div className="relative aspect-video bg-black">
                <img src={vivo.aoVivo.thumb} alt="" className="size-full object-cover" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-destaque px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  <span className="ponto-vivo size-2 rounded-full bg-white" /> Ao vivo agora
                </span>
              </div>
              <div className="p-5">
                <p className="line-clamp-2 font-semibold font-[family-name:var(--font-titulo)]">{vivo.aoVivo.titulo}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-destaque">Assistir <ArrowRight size={15} /></span>
              </div>
            </Link>
          ) : proxima ? (
            <div className="w-[340px] rounded-3xl border border-white/15 bg-white/[0.07] p-7 backdrop-blur-md">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/60">Venha nos visitar</p>
              <p className="mt-3 text-sm text-white/70">{proxima.dia}</p>
              <p className="text-2xl font-bold font-[family-name:var(--font-titulo)]">{proxima.titulo}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {proxima.horarios.filter(Boolean).map((x) => (
                  <span key={x} className="rounded-full bg-white px-4 py-1.5 text-lg font-extrabold text-marca font-[family-name:var(--font-titulo)]">{x}</span>
                ))}
              </div>
              <div className="mt-6 flex items-start gap-2 border-t border-white/15 pt-5 text-[15px] text-white/75">
                <MapPin size={17} className="mt-0.5 shrink-0" />
                <span>{c.geral.endereco.linha1}<br />{c.geral.endereco.linha2}</span>
              </div>
              {vivo?.agendado && (
                <Link to="/ao-vivo" className="mt-5 flex items-center gap-2 rounded-2xl bg-white/10 p-3 text-[14px] hover:bg-white/15">
                  <Radio size={16} className="text-white" />
                  Transmissão agendada: {new Date(vivo.agendado.inicio).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Programacao() {
  const { programacao: p } = useConteudo();
  if (!p.atividades.length) return null;
  return (
    <section className="container-site py-20 sm:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo-secao">Semana em curso</p>
          <h2 className="titulo-secao mt-3">{p.titulo}</h2>
          {p.subtitulo && <p className="mt-3 max-w-xl text-tinta-suave">{p.subtitulo}</p>}
        </div>
        <Link to="/programacao" className="btn-contorno">Programação completa</Link>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {p.atividades.slice(0, 6).map((a) => <CartaoAtividade key={a.id} a={a} />)}
      </div>
      {p.aviso && <p className="mt-6 text-sm text-tinta-suave">{p.aviso}</p>}
    </section>
  );
}

function BoasVindas() {
  const { inicio, geral } = useConteudo();
  const b = inicio.boasVindas;
  return (
    <section className="bg-papel">
      <div className="container-site grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-2">
        <div className="relative">
          {b.imagem ? (
            <img src={b.imagem} alt="" className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-xl" />
          ) : (
            <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[2rem] bg-marca shadow-xl">
              <img src="/simbolo-negativo.svg" alt={geral.nome} className="w-3/5" />
            </div>
          )}
          <div aria-hidden className="absolute -bottom-5 -right-5 -z-0 hidden h-28 w-28 rounded-[1.5rem] bg-destaque/90 sm:block" style={{ zIndex: -1 }} />
        </div>
        <div>
          <p className="rotulo-secao">Quem somos</p>
          <h2 className="titulo-secao mt-3">{b.titulo}</h2>
          <div className="texto-corrido mt-5 text-[17.5px] text-tinta-suave">
            {paragrafos(b.texto).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {b.link && <LinkSite para={b.link} className="btn-primario mt-8">{b.rotuloBotao || "Saiba mais"} <ArrowRight size={16} /></LinkSite>}
        </div>
      </div>
    </section>
  );
}

function UltimasMensagens() {
  const { mensagens: m } = useConteudo();
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [aberto, setAberto] = useState<Video | null>(null);

  useEffect(() => {
    let ativo = true;
    listarVideos({ data: { canal: m.canal, porPagina: 3, esconderCurtos: m.esconderCurtos } })
      .then((r) => ativo && setVideos(r.videos))
      .catch(() => ativo && setVideos([]));
    return () => { ativo = false; };
  }, [m.canal, m.esconderCurtos]);

  if (videos && videos.length === 0) return null;
  return (
    <section className="relative overflow-hidden bg-marca-funda text-white">
      <div aria-hidden className="arco-fundo pointer-events-none absolute inset-0 opacity-[0.04]" />
      <div className="container-site relative py-20 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rotulo-secao !text-white/80">Pregações e estudos</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-[2.6rem]">Últimas mensagens</h2>
          </div>
          <Link to="/mensagens" className="btn-claro">Ver todas <ArrowRight size={16} /></Link>
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-3 [&_h3]:!text-white [&_p]:!text-white/60">
          {videos ? videos.map((v) => <CartaoVideo key={v.id} v={v} onAbrir={setAberto} />) : <EsqueletoVideos />}
        </div>
      </div>
      <PlayerVideo v={aberto} onFechar={() => setAberto(null)} />
    </section>
  );
}

function Eventos() {
  const { eventos: e } = useConteudo();
  const hoje = hojeISO();
  const proximos = e.itens.filter((x) => x.publicado && (x.dataFim || x.data) >= hoje).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 3);
  if (!proximos.length) return null;
  return (
    <section className="container-site py-20 sm:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo-secao">Agenda</p>
          <h2 className="titulo-secao mt-3">{e.titulo}</h2>
          {e.subtitulo && <p className="mt-3 max-w-xl text-tinta-suave">{e.subtitulo}</p>}
        </div>
        <Link to="/programacao" hash="eventos" className="btn-contorno">Todos os eventos</Link>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {proximos.map((ev) => <CartaoEvento key={ev.id} ev={ev} />)}
      </div>
    </section>
  );
}

function Versiculo() {
  const { inicio } = useConteudo();
  const v = inicio.versiculo;
  if (!v.texto) return null;
  return (
    <section className="relative overflow-hidden bg-destaque text-white">
      <div aria-hidden className="arco-fundo pointer-events-none absolute inset-0 opacity-[0.08]" />
      <div className="container-site relative py-20 text-center sm:py-24">
        <span aria-hidden className="block text-7xl leading-none text-white/30 escritura">“</span>
        <blockquote className="escritura mx-auto -mt-4 max-w-4xl text-[1.9rem] leading-snug sm:text-[2.6rem]">{v.texto}</blockquote>
        {v.referencia && <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.2em] text-white/80">{v.referencia}</p>}
      </div>
    </section>
  );
}

function Contribua() {
  const { contribua: c } = useConteudo();
  return (
    <section className="container-site py-20 sm:py-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-marca px-8 py-12 text-white sm:px-14 sm:py-14">
        <div aria-hidden className="arco-fundo pointer-events-none absolute inset-0 opacity-[0.08]" />
        <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr_auto]">
          <span className="grid size-16 place-items-center rounded-2xl bg-white/10"><HandHeart size={30} /></span>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{c.titulo}</h2>
            <p className="mt-2 max-w-2xl text-white/75">{c.texto}</p>
          </div>
          <Link to="/contribua" className="btn-destaque">Como contribuir</Link>
        </div>
      </div>
    </section>
  );
}

function Localizacao() {
  const { geral: g } = useConteudo();
  return (
    <section id="localizacao" className="scroll-mt-24 bg-papel">
      <div className="container-site grid gap-10 py-20 sm:py-24 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <p className="rotulo-secao">Localização</p>
          <h2 className="titulo-secao mt-3">Como chegar</h2>
          <p className="mt-5 flex gap-3 text-lg text-tinta">
            <MapPin className="mt-1 shrink-0 text-destaque" />
            <span>{g.endereco.linha1}<br />{g.endereco.linha2}{g.endereco.cep && <><br /><span className="text-tinta-suave">CEP {g.endereco.cep}</span></>}</span>
          </p>
          <div className="mt-7"><BotoesRota consulta={g.endereco.consultaMapa} /></div>
        </div>
        <Mapa consulta={g.endereco.consultaMapa} className="aspect-[4/3] shadow-xl lg:aspect-[16/11]" />
      </div>
    </section>
  );
}

function Inicio() {
  const { inicio } = useConteudo();
  const m = inicio.mostrar;
  return (
    <>
      <Hero />
      {m.programacao && <Programacao />}
      {m.boasVindas && <BoasVindas />}
      {m.mensagens && <UltimasMensagens />}
      {m.eventos && <Eventos />}
      {m.versiculo && <Versiculo />}
      {m.contribua && <Contribua />}
      {m.localizacao && <Localizacao />}
    </>
  );
}
