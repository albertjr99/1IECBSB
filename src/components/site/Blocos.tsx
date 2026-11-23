import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, MapPin, Navigation, Play, X } from "lucide-react";
import type { Evento } from "@/lib/conteudo";
import type { Video } from "@/server/youtube";
import { cn, dataCurta, diaMes, duracaoTexto, periodo } from "@/lib/utils";
import { LinkSite } from "./Link";

// ─── Eventos ────────────────────────────────────────────────────────────────

export function CartaoEvento({ ev }: { ev: Evento }) {
  const { dia, mes } = diaMes(ev.data);
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-linha/60 transition-shadow hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-marca">
        {ev.imagem ? (
          <img src={ev.imagem} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="arco-fundo absolute inset-0 opacity-20" />
        )}
        <div className="absolute left-4 top-4 rounded-2xl bg-white px-3 py-2 text-center shadow">
          <div className="text-2xl font-extrabold leading-none text-marca font-[family-name:var(--font-titulo)]">{dia}</div>
          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-destaque">{mes}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-xl font-bold text-marca-funda">{ev.titulo}</h3>
        <div className="mt-3 grid gap-1 text-[14.5px] text-tinta-suave">
          <span className="inline-flex items-center gap-2"><CalendarDays size={15} className="text-destaque" />{periodo(ev.data, ev.dataFim)}{ev.horario && ` · ${ev.horario}`}</span>
          {ev.local && <span className="inline-flex items-center gap-2"><MapPin size={15} className="text-destaque" />{ev.local}</span>}
        </div>
        {ev.descricao && <p className="mt-3 line-clamp-3 text-[15px] text-tinta-suave">{ev.descricao}</p>}
        {ev.link && (
          <LinkSite para={ev.link} className="mt-auto pt-5 text-[14px] font-bold text-marca hover:text-destaque font-[family-name:var(--font-titulo)]">
            {ev.rotuloLink || "Saiba mais"} →
          </LinkSite>
        )}
      </div>
    </article>
  );
}

// ─── Vídeos ─────────────────────────────────────────────────────────────────

export function CartaoVideo({ v, onAbrir }: { v: Video; onAbrir: (v: Video) => void }) {
  return (
    <button type="button" onClick={() => onAbrir(v)} className="group flex flex-col text-left">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-marca-funda">
        {v.thumb && <img src={v.thumb} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-destaque opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          <Play size={22} fill="currentColor" />
        </span>
        {v.duracao > 0 && <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[12px] font-semibold text-white">{duracaoTexto(v.duracao)}</span>}
      </div>
      <h3 className="mt-3 line-clamp-2 text-[15.5px] font-semibold leading-snug text-tinta group-hover:text-marca font-[family-name:var(--font-titulo)]">{v.titulo}</h3>
      <p className="mt-1 text-[13.5px] text-tinta-suave">{dataCurta(v.publicado)}</p>
    </button>
  );
}

export function PlayerVideo({ v, onFechar }: { v: Video | null; onFechar: () => void }) {
  useEffect(() => {
    if (!v) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", f);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", f); document.body.style.overflow = ""; };
  }, [v, onFechar]);
  if (!v) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-3 sm:p-8" onClick={onFechar} role="dialog" aria-modal="true" aria-label={v.titulo}>
      <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-4 text-white">
          <h3 className="text-lg font-semibold">{v.titulo}</h3>
          <button onClick={onFechar} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`}
            title={v.titulo}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
          Abrir no YouTube <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

export function EsqueletoVideos({ n = 3 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video rounded-2xl bg-marca/10" />
          <div className="mt-3 h-4 w-4/5 rounded bg-marca/10" />
          <div className="mt-2 h-3 w-1/3 rounded bg-marca/10" />
        </div>
      ))}
    </>
  );
}

// ─── Mapa ───────────────────────────────────────────────────────────────────

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

export function Mapa({ consulta, className }: { consulta: string; className?: string }) {
  const [carregar, setCarregar] = useState(false);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  // Só carrega o mapa quando ele se aproxima da tela.
  useEffect(() => {
    if (!ref) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setCarregar(true), { rootMargin: "300px" });
    io.observe(ref);
    return () => io.disconnect();
  }, [ref]);

  const q = encodeURIComponent(consulta);
  const src = MAPS_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${q}&language=pt-BR&zoom=16`
    : `https://www.google.com/maps?q=${q}&hl=pt-BR&z=16&output=embed`;

  return (
    <div ref={setRef} className={cn("relative overflow-hidden rounded-3xl bg-marca-clara", className)}>
      {carregar ? (
        <iframe title="Mapa de localização" src={src} className="absolute inset-0 size-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-marca/60"><MapPin /></div>
      )}
    </div>
  );
}

export function BotoesRota({ consulta, claro = false }: { consulta: string; claro?: boolean }) {
  const q = encodeURIComponent(consulta);
  const itens = [
    { nome: "Google Maps", url: `https://www.google.com/maps/dir/?api=1&destination=${q}` },
    { nome: "Waze", url: `https://waze.com/ul?q=${q}&navigate=yes` },
    { nome: "Uber", url: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${q}` },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {itens.map((i) => (
        <a key={i.nome} href={i.url} target="_blank" rel="noopener noreferrer" className={claro ? "btn-claro !px-4 !py-2.5" : "btn-contorno !px-4 !py-2.5"}>
          <Navigation size={15} /> {i.nome}
        </a>
      ))}
    </div>
  );
}
