import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, ChevronDown, ChevronLeft, ChevronRight, Copy, Minus, Plus, Search, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { appAtualizarPerfil } from "@/lib/api-app";
import { useMembro } from "@/components/app/contexto";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/biblia")({
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref : undefined }),
  component: Biblia,
});

type Livro = { id: string; nome: string; testamento: "AT" | "NT" };
type Versao = { id: string; nome: string; sigla: string; credito: string; capitulos: Record<string, number> };
type Indice = { livros: Livro[]; versoes: Versao[] };

let indiceCache: Promise<Indice> | null = null;
const carregarIndice = () => (indiceCache ??= fetch("/biblia/indice.json").then((r) => r.json()));
const livrosCache = new Map<string, Promise<string[][]>>();
const carregarLivro = (v: string, l: string) => {
  const k = `${v}/${l}`;
  if (!livrosCache.has(k)) livrosCache.set(k, fetch(`/biblia/${k}.json`).then((r) => { if (!r.ok) throw new Error(); return r.json(); }));
  return livrosCache.get(k)!;
};

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "");

/** Abreviações usuais em português (o acento distingue Jó de Jo/João). */
const ABREV: Record<string, string> = {
  gn: "GEN", ex: "EXO", lv: "LEV", nm: "NUM", dt: "DEU", js: "JOS", jz: "JDG", rt: "RUT", "1sm": "1SA", "2sm": "2SA", "1rs": "1KI", "2rs": "2KI", "1cr": "1CH", "2cr": "2CH",
  ed: "EZR", ne: "NEH", et: "EST", "jó": "JOB", sl: "PSA", pv: "PRO", ec: "ECC", ct: "SNG", is: "ISA", jr: "JER", lm: "LAM", ez: "EZK", dn: "DAN", os: "HOS", jl: "JOL",
  am: "AMO", ob: "OBA", jn: "JON", mq: "MIC", na: "NAM", hc: "HAB", sf: "ZEP", ag: "HAG", zc: "ZEC", ml: "MAL", mt: "MAT", mc: "MRK", lc: "LUK", jo: "JHN", joao: "JHN",
  at: "ACT", rm: "ROM", "1co": "1CO", "2co": "2CO", gl: "GAL", ef: "EPH", fp: "PHP", fl: "PHP", cl: "COL", "1ts": "1TH", "2ts": "2TH", "1tm": "1TI", "2tm": "2TI", tt: "TIT",
  fm: "PHM", hb: "HEB", tg: "JAS", "1pe": "1PE", "2pe": "2PE", "1jo": "1JN", "2jo": "2JN", "3jo": "3JN", jd: "JUD", ap: "REV",
};

/** "Jo 3:16", "joão 3", "1 co 13 4", "Salmos 23" → livro, capítulo, versículo. */
function lerReferencia(t: string, livros: Livro[]) {
  const m = /^\s*(\d?\s*[^\d\s:.,]+(?:\s+[^\d\s:.,]+)?)\s*(\d+)?(?:\s*[:.,\s]\s*(\d+))?\s*$/.exec(t);
  if (!m) return null;
  const bruto = m[1]!.toLowerCase().replace(/\s+/g, "");
  const q = norm(m[1]!);
  const id =
    livros.find((l) => l.nome.toLowerCase().replace(/\s+/g, "") === bruto)?.id ??
    ABREV[bruto] ?? ABREV[q] ??
    livros.find((l) => norm(l.nome) === q)?.id ??
    livros.find((l) => norm(l.nome).startsWith(q))?.id;
  if (!id) return null;
  return { livro: id, capitulo: m[2] ? Number(m[2]) : 1, verso: m[3] ? Number(m[3]) : undefined };
}

