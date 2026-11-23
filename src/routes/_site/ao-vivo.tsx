import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Radio } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { useAoVivo } from "@/lib/ao-vivo";
import { listarVideos } from "@/lib/api";
import type { Video } from "@/server/youtube";
import { CapaPagina } from "@/components/site/Layout";
import { CartaoAtividade } from "@/components/site/Blocos";
import { IconeYoutube } from "@/components/site/Icones";

export const Route = createFileRoute("/_site/ao-vivo")({ component: AoVivo, head: () => ({ meta: [{ title: "Ao vivo" }] }) });

function Player({ id, titulo }: { id: string; titulo: string }) {
  return (
    <div className="aspect-video overflow-hidden rounded-3xl bg-black shadow-2xl">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={titulo}
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
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
          <div className="aspect-video animate-pulse rounded-3xl bg-marca/10" />
        ) : s.aoVivo ? (
          <>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-destaque px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider text-white">
              <span className="ponto-vivo size-2 rounded-full bg-white" /> Transmitindo agora
            </p>
            <Player id={s.aoVivo.id} titulo={s.aoVivo.titulo} />
            <h2 className="mt-5 text-2xl font-bold text-marca-funda">{s.aoVivo.titulo}</h2>
          </>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="flex items-start gap-4 rounded-3xl bg-white p-6 ring-1 ring-linha/60">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-marca-clara text-marca"><Radio /></span>
                <div>
                  <h2 className="text-xl font-bold text-marca-funda">Não estamos ao vivo agora</h2>
                  {s.agendado ? (
                    <p className="mt-1 flex items-center gap-2 text-tinta-suave">
                      <CalendarClock size={16} className="text-destaque" />
                      Próxima transmissão: <strong className="text-tinta">{new Date(s.agendado.inicio).toLocaleString("pt-BR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</strong>
                    </p>
                  ) : (
                    <p className="mt-1 text-tinta-suave">Esta página mostra a transmissão automaticamente quando começar. Enquanto isso, assista à última mensagem.</p>
                  )}
                </div>
              </div>
              {ultimo && (
                <div className="mt-6">
                  <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-destaque">Última mensagem</p>
                  <Player id={ultimo.id} titulo={ultimo.titulo} />
                  <h3 className="mt-4 text-xl font-bold text-marca-funda">{ultimo.titulo}</h3>
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={`${c.geral.redes.youtube}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="btn-destaque"><IconeYoutube /> Inscreva-se no canal</a>
                <Link to="/mensagens" className="btn-contorno">Todas as mensagens</Link>
              </div>
            </div>
            <div className="grid content-start gap-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-tinta-suave">Horários da semana</p>
              {c.programacao.atividades.slice(0, 3).map((a) => <CartaoAtividade key={a.id} a={a} />)}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
