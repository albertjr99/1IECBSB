import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, Heart, Search } from "lucide-react";
import { appAtualizarPerfil } from "@/lib/api-app";
import { useMembro } from "@/components/app/contexto";
import { LeitorHino } from "@/components/hinario/LeitorHino";
import { buscarHinos, HINARIO } from "@/lib/hinario";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/hinario")({
  validateSearch: (s: Record<string, unknown>) => ({ n: typeof s.n === "number" ? s.n : typeof s.n === "string" ? Number(s.n) || undefined : undefined }),
  component: Hinario,
});

function Hinario() {
  const { membro, atualizar } = useMembro();
  const { n } = Route.useSearch();
  const nav = Route.useNavigate();
  const [busca, setBusca] = useState("");
  const [so, setSo] = useState<"todos" | "favoritos">("todos");
  const favs = new Set(membro.favoritos.hinos);
  const lista = useMemo(() => buscarHinos(busca).filter((h) => so === "todos" || favs.has(h.numero)), [busca, so, membro.favoritos.hinos]); // eslint-disable-line react-hooks/exhaustive-deps
  const i = HINARIO.findIndex((h) => h.numero === n);
  const aberto = i >= 0 ? HINARIO[i] : undefined;
  const escuro = typeof document !== "undefined" && !!document.querySelector('.app[data-tema="escuro"]');

  const favoritar = (num: number) => {
    const s = new Set(membro.favoritos.hinos);
    if (s.has(num)) s.delete(num); else s.add(num);
    const l = [...s];
    atualizar({ ...membro, favoritos: { ...membro.favoritos, hinos: l } });
    appAtualizarPerfil({ data: { favoritos: { hinos: l } } }).catch(() => {});
  };

  if (aberto) {
    return (
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-[var(--a-borda)] bg-[color-mix(in_srgb,var(--a-sup)_92%,transparent)] px-2 pb-2 pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur-xl">
          <button onClick={() => nav({ search: { n: undefined } })} className="flex items-center gap-1 px-2 py-2 text-[14px] font-semibold text-[var(--a-azul)]"><ChevronLeft size={19} /> Hinário</button>
          <span className="flex-1" />
          <button onClick={() => favoritar(aberto.numero)} className="grid size-10 place-items-center" aria-label="Favorito"><Heart size={19} className={favs.has(aberto.numero) ? "fill-[var(--a-vermelho)] text-[var(--a-vermelho)]" : "text-[var(--a-suave)]"} /></button>
        </header>
        <div className="a-entra bg-[var(--a-sup)] px-5 pb-10 pt-6">
          <LeitorHino key={aberto.numero} hino={aberto} escuro={escuro} anterior={HINARIO[i - 1]?.numero} proximo={HINARIO[i + 1]?.numero} irPara={(x) => nav({ search: { n: x } })} />
        </div>
      </div>
    );
  }

  return (
    <div className="a-entra grid gap-5">
      <header className="a-topo">
        <p className="a-sobre !text-white/80">Salmos e Hinos</p>
        <h1 className="mt-2 text-[28px] font-bold tracking-[-0.02em]">Hinário</h1>
        <div className="relative mt-5">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} inputMode="search" placeholder="Número, título ou trecho" className="h-12 w-full border border-white/20 bg-white/10 pl-10 pr-3 text-[16px] text-white outline-none placeholder:text-white/50 focus:border-white/60" />
        </div>
      </header>
      <div className="flex gap-2 px-5">
        {(["todos", "favoritos"] as const).map((x) => <button key={x} onClick={() => setSo(x)} className={cn("border px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em]", so === x ? "border-[#00436f] bg-[#00436f] text-white" : "border-[var(--a-borda)] text-[var(--a-suave)]")}>{x === "todos" ? "Todos" : "Favoritos"}</button>)}
      </div>
      <ul className="a-cartao mx-5 divide-y divide-[var(--a-borda)]">
        {lista.map((h) => (
          <li key={h.numero}>
            <button onClick={() => nav({ search: { n: h.numero } })} className="flex w-full items-center gap-4 px-4 py-3.5 text-left">
              <span className="w-11 shrink-0 text-[19px] font-extrabold tabular-nums text-[var(--a-azul)]">{h.numero}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-bold">{h.titulo}</span><span className="block truncate font-[Lora] text-[13px] italic text-[var(--a-suave)]">{h.partes[0]?.linhas[0]}</span></span>
              {favs.has(h.numero) && <Heart size={15} className="shrink-0 fill-[var(--a-vermelho)] text-[var(--a-vermelho)]" />}
            </button>
          </li>
        ))}
        {!lista.length && <li className="px-4 py-8 text-center text-[14px] text-[var(--a-suave)]">{so === "favoritos" ? "Toque no coração de um hino para guardá-lo aqui." : "Nenhum hino encontrado."}</li>}
      </ul>
    </div>
  );
}
