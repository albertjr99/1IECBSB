import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { useAoVivo } from "@/lib/ao-vivo";
import { listarVideos } from "@/lib/api";
import type { Video } from "@/server/youtube";
import { hojeISO, paragrafos } from "@/lib/utils";
import { LinkSite } from "@/components/site/Link";
import { CabecalhoSecao } from "@/components/site/Layout";
import { BotoesRota, CartaoEvento, CartaoVideo, EsqueletoVideos, Mapa, PlayerVideo } from "@/components/site/Blocos";
import { AgendaSemanal } from "@/components/site/AgendaSemanal";

export const Route = createFileRoute("/_site/")({ component: Inicio });

function Hero() {
  const c = useConteudo();
  const h = c.inicio.hero;
  const vivo = useAoVivo(c.mensagens.canal);
  const domingo = c.programacao.dias.find((d) => d.diaSemana === 0) ?? c.programacao.dias[0];

  return (
    <section className="relative isolate bg-marca-funda text-white">
      {h.imagem && (
        <>
          <img src={h.imagem} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-marca-funda via-marca-funda/90 to-marca-funda/40" />
        </>
      )}
      <div className="container-site grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          {vivo?.aoVivo && (
            <Link to="/ao-vivo" className="mb-8 inline-flex items-center gap-2.5 text-[14px] font-semibold text-white hover:underline">
              <span className="ponto-vivo size-2 rounded-full bg-destaque" /> Transmissão ao vivo agora — assistir
            </Link>
          )}
          {h.sobretitulo && <p className="text-lg text-white/70">{h.sobretitulo}</p>}
          <h1 className="mt-2 max-w-3xl text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[3.1rem]">{h.titulo}</h1>
          {h.subtitulo && <p className="texto-justificado mt-6 max-w-xl text-lg leading-relaxed text-white/75">{h.subtitulo}</p>}
          {h.botoes.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-3">
              {h.botoes.map((b, i) => (
                <LinkSite key={i} para={b.link} className={i === 0 ? "btn-destaque" : "btn-claro"}>{b.rotulo}</LinkSite>
              ))}
            </div>
          )}
        </div>

        {domingo && (
          <div className="border-t border-white/20 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/55">Cultos de {domingo.dia.toLowerCase()}</p>
            <ul className="mt-4 divide-y divide-white/10">
              {domingo.itens.map((x) => (
                <li key={x.id} className="flex items-baseline justify-between gap-6 py-2.5 text-[16px]">
                  <span className="text-white/85">{x.titulo}</span>
                  <span className="font-semibold tabular-nums">{x.horario}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 flex gap-2 text-[14.5px] text-white/60">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              {c.geral.endereco.linha1}, {c.geral.endereco.linha2}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Programacao() {
  const { programacao: p } = useConteudo();
  if (!p.dias.length) return null;
  return (
    <section className="container-site overflow-hidden py-20 sm:py-24">
      <CabecalhoSecao titulo={p.titulo} texto={p.subtitulo} link="/programacao" rotuloLink="Agenda e eventos" />
      <div className="mt-8"><AgendaSemanal /></div>
      {p.aviso && <p className="mt-4 text-center text-sm text-tinta-suave">{p.aviso}</p>}
    </section>
  );
}

function BoasVindas() {
  const { inicio } = useConteudo();
  const b = inicio.boasVindas;
  const corpo = (
    <>
      <h2 className="titulo-secao">{b.titulo}</h2>
      <div className="texto-corrido mt-5 text-[17.5px] leading-relaxed text-tinta-suave">
        {paragrafos(b.texto).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {b.link && (
        <LinkSite para={b.link} className="mt-7 inline-flex items-center gap-1.5 text-[15px] font-semibold text-marca hover:text-marca-escura">
          {b.rotuloBotao || "Saiba mais"} <ArrowRight size={16} />
        </LinkSite>
      )}
    </>
  );
  return (
    <section className="border-y border-linha/60 bg-papel">
      {b.imagem ? (
        <div className="container-site grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-2">
          <img src={b.imagem} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
          <div>{corpo}</div>
        </div>
      ) : (
        <div className="container-site py-20 sm:py-24"><div className="max-w-3xl">{corpo}</div></div>
      )}
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
    <section className="bg-marca-funda text-white">
      <div className="container-site py-20 sm:py-24">
        <CabecalhoSecao titulo="Últimas mensagens" texto="Cultos e estudos bíblicos da igreja." link="/mensagens" rotuloLink="Todas as mensagens" claro />
        <div className="mt-10 grid gap-8 md:grid-cols-3 [&_h3]:!text-white [&_p]:!text-white/55">
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
      <CabecalhoSecao titulo={e.titulo} texto={e.subtitulo} link="/programacao#eventos" rotuloLink="Ver no calendário" />
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
    <section className="border-y border-linha/60 bg-papel">
      <figure className="container-site max-w-4xl py-16 text-center sm:py-20">
        <blockquote className="escritura text-[1.65rem] leading-snug text-marca-funda sm:text-[2.1rem]">{v.texto}</blockquote>
        {v.referencia && <figcaption className="mt-5 text-[14px] font-semibold text-destaque">{v.referencia}</figcaption>}
      </figure>
    </section>
  );
}

function Contribua() {
  const { contribua: c } = useConteudo();
  return (
    <section className="container-site py-16 sm:py-20">
      <div className="flex flex-col gap-6 border-l-4 border-destaque pl-6 sm:flex-row sm:items-center sm:justify-between sm:pl-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-marca-funda">{c.titulo}</h2>
          <p className="texto-justificado mt-2 text-tinta-suave">{c.texto}</p>
        </div>
        <Link to="/contribua" className="btn-primario shrink-0">Como contribuir</Link>
      </div>
    </section>
  );
}

function Localizacao() {
  const { geral: g } = useConteudo();
  return (
    <section id="localizacao" className="scroll-mt-36 border-t border-linha/60 bg-papel">
      <div className="container-site grid gap-10 py-20 sm:py-24 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <h2 className="titulo-secao">Como chegar</h2>
          <address className="mt-5 not-italic text-lg leading-relaxed text-tinta">
            {g.endereco.linha1}<br />{g.endereco.linha2}{g.endereco.cep && <><br /><span className="text-tinta-suave">CEP {g.endereco.cep}</span></>}
          </address>
          <div className="mt-7"><BotoesRota consulta={g.endereco.consultaMapa} /></div>
        </div>
        <Mapa consulta={g.endereco.consultaMapa} className="aspect-[4/3] lg:aspect-[16/11]" />
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
