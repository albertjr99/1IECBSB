import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import type { Conteudo } from "@/lib/conteudo";
import { useConteudo } from "@/lib/contexto";
import { useAoVivo } from "@/lib/ao-vivo";
import { listarVideos } from "@/lib/api";
import type { Video } from "@/server/youtube";
import { hojeISO, paragrafos } from "@/lib/utils";
import { LinkSite } from "@/components/site/Link";
import { CabecalhoSecao } from "@/components/site/Layout";
import { BotoesRota, CartaoEvento, CartaoVideo, EsqueletoVideos, Mapa, PlayerVideo } from "@/components/site/Blocos";
import { AgendaSemanal } from "@/components/site/AgendaSemanal";
import { MonteFoto } from "@/components/site/Monte";
import { emBrasilia } from "@/lib/datas";

export const Route = createFileRoute("/_site/")({ component: Inicio });

/** Próximo culto/estudo da agenda semanal, a partir de agora. */
function proximoEncontro(dias: Conteudo["programacao"]["dias"]) {
  const agora = emBrasilia(); // horário de Brasília, também no servidor
  for (let k = 0; k < 8; k++) {
    const dia = dias.find((x) => x.diaSemana === (agora.semana + k) % 7);
    if (!dia) continue;
    const itens = dia.itens
      .filter((it) => /culto|estudo|ebd|escola|consagra/i.test(it.titulo) && !/\d[ªº]/.test(it.detalhe + it.titulo))
      .map((it) => {
        const m = /(\d{1,2})h(\d{2})?/.exec(it.horario);
        return { it, min: m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : 0 };
      })
      .filter((x) => k > 0 || x.min > agora.hora * 60 + agora.minuto)
      .sort((a, b) => a.min - b.min);
    if (itens[0]) return { quando: k === 0 ? "Hoje" : k === 1 ? "Amanhã" : dia.dia, ...itens[0].it };
  }
  return null;
}

function Hero() {
  const c = useConteudo();
  const h = c.inicio.hero;
  const vivo = useAoVivo(c.mensagens.canal);
  const [prox, setProx] = useState<ReturnType<typeof proximoEncontro>>(null);
  useEffect(() => setProx(proximoEncontro(c.programacao.dias)), [c.programacao.dias]);

  return (
    <section className="overflow-hidden bg-white">
      <div className="container-site grid items-end gap-10 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="hero-entra pb-4 lg:pb-16">
          {vivo?.aoVivo && (
            <Link to="/ao-vivo" className="mb-7 inline-flex items-center gap-2.5 bg-destaque px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.18em] text-white hover:bg-destaque-escuro">
              <span className="ponto-vivo size-2 rounded-full bg-white" /> Ao vivo agora
            </Link>
          )}
          {h.sobretitulo && <p className="rotulo-secao">{h.sobretitulo}</p>}
          <h1 className="mt-5 max-w-xl text-[2.5rem] font-bold leading-[1.04] tracking-[-0.03em] text-marca sm:text-[3.3rem] xl:text-[3.75rem]">{h.titulo}</h1>
          {h.subtitulo && <p className="texto-justificado mt-6 max-w-lg text-[16.5px] leading-relaxed text-tinta">{h.subtitulo}</p>}
          {h.botoes.length > 0 && (
            <div className="mt-9 flex flex-wrap gap-3">
              {h.botoes.map((b, i) => (
                <LinkSite key={i} para={b.link} className={i === 0 ? "btn-primario" : "btn-contorno"}>{b.rotulo}</LinkSite>
              ))}
            </div>
          )}
        </div>
        <div data-tilt="5" data-plano className="monte-palco relative -mr-5 sm:-mr-8 lg:mr-0">
          <MonteFoto imagem={h.imagem} horizonte={false} />
          {prox && (
            <Link to="/programacao" data-z style={{ "--z": "60px" } as React.CSSProperties} className="vidro hero-chip absolute bottom-[9%] left-[16%] flex items-center gap-4 px-5 py-4 text-white sm:left-[22%]">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/30"><Clock size={19} /></span>
              <span>
                <span className="block text-[10.5px] font-bold uppercase tracking-[0.22em] text-white/75">Próximo encontro · {prox.quando}</span>
                <span className="mt-0.5 block text-[17px] font-bold leading-tight">{prox.titulo}</span>
                <span className="block text-[13px] text-white/85">{prox.horario}{prox.detalhe && ` · ${prox.detalhe}`}</span>
              </span>
            </Link>
          )}
        </div>
      </div>
      {/* a linha do horizonte, chão firme da marca */}
      <div className="container-site"><div className="horizonte-anim h-[3px] bg-marca" /></div>
      <div className="h-10 sm:h-12" />
    </section>
  );
}

