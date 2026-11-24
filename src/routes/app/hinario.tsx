import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, Heart, Minus, Music, Plus, Search, Share2 } from "lucide-react";
import { toast } from "sonner";
import { appAtualizarPerfil, appHinos } from "@/lib/api-app";
import { useMembro } from "@/components/app/contexto";
import type { Hino } from "@/lib/membros";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/hinario")({
  validateSearch: (s: Record<string, unknown>) => ({ n: typeof s.n === "number" ? s.n : typeof s.n === "string" ? Number(s.n) || undefined : undefined }),
  component: Hinario,
});

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CHAVE_LOCAL = "iecb_app_hinos";

function Hinario() {
  const { membro, atualizar } = useMembro();
  const { n } = Route.useSearch();
  const nav = Route.useNavigate();
  const [hinos, setHinos] = useState<Hino[] | null>(() => { try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL) ?? "null"); } catch { return null; } });
  const [busca, setBusca] = useState("");
  const [so, setSo] = useState<"todos" | "favoritos">("todos");
  useEffect(() => {
    appHinos().then((l) => { setHinos(l); try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(l)); } catch { /* sem espaço */ } }).catch(() => {});
  }, []);
  const favs = new Set(membro.favoritos.hinos);
  const lista = useMemo(() => (hinos ?? []).filter((h) => (so === "todos" || favs.has(h.numero)) && (!busca || String(h.numero) === busca.trim() || norm(`${h.titulo} ${h.letra}`).includes(norm(busca)))), [hinos, busca, so, membro.favoritos.hinos]);
  const aberto = hinos?.find((h) => h.numero === n);

  const favoritar = (num: number) => {
    const s = new Set(membro.favoritos.hinos);
    if (s.has(num)) s.delete(num); else s.add(num);
    const l = [...s];
    atualizar({ ...membro, favoritos: { ...membro.favoritos, hinos: l } });
    appAtualizarPerfil({ data: { favoritos: { hinos: l } } }).catch(() => {});
  };
  const mudarLetra = (d: number) => {
    const letra = Math.min(5, Math.max(1, membro.prefs.letra + d));
    atualizar({ ...membro, prefs: { ...membro.prefs, letra } });
    appAtualizarPerfil({ data: { prefs: { letra } } }).catch(() => {});
  };

  if (aberto) {
    const estrofes = aberto.letra.split(/\n\s*\n/);
    return (
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-[var(--a-borda)] bg-[color-mix(in_srgb,var(--a-sup)_90%,transparent)] px-2 pb-2 pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur-xl">
          <button onClick={() => nav({ search: { n: undefined } })} className="flex items-center gap-1 px-2 py-2 text-[14px] font-semibold text-[var(--a-azul)]"><ChevronLeft size={19} /> Hinário</button>
          <span className="flex-1" />
          <button onClick={() => mudarLetra(-1)} className="grid size-10 place-items-center text-[var(--a-suave)]" aria-label="Letra menor"><Minus size={17} /></button>
          <button onClick={() => mudarLetra(1)} className="grid size-10 place-items-center text-[var(--a-suave)]" aria-label="Letra maior"><Plus size={17} /></button>
          <button onClick={() => favoritar(aberto.numero)} className="grid size-10 place-items-center" aria-label="Favorito"><Heart size={19} className={favs.has(aberto.numero) ? "fill-[var(--a-vermelho)] text-[var(--a-vermelho)]" : "text-[var(--a-suave)]"} /></button>
          <button onClick={async () => { const t = `${aberto.numero} — ${aberto.titulo}\n\n${aberto.letra}`; if (navigator.share) { try { await navigator.share({ text: t }); } catch { /* cancelado */ } } else { await navigator.clipboard?.writeText(t); toast.success("Copiado."); } }} className="grid size-10 place-items-center text-[var(--a-suave)]" aria-label="Compartilhar"><Share2 size={18} /></button>
        </header>
        <article className="a-entra px-6 pb-8 pt-7">
          <p className="a-sobre">Hino {aberto.numero}{aberto.secao ? ` · ${aberto.secao}` : ""}</p>
          <h1 className="mt-2 text-[27px] font-bold leading-tight tracking-[-0.02em] text-[var(--a-azul)]">{aberto.titulo}</h1>
          <div className="mt-7 grid gap-6">
            {estrofes.map((e, i) => {
              const coro = /^\s*coro\s*:/i.test(e);
              return (
                <p key={i} className={cn("a-leitura whitespace-pre-line !font-sans !leading-[1.65]", coro ? "border-l-[3px] border-[#00436f] pl-4 italic" : "")}>
                  {coro ? e.replace(/^\s*coro\s*:\s*/i, "") : e}
                </p>
              );
            })}
          </div>
          {aberto.autor && <p className="mt-8 text-[12.5px] text-[var(--a-suave)]">{aberto.autor}</p>}
        </article>
      </div>
    );
  }

  return (
    <div className="a-entra grid gap-5">
      <header className="a-topo">
        <p className="a-sobre !text-white/80">Louvor</p>
        <h1 className="mt-2 text-[28px] font-bold tracking-[-0.02em]">Hinário</h1>
        <div className="relative mt-5">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} inputMode="search" placeholder="Número, título ou trecho" className="h-12 w-full border border-white/20 bg-white/10 pl-10 pr-3 text-[16px] text-white outline-none placeholder:text-white/50 focus:border-white/60" />
        </div>
      </header>
      <div className="flex gap-2 px-5">
        {(["todos", "favoritos"] as const).map((x) => <button key={x} onClick={() => setSo(x)} className={cn("border px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em]", so === x ? "border-[#00436f] bg-[#00436f] text-white" : "border-[var(--a-borda)] text-[var(--a-suave)]")}>{x === "todos" ? "Todos" : "Favoritos"}</button>)}
      </div>
      {!hinos ? null : hinos.length === 0 ? (
        <div className="mx-5 a-cartao a-filete px-5 py-8 text-center">
          <Music className="mx-auto text-[var(--a-azul)]" size={28} strokeWidth={1.6} />
          <p className="mt-3 text-[16px] font-bold">O hinário está sendo preparado</p>
          <p className="mt-1 text-[14px] text-[var(--a-suave)]">Os hinos aparecem aqui assim que a igreja cadastrar.</p>
        </div>
      ) : (
        <ul className="a-cartao mx-5 divide-y divide-[var(--a-borda)]">
          {lista.map((h) => (
            <li key={h.numero}>
              <button onClick={() => nav({ search: { n: h.numero } })} className="flex w-full items-center gap-4 px-4 py-3.5 text-left">
                <span className="w-10 shrink-0 text-[18px] font-bold text-[var(--a-azul)]">{h.numero}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-bold">{h.titulo}</span><span className="block truncate text-[12.5px] text-[var(--a-suave)]">{h.letra.split("\n")[0]}</span></span>
                {favs.has(h.numero) && <Heart size={15} className="shrink-0 fill-[var(--a-vermelho)] text-[var(--a-vermelho)]" />}
              </button>
            </li>
          ))}
          {!lista.length && <li className="px-4 py-8 text-center text-[14px] text-[var(--a-suave)]">Nenhum hino encontrado.</li>}
        </ul>
      )}
    </div>
  );
}
