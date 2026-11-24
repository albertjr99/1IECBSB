import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Bookmark, ChevronDown, ChevronLeft, ChevronRight, Copy, Search, Share2, Type, X } from "lucide-react";
import { toast } from "sonner";
import { appAtualizarPerfil } from "@/lib/api-app";
import { useMembro } from "@/components/app/contexto";
import { carregarIndice, carregarLivro, filtroLivro, lerReferencia, type Indice, type LivroTexto } from "@/lib/biblia-web";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/biblia")({
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref : undefined }),
  component: Biblia,
});

type Passo = "livro" | "capitulo" | "versiculo";

function Biblia() {
  const { membro, atualizar } = useMembro();
  const busca = Route.useSearch();
  const [indice, setIndice] = useState<Indice | null>(null);
  const [versao, setVersao] = useState(["ara", "nvi"].includes(membro.prefs.versao) ? membro.prefs.versao : "ara");
  const [livro, setLivro] = useState(membro.ultimaLeitura?.livro ?? "JHN");
  const [cap, setCap] = useState(membro.ultimaLeitura?.capitulo ?? 1);
  const [dados, setDados] = useState<LivroTexto | null>(null);
  const [erro, setErro] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [seletor, setSeletor] = useState<Passo | null>(null);
  const [rascunho, setRascunho] = useState({ livro, cap });
  const [testamento, setTestamento] = useState<"AT" | "NT">("NT");
  const [filtro, setFiltro] = useState("");
  const [ir, setIr] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [serifa, setSerifa] = useState(() => { try { return localStorage.getItem("iecb_biblia_fonte") !== "sem"; } catch { return true; } });
  const [comparar, setComparar] = useState<{ sigla: string; versos: [number, string][] } | null>(null);
  const [destino, setDestino] = useState<number | null>(null);
  const salvar = useRef(0);
  const toque = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { carregarIndice().then(setIndice).catch(() => toast.error("Não foi possível abrir a Bíblia.")); }, []);
  useEffect(() => {
    if (!busca.ref) return;
    const [l, c, v] = busca.ref.split(".");
    if (l) { setLivro(l); setCap(Number(c) || 1); if (v) setDestino(Number(v)); }
  }, [busca.ref]);

  useEffect(() => {
    let vivo = true;
    setDados(null); setErro(""); setSel([]);
    carregarLivro(versao, livro).then((l) => vivo && setDados(l)).catch((e) => vivo && setErro(e instanceof Error ? e.message : "Sem conexão."));
    window.clearTimeout(salvar.current);
    salvar.current = window.setTimeout(() => {
      appAtualizarPerfil({ data: { ultimaLeitura: { versao, livro, capitulo: cap } } }).then((r) => atualizar(r.membro)).catch(() => {});
    }, 1500);
    window.scrollTo({ top: 0 });
    return () => { vivo = false; };
  }, [versao, livro]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setSel([]); window.scrollTo({ top: 0 });
    window.clearTimeout(salvar.current);
    salvar.current = window.setTimeout(() => appAtualizarPerfil({ data: { ultimaLeitura: { versao, livro, capitulo: cap } } }).then((r) => atualizar(r.membro)).catch(() => {}), 1500);
  }, [cap]); // eslint-disable-line react-hooks/exhaustive-deps

  const texto = dados?.capitulos[cap - 1] ?? null;
  useEffect(() => {
    if (!destino || !texto) return;
    requestAnimationFrame(() => document.getElementById(`v${destino}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    setSel([destino]); setDestino(null);
  }, [texto]); // eslint-disable-line react-hooks/exhaustive-deps

  const v = indice?.versoes.find((x) => x.id === versao);
  const l = indice?.livros.find((x) => x.id === livro);
  const total = v?.capitulos[livro] ?? 1;
  const ordem = indice?.livros ?? [];
  const favs = new Set(membro.favoritos.versos);
  const chave = (n: number) => `${livro}.${cap}.${n}`;

  const passo = (d: 1 | -1) => {
    if (d === 1 && cap < total) return setCap(cap + 1);
    if (d === -1 && cap > 1) return setCap(cap - 1);
    const nl = ordem[ordem.findIndex((x) => x.id === livro) + d];
    if (nl) { setLivro(nl.id); setCap(d === 1 ? 1 : v?.capitulos[nl.id] ?? 1); }
  };
  const trocarVersao = (id: string) => {
    setVersao(id);
    atualizar({ ...membro, prefs: { ...membro.prefs, versao: id } });
    appAtualizarPerfil({ data: { prefs: { versao: id } } }).catch(() => {});
  };
  const mudarLetra = (d: number) => {
    const letra = Math.min(5, Math.max(1, membro.prefs.letra + d));
    atualizar({ ...membro, prefs: { ...membro.prefs, letra } });
    appAtualizarPerfil({ data: { prefs: { letra } } }).catch(() => {});
  };
  const ordenados = [...sel].sort((a, b) => a - b);
  const refSel = () => {
    const contiguo = ordenados.length > 1 && ordenados.at(-1)! - ordenados[0]! === ordenados.length - 1;
    return `${l?.nome} ${cap}:${contiguo ? `${ordenados[0]}-${ordenados.at(-1)}` : ordenados.join(",")}`;
  };
  const textoSel = () => `“${ordenados.map((n) => texto?.[n - 1]).join(" ")}”\n${refSel()} (${v?.sigla})`;
  const copiar = async () => { await navigator.clipboard?.writeText(textoSel()); toast.success("Versículo copiado."); setSel([]); };
  const compartilhar = async () => { if (navigator.share) { try { await navigator.share({ text: textoSel() }); } catch { /* cancelado */ } } else await copiar(); setSel([]); };
  const guardar = () => {
    const s = new Set(membro.favoritos.versos);
    const todos = sel.every((n) => s.has(chave(n)));
    sel.forEach((n) => (todos ? s.delete(chave(n)) : s.add(chave(n))));
    const lista = [...s];
    atualizar({ ...membro, favoritos: { ...membro.favoritos, versos: lista } });
    appAtualizarPerfil({ data: { favoritos: { versos: lista } } }).catch(() => {});
    toast.success(todos ? "Removido dos guardados." : "Guardado em Mais → Versículos.");
    setSel([]);
  };
  const abrirComparacao = async () => {
    const outra = indice?.versoes.find((x) => x.id !== versao);
    if (!outra) return;
    try {
      const d = await carregarLivro(outra.id, livro);
      setComparar({ sigla: outra.sigla, versos: ordenados.map((n) => [n, d.capitulos[cap - 1]?.[n - 1] ?? ""]) });
    } catch { toast.error("Sem conexão para comparar agora."); }
  };
  const irPara = () => {
    if (!indice) return;
    const r = lerReferencia(ir, indice.livros);
    if (!r) return toast.error("Não encontrei. Ex.: Jo 3:16, Salmos 23, 1Co 13");
    setLivro(r.livro); setCap(Math.min(r.capitulo, v?.capitulos[r.livro] ?? 1)); if (r.verso) setDestino(r.verso);
    setIr(""); setBuscando(false);
  };
  const abrirSeletor = () => { setRascunho({ livro, cap }); setTestamento(l?.testamento ?? "NT"); setFiltro(""); setSeletor("livro"); };
  const escolherVerso = (n: number) => { setLivro(rascunho.livro); setCap(rascunho.cap); setDestino(n); setSeletor(null); };

  const tam = 18 * [0.86, 0.93, 1, 1.12, 1.26][membro.prefs.letra - 1]!;

  return (
    <div
      className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+150px)]"
      onTouchStart={(e) => { toque.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }; }}
      onTouchEnd={(e) => {
        const t = toque.current; toque.current = null;
        if (!t || sel.length) return;
        const dx = e.changedTouches[0]!.clientX - t.x, dy = e.changedTouches[0]!.clientY - t.y;
        if (Math.abs(dx) > 80 && Math.abs(dy) < 50) passo(dx < 0 ? 1 : -1);
      }}
    >
      <header className="sticky top-0 z-30 border-b border-[var(--a-borda)] bg-[color-mix(in_srgb,var(--a-sup)_94%,transparent)] px-3 pb-2.5 pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button onClick={abrirSeletor} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left">
            <span className="truncate text-[19px] font-bold tracking-[-0.01em] text-[var(--a-azul)]">{l?.nome ?? "Bíblia"} {cap}</span>
            <ChevronDown size={18} className="shrink-0 text-[var(--a-suave)]" />
          </button>
          <div className="flex border border-[var(--a-borda)]">
            {indice?.versoes.map((x) => (
              <button key={x.id} onClick={() => trocarVersao(x.id)} className={cn("h-9 px-3 text-[11.5px] font-bold tracking-[0.08em]", x.id === versao ? "bg-[#00436f] text-white" : "text-[var(--a-suave)]")}>{x.sigla}</button>
            ))}
          </div>
          <button onClick={() => setBuscando((b) => !b)} className="grid size-9 place-items-center text-[var(--a-azul)]" aria-label="Ir para"><Search size={19} /></button>
          <button onClick={() => setAjustes((a) => !a)} className="grid size-9 place-items-center text-[var(--a-azul)]" aria-label="Letra"><Type size={19} /></button>
        </div>
        {buscando && (
          <form onSubmit={(e) => { e.preventDefault(); irPara(); }} className="mt-2 flex gap-2">
            <input autoFocus value={ir} onChange={(e) => setIr(e.target.value)} placeholder="Ir para: Jo 3:16, Salmos 23, Rm 8" className="h-11 min-w-0 flex-1 border border-[var(--a-borda)] bg-[var(--a-fundo)] px-3 text-[16px] outline-none focus:border-[var(--a-azul)]" />
            <button className="h-11 bg-[#00436f] px-4 text-[12px] font-bold uppercase tracking-[0.12em] text-white">Ir</button>
          </form>
        )}
        {ajustes && (
          <div className="mt-2 flex items-center gap-2 text-[13px]">
            <span className="mr-1 font-semibold text-[var(--a-suave)]">Letra</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => mudarLetra(n - membro.prefs.letra)} className={cn("grid size-9 place-items-center border font-bold", membro.prefs.letra === n ? "border-[#00436f] bg-[#00436f] text-white" : "border-[var(--a-borda)]")} style={{ fontSize: 9 + n * 2 }}>A</button>
            ))}
            <span className="flex-1" />
            <div className="flex border border-[var(--a-borda)]">
              {([true, false] as const).map((s) => (
                <button key={String(s)} onClick={() => { setSerifa(s); try { localStorage.setItem("iecb_biblia_fonte", s ? "serifa" : "sem"); } catch { /* sem armazenamento */ } }} className={cn("h-9 px-3 font-semibold", serifa === s ? "bg-[#00436f] text-white" : "text-[var(--a-suave)]", s ? "font-[Lora]" : "")}>Aa</button>
              ))}
            </div>
          </div>
        )}
      </header>

      <article className="px-6 pt-7">
        {erro ? (
          <div className="py-16 text-center text-[15px] text-[var(--a-suave)]">{erro}</div>
        ) : !texto ? (
          <div className="grid gap-3 pt-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-4 animate-pulse bg-[var(--a-borda)]" style={{ width: `${70 + ((i * 37) % 30)}%` }} />)}</div>
        ) : (
          <>
            <p className="a-sobre">{l?.nome}</p>
            <p className="mb-2 mt-1 text-[52px] font-extrabold leading-none tracking-[-0.03em] text-[var(--a-azul)]">{cap}</p>
            {texto.map((t, i) => {
              const n = i + 1;
              if (!t) return null;
              const titulo = dados?.titulos[`${cap}:${n}`];
              const marcado = sel.includes(n);
              return (
                <div key={n}>
                  {titulo && <h3 className={cn("mb-2 text-[13.5px] font-bold uppercase tracking-[0.08em] text-[var(--a-azul)]", n > 1 ? "mt-7" : "mt-4")}>{titulo}</h3>}
                  <span
                    id={`v${n}`}
                    onClick={() => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))}
                    className={cn("cursor-pointer rounded-[1px] transition-colors", marcado && "bg-[var(--a-realce)] underline decoration-[var(--a-azul)] decoration-2 underline-offset-4", favs.has(chave(n)) && !marcado && "border-b-2 border-[var(--a-vermelho)]/60")}
                    style={{ fontFamily: serifa ? "Lora, Georgia, serif" : "Montserrat, sans-serif", fontSize: tam, lineHeight: 1.78 }}
                  >
                    <sup className="mr-1 align-[0.55em] font-sans text-[0.58em] font-bold text-[var(--a-azul)]">{n}</sup>{t}{" "}
                  </span>
                </div>
              );
            })}
            <div className="mt-10 grid grid-cols-2 gap-2.5">
              <button onClick={() => passo(-1)} className="flex h-12 items-center justify-center gap-1 border border-[var(--a-borda)] text-[13px] font-semibold text-[var(--a-azul)]"><ChevronLeft size={17} /> Anterior</button>
              <button onClick={() => passo(1)} className="flex h-12 items-center justify-center gap-1 bg-[#00436f] text-[13px] font-semibold text-white">Próximo <ChevronRight size={17} /></button>
            </div>
            <p className="mt-3 text-center text-[11.5px] text-[var(--a-suave)]">Deslize para o lado para trocar de capítulo</p>
            {v && <p className="mt-8 text-[11.5px] leading-relaxed text-[var(--a-suave)]">{v.credito}</p>}
          </>
        )}
      </article>

      {sel.length > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-40 bg-[#00436f] text-white shadow-[0_18px_40px_-12px_rgba(0,20,34,0.6)]">
          <div className="flex items-center gap-1 px-2">
            <span className="flex-1 truncate pl-2 text-[13px] font-bold">{refSel()}</span>
            {[
              { I: Copy, f: copiar, r: "Copiar" },
              { I: Share2, f: compartilhar, r: "Compartilhar" },
              { I: Bookmark, f: guardar, r: "Guardar" },
              { I: ArrowLeftRight, f: abrirComparacao, r: "Comparar versões" },
              { I: X, f: () => setSel([]), r: "Fechar" },
            ].map(({ I, f, r }) => <button key={r} onClick={f} aria-label={r} title={r} className="grid size-12 place-items-center"><I size={19} /></button>)}
          </div>
        </div>
      )}

      {comparar && (
        <Folha titulo={`${refSel()} · ${comparar.sigla}`} fechar={() => setComparar(null)}>
          <div className="px-5 pb-6 pt-2 font-[Lora] text-[17px] leading-relaxed">
            {comparar.versos.map(([n, t]) => <p key={n} className="mb-2"><sup className="mr-1 font-sans text-[0.6em] font-bold text-[var(--a-azul)]">{n}</sup>{t}</p>)}
          </div>
        </Folha>
      )}

      {seletor && indice && v && (
        <Folha
          titulo={seletor === "livro" ? "Escolha o livro" : seletor === "capitulo" ? `${indice.livros.find((x) => x.id === rascunho.livro)?.nome} · capítulo` : `${indice.livros.find((x) => x.id === rascunho.livro)?.nome} ${rascunho.cap} · versículo`}
          voltar={seletor === "livro" ? undefined : () => setSeletor(seletor === "versiculo" ? "capitulo" : "livro")}
          fechar={() => setSeletor(null)}
        >
          {seletor === "livro" ? (
            <div className="px-4 pb-6">
              <div className="sticky top-0 z-10 grid gap-2 bg-[var(--a-sup)] pb-3 pt-1">
                <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Procurar livro" className="h-11 border border-[var(--a-borda)] bg-[var(--a-fundo)] px-3 text-[16px] outline-none focus:border-[var(--a-azul)]" />
                {!filtro && (
                  <div className="grid grid-cols-2 border border-[var(--a-borda)]">
                    {(["AT", "NT"] as const).map((t) => <button key={t} onClick={() => setTestamento(t)} className={cn("h-10 text-[11.5px] font-bold uppercase tracking-[0.12em]", testamento === t ? "bg-[#00436f] text-white" : "text-[var(--a-suave)]")}>{t === "AT" ? "Antigo Testamento" : "Novo Testamento"}</button>)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-px border border-[var(--a-borda)] bg-[var(--a-borda)]">
                {indice.livros.filter((x) => (filtro ? filtroLivro(filtro)(x) : x.testamento === testamento)).map((x) => (
                  <button key={x.id} onClick={() => { setRascunho({ livro: x.id, cap: 1 }); setSeletor((v.capitulos[x.id] ?? 1) > 1 ? "capitulo" : "versiculo"); }} className={cn("bg-[var(--a-sup)] px-4 py-3.5 text-left text-[15px]", x.id === livro ? "font-bold text-[var(--a-azul)]" : "font-medium")}>
                    {x.nome}<span className="ml-1.5 text-[11.5px] font-semibold text-[var(--a-suave)]">{v.capitulos[x.id]}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : seletor === "capitulo" ? (
            <Grade total={v.capitulos[rascunho.livro] ?? 1} atual={rascunho.livro === livro ? cap : 0} escolher={(n) => { setRascunho((r) => ({ ...r, cap: n })); setSeletor("versiculo"); }} rodape={<button onClick={() => { setLivro(rascunho.livro); setCap(1); setSeletor(null); }} className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--a-azul)]">Abrir no capítulo 1</button>} />
          ) : (
            <Versiculos versao={versao} livro={rascunho.livro} cap={rascunho.cap} escolher={escolherVerso} abrirCapitulo={() => { setLivro(rascunho.livro); setCap(rascunho.cap); setSeletor(null); }} />
          )}
        </Folha>
      )}
    </div>
  );
}

function Folha({ titulo, children, fechar, voltar }: { titulo: string; children: React.ReactNode; fechar: () => void; voltar?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[#00142280]" onClick={fechar}>
      <div className="max-h-[86dvh] overflow-y-auto bg-[var(--a-sup)] pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_50px_-20px_rgba(0,20,34,0.5)]" onClick={(e) => e.stopPropagation()} style={{ animation: "a-entra .3s cubic-bezier(.2,.8,.2,1) both" }}>
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-[var(--a-borda)] bg-[var(--a-sup)] px-3 py-3">
          {voltar ? <button onClick={voltar} className="grid size-9 place-items-center text-[var(--a-azul)]" aria-label="Voltar"><ChevronLeft size={20} /></button> : <span className="w-2" />}
          <p className="flex-1 truncate text-[15.5px] font-bold">{titulo}</p>
          <button onClick={fechar} className="grid size-9 place-items-center text-[var(--a-suave)]" aria-label="Fechar"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Grade({ total, atual, escolher, rodape }: { total: number; atual: number; escolher: (n: number) => void; rodape?: React.ReactNode }) {
  return (
    <div className="px-4 pb-6 pt-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => escolher(n)} className={cn("grid h-12 place-items-center border text-[15px] font-bold tabular-nums", n === atual ? "border-[#00436f] bg-[#00436f] text-white" : "border-[var(--a-borda)]")}>{n}</button>
        ))}
      </div>
      {rodape && <div className="mt-4 text-center">{rodape}</div>}
    </div>
  );
}

function Versiculos({ versao, livro, cap, escolher, abrirCapitulo }: { versao: string; livro: string; cap: number; escolher: (n: number) => void; abrirCapitulo: () => void }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => { carregarLivro(versao, livro).then((d) => setN(d.capitulos[cap - 1]?.length ?? 0)).catch(() => setN(0)); }, [versao, livro, cap]);
  if (n === null) return <div className="p-8 text-center text-[14px] text-[var(--a-suave)]">Carregando…</div>;
  return <Grade total={n} atual={0} escolher={escolher} rodape={<button onClick={abrirCapitulo} className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--a-azul)]">Abrir o capítulo inteiro</button>} />;
}

