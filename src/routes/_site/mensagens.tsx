import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Check, ChevronDown, Search, X } from "lucide-react";
import { useConteudo } from "@/lib/contexto";
import { listarVideos } from "@/lib/api";
import type { Video } from "@/server/youtube";
import { cn } from "@/lib/utils";
import { CapaPagina } from "@/components/site/Layout";
import { CartaoVideo, EsqueletoVideos, PlayerVideo } from "@/components/site/Blocos";
import { IconeYoutube } from "@/components/site/Icones";

type Busca = { q?: string; de?: string; ate?: string };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute("/_site/mensagens")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    ...(typeof s.q === "string" && s.q ? { q: s.q } : {}),
    ...(typeof s.de === "string" && DATA.test(s.de) ? { de: s.de } : {}),
    ...(typeof s.ate === "string" && DATA.test(s.ate) ? { ate: s.ate } : {}),
  }),
  component: Mensagens,
  head: () => ({ meta: [{ title: "Mensagens" }] }),
});

const POR_PAGINA = 12;

function Mensagens() {
  const { mensagens: m, geral } = useConteudo();
  const { q, de, ate } = Route.useSearch();
  const navegar = useNavigate({ from: "/mensagens" });
  const [texto, setTexto] = useState(q ?? "");
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<Video | null>(null);
  const pedido = useRef(0);

  // Digitação → busca na URL (com pequena espera)
  useEffect(() => {
    const t = setTimeout(() => {
      if ((q ?? "") !== texto.trim()) navegar({ search: (s: Busca) => ({ ...s, q: texto.trim() || undefined }), replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [texto]);

  useEffect(() => { setPagina(1); }, [q, de, ate]);

  useEffect(() => {
    const id = ++pedido.current;
    setCarregando(true);
    listarVideos({
      data: { canal: m.canal, busca: q, de, ate, pagina, porPagina: POR_PAGINA, esconderCurtos: m.esconderCurtos },
    })
      .then((r) => {
        if (id !== pedido.current) return;
        setErro(r.erro ?? "");
        setTotal(r.total);
        setVideos((ant) => (pagina === 1 ? r.videos : [...ant, ...r.videos]));
      })
      .catch(() => id === pedido.current && setErro("Não foi possível carregar os vídeos agora."))
      .finally(() => id === pedido.current && setCarregando(false));
  }, [m.canal, q, de, ate, pagina, m.esconderCurtos]);

  return (
    <>
      <CapaPagina titulo={m.titulo} texto={m.subtitulo} />
      <section className="container-site py-12">
        <div className="sticky top-[76px] md:top-[116px] xl:top-[128px] z-20 -mx-5 border-b border-linha/60 bg-fundo px-5 py-4 sm:-mx-8 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block flex-1 sm:max-w-xl">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tinta-suave" />
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar por título, tema, pregador…"
                className="h-11 w-full rounded-md border border-linha bg-white pl-11 pr-10 text-[15px] outline-none focus:border-marca"
              />
              {texto && (
                <button onClick={() => setTexto("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-tinta-suave hover:bg-fundo" aria-label="Limpar busca"><X size={16} /></button>
              )}
            </label>
            <SeletorPeriodo
              de={de}
              ate={ate}
              onChange={(p) => navegar({ search: (s: Busca) => ({ ...s, de: p.de, ate: p.ate }), replace: true })}
            />
          </div>
        </div>

        <p className="mt-4 text-sm text-tinta-suave">
          {carregando && pagina === 1 ? "Carregando…" : `${total} ${total === 1 ? "vídeo" : "vídeos"}${q ? ` para “${q}”` : ""}${de || ate ? ` · ${rotuloPeriodo(de, ate)}` : ""}`}
        </p>

        {erro && !videos.length ? (
          <div className="mt-8 rounded-lg bg-white p-10 text-center border border-linha/70">
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
          <div className="mt-8 rounded-lg border border-linha/70 bg-white p-10 text-center text-tinta-suave">
            <p>Nenhum vídeo encontrado.</p>
            {(q || de || ate) && (
              <button onClick={() => { setTexto(""); navegar({ search: {}, replace: true }); }} className="mt-3 text-[14px] font-semibold text-marca hover:underline">Limpar busca e período</button>
            )}
          </div>
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

// ─── Período ────────────────────────────────────────────────────────────────

function hojeBrasilia() {
  return new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
}
function menosDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}
function br(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

type Periodo = { de?: string; ate?: string };

function atalhos(): { rotulo: string; p: Periodo }[] {
  const hoje = hojeBrasilia();
  const ano = Number(hoje.slice(0, 4));
  return [
    { rotulo: "Qualquer data", p: {} },
    { rotulo: "Últimos 7 dias", p: { de: menosDias(hoje, 6) } },
    { rotulo: "Últimos 30 dias", p: { de: menosDias(hoje, 29) } },
    { rotulo: "Últimos 3 meses", p: { de: menosDias(hoje, 90) } },
    { rotulo: "Últimos 12 meses", p: { de: menosDias(hoje, 364) } },
    ...[0, 1, 2, 3].map((i) => ({ rotulo: String(ano - i), p: { de: `${ano - i}-01-01`, ate: `${ano - i}-12-31` } })),
  ];
}

function rotuloPeriodo(de?: string, ate?: string) {
  if (!de && !ate) return "Qualquer data";
  const a = atalhos().find((x) => x.p.de === de && x.p.ate === ate);
  if (a) return a.rotulo;
  if (de && ate) return `${br(de)} – ${br(ate)}`;
  if (de) return `A partir de ${br(de)}`;
  return `Até ${br(ate!)}`;
}

function SeletorPeriodo({ de, ate, onChange }: Periodo & { onChange: (p: Periodo) => void }) {
  const [aberto, setAberto] = useState(false);
  const [ini, setIni] = useState(de ?? "");
  const [fim, setFim] = useState(ate ?? "");
  const caixa = useRef<HTMLDivElement>(null);
  const ativo = !!(de || ate);

  useEffect(() => { setIni(de ?? ""); setFim(ate ?? ""); }, [de, ate, aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  const escolher = (p: Periodo) => { onChange(p); setAberto(false); };
  const lista = atalhos();

  return (
    <div ref={caixa} className="relative">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className={cn(
            "flex h-11 items-center gap-2.5 rounded-md border bg-white pl-3.5 pr-3 text-[14.5px] transition-colors",
            ativo ? "border-marca text-marca" : "border-linha text-tinta hover:border-marca/40",
          )}
        >
          <CalendarDays size={17} className={ativo ? "text-marca" : "text-tinta-suave"} />
          <span className="whitespace-nowrap font-medium">{rotuloPeriodo(de, ate)}</span>
          <ChevronDown size={16} className={cn("text-tinta-suave transition-transform", aberto && "rotate-180")} />
        </button>
        {ativo && (
          <button type="button" onClick={() => escolher({})} className="ml-1 grid size-9 place-items-center rounded-md text-tinta-suave hover:bg-white hover:text-marca" aria-label="Limpar período">
            <X size={16} />
          </button>
        )}
      </div>

      {aberto && (
        <div className="absolute right-0 z-30 mt-2 w-[min(92vw,540px)] overflow-hidden rounded-lg border border-linha bg-white shadow-[0_18px_40px_-18px_rgba(0,30,55,.35)] sm:left-auto max-sm:left-0 max-sm:right-auto">
          <div className="grid sm:grid-cols-[200px_1fr]">
            <ul className="border-b border-linha/70 py-2 sm:border-b-0 sm:border-r">
              {lista.map((a, i) => {
                const sel = a.p.de === de && a.p.ate === ate;
                return (
                  <li key={a.rotulo}>
                    {i === 5 && <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[.12em] text-tinta-suave">Por ano</p>}
                    <button
                      type="button"
                      onClick={() => escolher(a.p)}
                      className={cn("flex w-full items-center justify-between px-4 py-2 text-left text-[14px] hover:bg-fundo", sel ? "font-semibold text-marca" : "text-tinta")}
                    >
                      {a.rotulo}
                      {sel && <Check size={15} />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <form
              className="flex flex-col gap-4 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                let a = ini, b = fim;
                if (a && b && a > b) [a, b] = [b, a];
                escolher({ de: a || undefined, ate: b || undefined });
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-tinta-suave">Intervalo personalizado</p>
              <label className="block">
                <span className="mb-1.5 block text-[13px] text-tinta-suave">De</span>
                <input type="date" value={ini} max={fim || hojeBrasilia()} onChange={(e) => setIni(e.target.value)} className="h-10 w-full rounded-md border border-linha px-3 text-[14.5px] outline-none focus:border-marca" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] text-tinta-suave">Até</span>
                <input type="date" value={fim} min={ini || undefined} max={hojeBrasilia()} onChange={(e) => setFim(e.target.value)} className="h-10 w-full rounded-md border border-linha px-3 text-[14.5px] outline-none focus:border-marca" />
              </label>
              <button type="submit" disabled={!ini && !fim} className="btn-primario mt-auto h-10 disabled:opacity-40">Aplicar período</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
