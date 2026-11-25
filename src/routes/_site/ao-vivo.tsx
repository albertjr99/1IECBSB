import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { useAoVivo } from "@/lib/ao-vivo";
import { listarVideos } from "@/lib/api";
import type { Video } from "@/server/youtube";
import { CapaPagina } from "@/components/site/Layout";
import { AgendaCompacta } from "@/components/site/AgendaSemanal";
import { IconeYoutube } from "@/components/site/Icones";
import { ConteudoExterno } from "@/components/site/AvisoCookies";
import { quandoLongo } from "@/lib/datas";

export const Route = createFileRoute("/_site/ao-vivo")({ component: AoVivo, head: () => ({ meta: [{ title: "Ao vivo" }] }) });

function Player({ id, titulo }: { id: string; titulo: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-black shadow-2xl">
      <ConteudoExterno tipo="video" link={`https://www.youtube.com/watch?v=${id}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={titulo}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </ConteudoExterno>
    </div>
  );
}

function AoVivo() {
  const c = useConteudo();
  const s = useAoVivo(c.mensagens.canal);
  const [ultimo, setUltimo] = useState<Video | null>(null);

  useEffect(() => {
    if (s?.aoVivo) return;
    listarVideos({ data: { canal: c.mensagens.canal, porPagina: 1, esconderCurtos: true } }).then((r) => setUltimo(r.videos[0] ?? null)).catch(() => {});
  }, [s?.aoVivo, c.mensagens.canal]);

  return (
    <>
      <CapaPagina rotulo="Transmissão" titulo="Ao vivo" texto="Acompanhe os cultos e estudos em tempo real, onde você estiver." />
      <section className="container-site py-14">
        {!s ? (
          <div className="aspect-video animate-pulse rounded-lg bg-marca/10" />
        ) : s.aoVivo ? (
          <>
            <p className="mb-4 inline-flex items-center gap-2 rounded-md bg-destaque px-3 py-1.5 text-[13px] font-semibold text-white">
              <span className="ponto-vivo size-2 rounded-full bg-white" /> Transmitindo agora
            </p>
            <Player id={s.aoVivo.id} titulo={s.aoVivo.titulo} />
            <h2 className="mt-5 text-2xl font-bold text-marca">{s.aoVivo.titulo}</h2>
          </>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="flex items-start gap-4 border-l-4 border-marca pl-5">
                <div>
                  <h2 className="text-xl font-bold text-marca">Não estamos ao vivo agora</h2>
                  {s.agendado ? (
                    <p className="mt-1 flex items-center gap-2 text-tinta-suave">
                      <CalendarClock size={16} className="text-marca" />
                      Próxima transmissão: <strong className="text-tinta">{quandoLongo(s.agendado.inicio)}</strong>
                    </p>
                  ) : (
                    <p className="texto-justificado mt-1 text-tinta">Esta página mostra a transmissão automaticamente quando começar. Enquanto isso, assista à última mensagem.</p>
                  )}
                </div>
              </div>
              {ultimo && (
                <div className="mt-6">
                  <h3 className="mb-3 text-lg font-bold text-marca">Última mensagem</h3>
                  <Player id={ultimo.id} titulo={ultimo.titulo} />
                  <h3 className="mt-4 text-xl font-bold text-marca">{ultimo.titulo}</h3>
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={`${c.geral.redes.youtube}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="btn-destaque"><IconeYoutube /> Inscreva-se no canal</a>
                <Link to="/mensagens" className="btn-contorno">Todas as mensagens</Link>
              </div>
            </div>
            <div className="grid content-start gap-4">
              <h3 className="text-lg font-bold text-marca">Horários da semana</h3>
              <AgendaCompacta />
            </div>
          </div>
        )}
      </section>
    </>
  );
}