function Programacao() {
  const { programacao: p } = useConteudo();
  if (!p.dias.length) return null;
  return (
    <section className="border-y border-linha bg-papel">
     <div className="container-site overflow-hidden py-20 sm:py-24">
      <CabecalhoSecao rotulo="Toda semana" titulo={p.titulo} texto={p.subtitulo} link="/programacao" rotuloLink="Agenda e eventos" />
      <div className="mt-8"><AgendaSemanal /></div>
      {p.aviso && <p className="mt-4 text-center text-sm text-tinta-suave">{p.aviso}</p>}
     </div>
    </section>
  );
}

function BoasVindas() {
  const { inicio } = useConteudo();
  const b = inicio.boasVindas;
  const corpo = (
    <>
      <p className="rotulo-secao mb-3">Quem somos</p>
      <h2 className="titulo-secao">{b.titulo}</h2>
      <div className="texto-corrido mt-6 text-[16.5px] leading-relaxed text-tinta">
        {paragrafos(b.texto).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {b.link && (
        <LinkSite para={b.link} className="btn-contorno mt-8">
          {b.rotuloBotao || "Saiba mais"} <ArrowRight size={16} />
        </LinkSite>
      )}
    </>
  );
  return (
    <section className="bg-white">
      {b.imagem ? (
        <div className="container-site grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-2">
          <MonteFoto imagem={b.imagem} />
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
    <section className="grafismo-monte-escuro overflow-hidden bg-marca-funda text-white">
      <div className="container-site py-20 sm:py-24">
        <CabecalhoSecao rotulo="Assista" titulo="Últimas mensagens" texto="Cultos e estudos bíblicos da igreja." link="/mensagens" rotuloLink="Todas as mensagens" claro />
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
      <CabecalhoSecao rotulo="Agenda" titulo={e.titulo} texto={e.subtitulo} link="/programacao#eventos" rotuloLink="Ver no calendário" />
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
    <section className="grafismo-monte-escuro overflow-hidden bg-marca text-white">
      <figure className="container-site max-w-4xl py-20 text-center sm:py-24">
        <blockquote className="escritura text-[1.6rem] leading-snug sm:text-[2.05rem]">“{v.texto}”</blockquote>
        {v.referencia && <figcaption className="referencia mt-7 text-white/80">{v.referencia}</figcaption>}
      </figure>
    </section>
  );
}

function Contribua() {
  const { contribua: c } = useConteudo();
  return (
    <section className="container-site py-16 sm:py-20">
      <div className="flex flex-col gap-6 border-t-[3px] border-marca bg-papel p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div className="max-w-2xl">
          <p className="rotulo-secao mb-3">Contribua</p>
          <h2 className="text-[1.6rem] font-bold text-marca">{c.titulo}</h2>
          <p className="texto-justificado mt-2 text-tinta">{c.texto}</p>
        </div>
        <Link to="/contribua" className="btn-primario shrink-0">Como contribuir</Link>
      </div>
    </section>
  );
}

function Localizacao() {
  const { geral: g } = useConteudo();
  return (
    <section id="localizacao" className="scroll-mt-36 border-t border-linha bg-papel">
      <div className="container-site grid gap-10 py-20 sm:py-24 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <p className="rotulo-secao mb-3">Visite-nos</p>
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
