import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { listarVideos } from "@/lib/api";
import type { Video } from "@/server/youtube";
import { cn } from "@/lib/utils";
import { CapaPagina } from "@/components/site/Layout";
import { CartaoVideo, EsqueletoVideos, PlayerVideo } from "@/components/site/Blocos";
import { IconeYoutube } from "@/components/site/Icones";

type Busca = { filtro?: string; q?: string };

export const Route = createFileRoute("/_site/mensagens")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    ...(typeof s.filtro === "string" && s.filtro ? { filtro: s.filtro } : {}),
    ...(typeof s.q === "string" && s.q ? { q: s.q } : {}),
  }),
  component: Mensagens,
  head: () => ({ meta: [{ title: "Mensagens" }] }),
});

const POR_PAGINA = 12;

function Mensagens() {
  const { mensagens: m, geral } = useConteudo();
  const { filtro, q } = Route.useSearch();
  const navegar = useNavigate({ from: "/mensagens" });
  const [texto, setTexto] = useState(q ?? "");
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<Video | null>(null);
  const pedido = useRef(0);

  const playlist = m.filtros.find((f) => f.id === filtro)?.playlistId;

  // Digitação → busca na URL (com pequena espera)
  useEffect(() => {
    const t = setTimeout(() => {
      if ((q ?? "") !== texto.trim()) navegar({ search: (s: Busca) => ({ ...s, q: texto.trim() || undefined }), replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => { setPagina(1); }, [filtro, q]);

  useEffect(() => {
    const id = ++pedido.current;
    setCarregando(true);
    listarVideos({
      data: { canal: m.canal, playlist, busca: q, pagina, porPagina: POR_PAGINA, esconderCurtos: m.esconderCurtos },
    })
      .then((r) => {
        if (id !== pedido.current) return;
        setErro(r.erro ?? "");
        setTotal(r.total);
        setVideos((ant) => (pagina === 1 ? r.videos : [...ant, ...r.videos]));
      })
      .catch(() => id === pedido.current && setErro("Não foi possível carregar os vídeos agora."))
      .finally(() => id === pedido.current && setCarregando(false));
  }, [m.canal, playlist, q, pagina, m.esconderCurtos]);

  const chips = [{ id: "", rotulo: "Todos" }, ...m.filtros];

  return (
    <>
      <CapaPagina rotulo="Assista" titulo={m.titulo} texto={m.subtitulo} />
      <section className="container-site py-12">
        <div className="sticky top-[76px] z-20 -mx-5 bg-fundo/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <label className="relative block lg:w-80">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tinta-suave" />
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar por título, tema, pregador…"
                className="w-full rounded-full border border-linha bg-white py-3 pl-11 pr-10 text-[15px] outline-none focus:border-marca"
              />
              {texto && (
                <button onClick={() => setTexto("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-tinta-suave hover:bg-fundo" aria-label="Limpar busca"><X size={16} /></button>
              )}
            </label>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
              {chips.map((c) => {
                const ativo = (filtro ?? "") === c.id;
                return (
                  <button
                    key={c.id || "todos"}
                    onClick={() => navegar({ search: (s: Busca) => ({ ...s, filtro: c.id || undefined }), replace: true })}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors font-[family-name:var(--font-titulo)]",
                      ativo ? "bg-marca text-white" : "bg-white text-tinta-suave ring-1 ring-linha hover:text-marca hover:ring-marca/40",
                    )}
                  >
                    {c.rotulo}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-tinta-suave">
          {carregando && pagina === 1 ? "Carregando…" : `${total} ${total === 1 ? "vídeo" : "vídeos"}${q ? ` para “${q}”` : ""}`}
        </p>

        {erro && !videos.length ? (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center ring-1 ring-linha/60">
            <p className="text-tinta-suave">{erro}</p>
            <a href={geral.redes.youtube} target="_blank" rel="noopener noreferrer" className="btn-destaque mt-5"><IconeYoutube /> Ver no YouTube</a>
          </div>
        ) : (
          <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => <CartaoVideo key={v.id} v={v} onAbrir={setAberto} />)}
            {carregando && <EsqueletoVideos n={pagina === 1 ? 6 : 3} />}
          </div>
        )}

        {!carregando && !erro && videos.length === 0 && (
          <p className="mt-8 rounded-3xl bg-white p-10 text-center text-tinta-suave ring-1 ring-linha/60">Nenhum vídeo encontrado.</p>
        )}

        {videos.length < total && !carregando && (
          <div className="mt-12 text-center">
            <button onClick={() => setPagina((p) => p + 1)} className="btn-contorno">Carregar mais</button>
          </div>
        )}
      </section>
      <PlayerVideo v={aberto} onFechar={() => setAberto(null)} />
    </>
  );
}