function Biblia() {
  const { membro, atualizar } = useMembro();
  const busca = Route.useSearch();
  const [indice, setIndice] = useState<Indice | null>(null);
  const [versao, setVersao] = useState(membro.prefs.versao || "blivre");
  const [livro, setLivro] = useState(membro.ultimaLeitura?.livro ?? "JHN");
  const [cap, setCap] = useState(membro.ultimaLeitura?.capitulo ?? 1);
  const [texto, setTexto] = useState<string[] | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [seletor, setSeletor] = useState<"livro" | "capitulo" | null>(null);
  const [testamento, setTestamento] = useState<"AT" | "NT">("NT");
  const [ir, setIr] = useState("");
  const [destino, setDestino] = useState<number | null>(null);
  const salvar = useRef(0);

  useEffect(() => { carregarIndice().then(setIndice).catch(() => toast.error("Não foi possível abrir a Bíblia.")); }, []);
  useEffect(() => {
    if (!indice || !busca.ref) return;
    const [l, c, v] = busca.ref.split(".");
    if (l && indice.livros.some((x) => x.id === l)) { setLivro(l); setCap(Number(c) || 1); if (v) setDestino(Number(v)); }
  }, [indice, busca.ref]);

  useEffect(() => {
    setTexto(null);
    setSel([]);
    carregarLivro(versao, livro).then((l) => setTexto(l[cap - 1] ?? [])).catch(() => setTexto([]));
    // lembra onde parou (no aparelho e no perfil)
    window.clearTimeout(salvar.current);
    salvar.current = window.setTimeout(() => {
      appAtualizarPerfil({ data: { ultimaLeitura: { versao, livro, capitulo: cap } } }).then((r) => atualizar(r.membro)).catch(() => {});
    }, 1500);
    window.scrollTo({ top: 0 });
  }, [versao, livro, cap]);

  useEffect(() => {
    if (!destino || !texto) return;
    requestAnimationFrame(() => document.getElementById(`v${destino}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    setSel([destino]);
    setDestino(null);
  }, [texto]);

  const v = indice?.versoes.find((x) => x.id === versao);
  const l = indice?.livros.find((x) => x.id === livro);
  const total = v?.capitulos[livro] ?? 1;
  const ordem = indice?.livros ?? [];
  const passo = (d: 1 | -1) => {
    if (!indice) return;
    if (d === 1 && cap < total) return setCap(cap + 1);
    if (d === -1 && cap > 1) return setCap(cap - 1);
    const i = ordem.findIndex((x) => x.id === livro) + d;
    const nl = ordem[i];
    if (!nl) return;
    setLivro(nl.id);
    setCap(d === 1 ? 1 : v?.capitulos[nl.id] ?? 1);
  };
  const favoritos = new Set(membro.favoritos.versos);
  const chave = (n: number) => `${livro}.${cap}.${n}`;
  const textoSel = useMemo(() => {
    if (!texto || !sel.length || !l) return "";
    const ord = [...sel].sort((a, b) => a - b);
    const faixa = ord.length > 1 && ord[ord.length - 1]! - ord[0]! === ord.length - 1 ? `${ord[0]}-${ord[ord.length - 1]}` : ord.join(",");
    return `“${ord.map((n) => texto[n - 1]).join(" ")}”\n${l.nome} ${cap}:${faixa} (${v?.sigla})`;
  }, [sel, texto, l, cap, v]);

  const mudarLetra = (d: number) => {
    const letra = Math.min(5, Math.max(1, membro.prefs.letra + d));
    atualizar({ ...membro, prefs: { ...membro.prefs, letra } });
    appAtualizarPerfil({ data: { prefs: { letra } } }).catch(() => {});
  };
  const trocarVersao = (id: string) => {
    setVersao(id);
    atualizar({ ...membro, prefs: { ...membro.prefs, versao: id } });
    appAtualizarPerfil({ data: { prefs: { versao: id } } }).catch(() => {});
  };
  const guardar = async () => {
    const novos = new Set(membro.favoritos.versos);
    const todos = sel.every((n) => novos.has(chave(n)));
    sel.forEach((n) => (todos ? novos.delete(chave(n)) : novos.add(chave(n))));
    const versos = [...novos];
    atualizar({ ...membro, favoritos: { ...membro.favoritos, versos } });
    setSel([]);
    toast.success(todos ? "Tirado dos guardados." : "Guardado em Mais › Versículos guardados.");
    appAtualizarPerfil({ data: { favoritos: { versos } } }).catch(() => {});
  };

  return (
    <div className="min-h-dvh">
      {/* barra de leitura */}
      <header className="sticky top-0 z-30 border-b border-[var(--a-borda)] bg-[color-mix(in_srgb,var(--a-sup)_90%,transparent)] px-3 pb-2 pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button onClick={() => setSeletor("livro")} className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-2 text-left">
            <span className="truncate text-[19px] font-bold tracking-[-0.01em] text-[var(--a-azul)]">{l?.nome ?? "…"} {cap}</span>
            <ChevronDown size={17} className="shrink-0 text-[var(--a-suave)]" />
          </button>
          <div className="flex border border-[var(--a-borda)]">
            {indice?.versoes.map((x) => (
              <button key={x.id} onClick={() => trocarVersao(x.id)} className={cn("px-2.5 py-1.5 text-[11px] font-bold tracking-[0.06em]", versao === x.id ? "bg-[#00436f] text-white" : "text-[var(--a-suave)]")}>{x.sigla}</button>
            ))}
          </div>
          <button onClick={() => mudarLetra(-1)} className="grid size-9 place-items-center text-[var(--a-suave)]" aria-label="Letra menor"><Minus size={16} /></button>
          <button onClick={() => mudarLetra(1)} className="grid size-9 place-items-center text-[var(--a-suave)]" aria-label="Letra maior"><Plus size={16} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); const r = indice && lerReferencia(ir, indice.livros); if (!r) { toast.error("Não encontrei essa referência. Ex.: Jo 3:16"); return; } setLivro(r.livro); setCap(r.capitulo); if (r.verso) setDestino(r.verso); setIr(""); (document.activeElement as HTMLElement)?.blur(); }} className="relative mt-1.5 px-1">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--a-suave)]" />
          <input value={ir} onChange={(e) => setIr(e.target.value)} placeholder="Ir para… ex.: Salmos 23 ou Jo 3:16" className="a-campo !h-10 pl-9 !text-[14.5px]" enterKeyHint="go" />
        </form>
      </header>

      {/* texto */}
      <article className="px-5 pb-6 pt-6">
        {cap === 1 && <p className="a-sobre mb-2">{l?.testamento === "AT" ? "Antigo Testamento" : "Novo Testamento"}</p>}
        <h1 className="mb-5 text-[30px] font-bold tracking-[-0.02em] text-[var(--a-azul)]">{l?.nome} <span className="text-[var(--a-suave)]">{cap}</span></h1>
        {!texto ? (
          <div className="grid gap-3">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-4 animate-pulse bg-[var(--a-borda)]" style={{ width: `${70 + ((i * 37) % 30)}%` }} />)}</div>
        ) : (
          <p className="a-leitura">
            {texto.map((t, i) => {
              const n = i + 1;
              return (
                <span key={n} id={`v${n}`} data-sel={sel.includes(n) ? 1 : 0} data-fav={favoritos.has(chave(n)) ? 1 : 0} onClick={() => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))} className="a-verso cursor-pointer">
                  <sup>{n}</sup>{t}{" "}
                </span>
              );
            })}
          </p>
        )}
        <div className="mt-10 flex items-center justify-between border-t border-[var(--a-borda)] pt-5">
          <button onClick={() => passo(-1)} className="a-btn a-btn-sec !h-11 !px-4"><ChevronLeft size={17} /> Anterior</button>
          <button onClick={() => passo(1)} className="a-btn a-btn-sec !h-11 !px-4">Próximo <ChevronRight size={17} /></button>
        </div>
        {v && <p className="mt-8 text-[11.5px] leading-relaxed text-[var(--a-suave)]">{v.credito}</p>}
      </article>

      {/* versículos selecionados */}
      {sel.length > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+78px)] z-40 flex items-center justify-between gap-1 border border-white/15 bg-[#002a47]/95 px-2 py-2 text-white shadow-2xl backdrop-blur-xl">
          <span className="px-2 text-[12.5px] font-semibold">{sel.length} {sel.length === 1 ? "versículo" : "versículos"}</span>
          <div className="flex">
            <button onClick={() => navigator.clipboard?.writeText(textoSel).then(() => { toast.success("Copiado."); setSel([]); })} className="grid size-11 place-items-center" aria-label="Copiar"><Copy size={18} /></button>
            <button onClick={async () => { if (navigator.share) { try { await navigator.share({ text: textoSel }); setSel([]); } catch { /* cancelado */ } } else { await navigator.clipboard?.writeText(textoSel); toast.success("Copiado para compartilhar."); } }} className="grid size-11 place-items-center" aria-label="Compartilhar"><Share2 size={18} /></button>
            <button onClick={guardar} className="grid size-11 place-items-center" aria-label="Guardar"><Bookmark size={18} /></button>
            <button onClick={() => setSel([])} className="grid size-11 place-items-center text-white/70" aria-label="Limpar"><X size={18} /></button>
          </div>
        </div>
      )}

      {/* escolher livro e capítulo */}
      {seletor && indice && (
        <>
          <div className="a-veu" onClick={() => setSeletor(null)} />
          <div className="a-folha">
            <div className="sticky top-0 flex items-center justify-between border-b border-[var(--a-borda)] bg-[var(--a-sup)] px-5 py-3.5">
              {seletor === "livro" ? (
                <div className="flex border border-[var(--a-borda)]">
                  {(["AT", "NT"] as const).map((t) => <button key={t} onClick={() => setTestamento(t)} className={cn("px-4 py-2 text-[11.5px] font-bold uppercase tracking-[0.12em]", testamento === t ? "bg-[#00436f] text-white" : "text-[var(--a-suave)]")}>{t === "AT" ? "Antigo" : "Novo"} Testamento</button>)}
                </div>
              ) : (
                <button onClick={() => setSeletor("livro")} className="flex items-center gap-1 text-[16px] font-bold text-[var(--a-azul)]"><ChevronLeft size={18} /> {l?.nome}</button>
              )}
              <button onClick={() => setSeletor(null)} className="grid size-9 place-items-center text-[var(--a-suave)]" aria-label="Fechar"><X size={20} /></button>
            </div>
            {seletor === "livro" ? (
              <ul className="grid grid-cols-2 gap-px bg-[var(--a-borda)] p-px">
                {indice.livros.filter((x) => x.testamento === testamento).map((x) => (
                  <li key={x.id}><button onClick={() => { setLivro(x.id); setCap(1); setSeletor("capitulo"); }} className={cn("w-full bg-[var(--a-sup)] px-4 py-3.5 text-left text-[15px] font-semibold", x.id === livro && "text-[var(--a-azul)]")}>{x.nome}</button></li>
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-6 gap-2 p-4">
                {Array.from({ length: v?.capitulos[livro] ?? 1 }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => { setCap(n); setSeletor(null); }} className={cn("grid aspect-square place-items-center border text-[16px] font-bold", n === cap ? "border-[#00436f] bg-[#00436f] text-white" : "border-[var(--a-borda)] bg-[var(--a-sup)]")}>{n}</button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
