import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, CircleDot, Copy, Eye, EyeOff, FileDown, FilePlus2, Globe, Link2, Loader2,
  Newspaper, Plus, Share2, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  blocoNovo, boletimModelo, dataPorExtenso, duplicarParaProximo, novoIdB, proximoDomingo, TIPO_ROTULO,
  type Bloco, type Boletim, type ResumoBoletim, type TipoBloco,
} from "@/lib/boletim";
import { excluirBoletim, listarBoletinsPainel, obterBoletimPainel, publicarBoletim, salvarBoletim } from "@/lib/api-boletim";
import { cn } from "@/lib/utils";
import { FolhasEscaladas } from "@/components/boletim/Folhas";
import { IconeWhatsapp } from "@/components/site/Icones";
import { EditorBloco } from "./EditorBloco";

const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export function ModuloBoletim() {
  const [aberto, setAberto] = useState<string | null>(null);
  return aberto ? <EditorBoletim id={aberto} aoVoltar={() => setAberto(null)} /> : <ListaBoletins aoAbrir={setAberto} />;
}

// ─── Lista ──────────────────────────────────────────────────────────────────

function ListaBoletins({ aoAbrir }: { aoAbrir: (id: string) => void }) {
  const [lista, setLista] = useState<ResumoBoletim[] | null>(null);
  const [criando, setCriando] = useState(false);
  const carregar = useCallback(() => { listarBoletinsPainel().then(setLista).catch((e) => toast.error(e.message)); }, []);
  useEffect(carregar, [carregar]);

  const criar = async (deModelo: boolean) => {
    setCriando(true);
    try {
      let novo: Boletim;
      if (!deModelo && lista && lista[0]) {
        const { boletim } = await obterBoletimPainel({ data: { id: lista[0].id } });
        novo = duplicarParaProximo(boletim);
        while (lista.some((x) => x.data === novo.data)) novo = duplicarParaProximo(novo);
      } else {
        novo = boletimModelo();
        if (lista?.some((x) => x.data === novo.data)) novo.data = proximoDomingo();
      }
      await salvarBoletim({ data: { boletim: novo, acao: "Criou boletim" } });
      aoAbrir(novo.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar.");
    } finally { setCriando(false); }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Boletim</h1>
          <p className="text-[13.5px] text-p-suave">Monte o boletim dominical no modelo da igreja, publique no site e compartilhe em PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lista && lista.length > 0 && (
            <button disabled={criando} onClick={() => criar(false)} className="btn-primario !h-9 !px-3.5 !text-[13.5px] ">
              {criando ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />} Novo boletim
            </button>
          )}
        </div>
      </div>

      {!lista ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-p-suave" /></div>
      ) : lista.length === 0 ? (
        <div className="rounded-lg border border-dashed border-p-borda-forte bg-p-superficie p-10 text-center">
          <Newspaper className="mx-auto text-p-acento" size={36} />
          <h2 className="mt-4 text-lg font-bold">Comece pelo boletim de 22 de novembro</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-p-suave">
            Transcrevemos o boletim de 22/11/2026 no modelo da igreja. A partir dele, cada novo boletim já nasce com as mesmas seções — é só atualizar.
          </p>
          <button disabled={criando} onClick={() => criar(true)} className="btn-primario !h-9 !px-3.5 !text-[13.5px] mt-6">
            {criando ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />} Criar a partir do modelo
          </button>
        </div>
      ) : (
        <ul className="grid gap-2">
          {lista.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-p-borda bg-p-superficie p-4">
              <button onClick={() => aoAbrir(b.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                <span className="grid size-12 shrink-0 place-items-center rounded-md bg-p-realce text-p-acento"><Newspaper size={20} /></span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-p-texto">{b.titulo} – {dataPorExtenso(b.data)}</span>
                  <span className="block text-[12.5px] text-p-suave">{b.paginas} páginas · alterado por {b.atualizadoPor || "—"} em {new Date(b.atualizadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </span>
              </button>
              <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-bold", b.publicado ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-800 dark:text-amber-300")}>
                {b.publicado ? "No site" : "Rascunho"}
              </span>
              <a href={`/api/boletim/${b.id}/pdf`} target="_blank" rel="noopener" className="rounded-lg p-2 text-p-suave hover:bg-p-hover" title="Abrir PDF"><FileDown size={17} /></a>
              <button
                title="Excluir"
                onClick={async () => {
                  if (!confirm(`Excluir o boletim de ${dataBR(b.data)}? Esta ação não pode ser desfeita.`)) return;
                  try { await excluirBoletim({ data: { id: b.id } }); carregar(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
                }}
                className="rounded-lg p-2 text-p-suave hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
              ><Trash2 size={17} /></button>
            </li>
          ))}
        </ul>
      )}
      {lista && lista.length > 0 && (
        <p className="text-[12.5px] text-p-suave">“Novo boletim” copia o mais recente para o domingo seguinte — com as mesmas seções, prontas para atualizar.</p>
      )}
    </div>
  );
}

// ─── Editor ─────────────────────────────────────────────────────────────────

type Estado = "salvo" | "pendente" | "salvando" | "erro";

function resumoBloco(b: Bloco): string {
  switch (b.tipo) {
    case "artigo": return b.titulo || b.rotulo;
    case "avisos": return b.itens.map((i) => i.titulo).filter(Boolean).join(", ");
    case "texto": return b.titulo;
    default: return "titulo" in b ? String(b.titulo) : "";
  }
}

function EditorBoletim({ id, aoVoltar }: { id: string; aoVoltar: () => void }) {
  const [b, setB] = useState<Boletim | null>(null);
  const [estado, setEstado] = useState<Estado>("salvo");
  const [sel, setSel] = useState<string | null>(null);
  const [menuNovo, setMenuNovo] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  const primeira = useRef(true);
  const bRef = useRef(b);
  bRef.current = b;

  useEffect(() => {
    obterBoletimPainel({ data: { id } }).then((r) => setB(r.boletim)).catch((e) => { toast.error(e.message); aoVoltar(); });
  }, [id]);

  const mudar = useCallback((fn: (d: Boletim) => void) => {
    setB((ant) => { if (!ant) return ant; const d = structuredClone(ant); fn(d); return d; });
  }, []);

  // salvamento automático
  useEffect(() => {
    if (!b) return;
    if (primeira.current) { primeira.current = false; return; }
    setEstado("pendente");
    const t = setTimeout(async () => {
      setEstado("salvando");
      try { await salvarBoletim({ data: { boletim: bRef.current! } }); setEstado("salvo"); }
      catch (e) { setEstado("erro"); toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
    }, 1000);
    return () => clearTimeout(t);
  }, [b]);

  const local = useMemo(() => {
    if (!b || !sel) return null;
    for (let pi = 0; pi < b.paginas.length; pi++) {
      const bi = b.paginas[pi]!.blocos.findIndex((x) => x.id === sel);
      if (bi >= 0) return { pi, bi };
    }
    return null;
  }, [b, sel]);

  if (!b) return <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-p-acento" /></div>;

  const linkSite = typeof window !== "undefined" ? `${window.location.origin}/boletim/${b.data}` : `/boletim/${b.data}`;
  const linkPdf = `/api/boletim/${b.publicado ? b.data : b.id}/pdf`;

  const moverBloco = (pi: number, bi: number, dir: -1 | 1) => mudar((d) => {
    const pag = d.paginas[pi]!;
    const [bl] = pag.blocos.splice(bi, 1);
    const alvo = bi + dir;
    if (alvo >= 0 && alvo <= pag.blocos.length) pag.blocos.splice(alvo, 0, bl!);
    else if (dir < 0 && pi > 0) d.paginas[pi - 1]!.blocos.push(bl!);
    else if (dir > 0 && pi < d.paginas.length - 1) d.paginas[pi + 1]!.blocos.unshift(bl!);
    else pag.blocos.splice(bi, 0, bl!);
  });

  const alternarPublicacao = async () => {
    setPublicando(true);
    try {
      await salvarBoletim({ data: { boletim: b } });
      const r = await publicarBoletim({ data: { id: b.id, publicar: !b.publicado } });
      primeira.current = true;
      setB({ ...b, publicado: !b.publicado, ...(r.publicadoEm ? { publicadoEm: r.publicadoEm } : {}) });
      toast.success(b.publicado ? "Boletim retirado do site." : "Boletim publicado no site!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } finally { setPublicando(false); }
  };

  const compartilhar = async () => {
    const texto = `${b.titulo} – ${dataPorExtenso(b.data)}`;
    if (navigator.share) {
      try { await navigator.share({ title: texto, text: texto, url: linkSite }); return; } catch { /* cancelado */ }
    }
    await navigator.clipboard?.writeText(linkSite);
    toast.success("Link copiado.");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* barra do boletim */}
      <div className="flex flex-wrap items-center gap-2 border-b border-p-borda bg-p-superficie px-3 py-2 sm:px-5">
        <button onClick={aoVoltar} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-p-texto-2 hover:bg-p-hover"><ArrowLeft size={16} /> Boletins</button>
        <span className="mx-1 h-6 w-px bg-p-borda" />
        <input
          type="date"
          value={b.data}
          onChange={(e) => e.target.value && mudar((d) => { d.data = e.target.value; })}
          className="rounded-lg border border-p-borda-forte px-2.5 py-1.5 text-[13.5px]"
          aria-label="Data do boletim"
        />
        <span className="flex items-center gap-1.5 text-[12px] text-p-suave">
          {estado === "salvando" && <><Loader2 size={12} className="animate-spin" /> Salvando…</>}
          {estado === "pendente" && <><CircleDot size={12} className="text-amber-500" /> Editando…</>}
          {estado === "salvo" && <><Check size={12} className="text-emerald-600 dark:text-emerald-400" /> Salvo</>}
          {estado === "erro" && <span className="text-red-600 dark:text-red-400">Não salvo</span>}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <a href={linkPdf} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-p-texto-2 hover:bg-p-hover"><FileDown size={16} /> PDF</a>
          {b.publicado && (
            <>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${b.titulo} – ${dataPorExtenso(b.data)}\n${linkSite}`)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"><IconeWhatsapp size={16} /> WhatsApp</a>
              <button onClick={compartilhar} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-p-texto-2 hover:bg-p-hover"><Share2 size={16} /> Compartilhar</button>
              <a href={`/boletim/${b.data}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-p-texto-2 hover:bg-p-hover"><Globe size={16} /> Ver no site</a>
            </>
          )}
          <button disabled={publicando} onClick={alternarPublicacao} className={b.publicado ? "btn-contorno !h-9 !px-3.5 !text-[13.5px] " : "btn-destaque !h-9 !px-3.5 !text-[13.5px] "}>
            {publicando ? <Loader2 size={15} className="animate-spin" /> : b.publicado ? <EyeOff size={15} /> : <Eye size={15} />}
            {b.publicado ? "Retirar do site" : "Publicar no site"}
          </button>
        </div>
      </div>
      {b.publicado && (
        <div className="flex items-center gap-2 bg-emerald-500/10 px-5 py-1.5 text-[12.5px] text-emerald-800 dark:text-emerald-300">
          <Link2 size={13} /> No ar em <a className="font-semibold underline" href={`/boletim/${b.data}`} target="_blank" rel="noopener">{linkSite.replace(/^https?:\/\//, "")}</a> — alterações salvas aparecem no site na hora.
          <button onClick={() => navigator.clipboard?.writeText(linkSite).then(() => toast.success("Link copiado."))} className="ml-1 rounded p-1 hover:bg-emerald-500/15" title="Copiar link"><Copy size={13} /></button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* estrutura e edição */}
        <aside className="w-full shrink-0 overflow-y-auto overflow-x-hidden border-r border-p-borda bg-p-sutil lg:w-[480px]">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4">
            {b.paginas.map((pg, pi) => (
              <section key={pg.id} className="min-w-0 rounded-lg border border-p-borda bg-p-superficie">
                <header className="flex items-center gap-1 border-b border-p-borda px-3 py-2">
                  <span className="flex-1 text-[12px] font-bold uppercase tracking-wider text-p-suave">Página {pi + 1}{pi === 0 && " · capa"}</span>
                  <button title="Subir página" disabled={pi === 0} onClick={() => mudar((d) => { const [p] = d.paginas.splice(pi, 1); d.paginas.splice(pi - 1, 0, p!); })} className="rounded p-1 text-p-suave hover:bg-p-hover disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button title="Descer página" disabled={pi === b.paginas.length - 1} onClick={() => mudar((d) => { const [p] = d.paginas.splice(pi, 1); d.paginas.splice(pi + 1, 0, p!); })} className="rounded p-1 text-p-suave hover:bg-p-hover disabled:opacity-30"><ArrowDown size={14} /></button>
                  <button title="Excluir página" disabled={b.paginas.length === 1} onClick={() => { if (confirm(`Excluir a página ${pi + 1} e tudo o que há nela?`)) mudar((d) => { d.paginas.splice(pi, 1); }); }} className="rounded p-1 text-p-suave hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 disabled:opacity-30"><Trash2 size={14} /></button>
                </header>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 p-2">
                  {pg.blocos.length === 0 && <p className="px-2 py-3 text-center text-[12.5px] text-p-suave">Página vazia</p>}
                  {pg.blocos.map((bl, bi) => {
                    const ativo = sel === bl.id;
                    return (
                      <div key={bl.id} className={cn("rounded-md border", ativo ? "border-p-acento/50 shadow-md" : "border-p-borda")}>
                        <div className="flex items-center gap-0.5 pl-2.5 pr-1">
                          <button onClick={() => setSel(ativo ? null : bl.id)} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left">
                            <ChevronDown size={14} className={cn("shrink-0 text-p-suave transition-transform", ativo && "rotate-180")} />
                            <span className="min-w-0">
                              <span className="block text-[13px] font-semibold text-p-texto">{TIPO_ROTULO[bl.tipo]}</span>
                              <span className="block truncate text-[11.5px] text-p-suave">{resumoBloco(bl)}</span>
                            </span>
                          </button>
                          <button title="Subir" onClick={() => moverBloco(pi, bi, -1)} disabled={pi === 0 && bi === 0} className="rounded p-1 text-p-suave hover:bg-p-hover disabled:opacity-30"><ArrowUp size={14} /></button>
                          <button title="Descer" onClick={() => moverBloco(pi, bi, 1)} disabled={pi === b.paginas.length - 1 && bi === pg.blocos.length - 1} className="rounded p-1 text-p-suave hover:bg-p-hover disabled:opacity-30"><ArrowDown size={14} /></button>
                          <button title="Duplicar" onClick={() => mudar((d) => { const c = structuredClone(bl); c.id = novoIdB(bl.tipo.slice(0, 3)); d.paginas[pi]!.blocos.splice(bi + 1, 0, c); })} className="rounded p-1 text-p-suave hover:bg-p-hover"><Copy size={14} /></button>
                          <button title="Excluir" onClick={() => { if (confirm(`Excluir “${TIPO_ROTULO[bl.tipo]}”?`)) mudar((d) => { d.paginas[pi]!.blocos.splice(bi, 1); }); }} className="rounded p-1 text-p-suave hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"><Trash2 size={14} /></button>
                        </div>
                        {ativo && local && (
                          <div className="border-t border-p-borda p-3">
                            <EditorBloco b={bl} mudar={(fn) => mudar((d) => fn(d.paginas[local.pi]!.blocos[local.bi]!))} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="relative">
                    <button onClick={() => setMenuNovo(menuNovo === pg.id ? null : pg.id)} className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-p-borda-forte py-2 text-[12.5px] font-semibold text-p-acento hover:border-p-acento hover:bg-p-realce">
                      <Plus size={14} /> Adicionar seção
                    </button>
                    {menuNovo === pg.id && (
                      <div className="absolute inset-x-0 top-full z-20 mt-1 grid grid-cols-2 gap-1 rounded-md border border-p-borda bg-p-superficie p-2 shadow-xl">
                        {(Object.keys(TIPO_ROTULO) as TipoBloco[]).map((t) => (
                          <button key={t} onClick={() => { const n = blocoNovo(t); mudar((d) => { d.paginas[pi]!.blocos.push(n); }); setSel(n.id); setMenuNovo(null); }} className="rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium text-p-texto-2 hover:bg-p-realce hover:text-p-acento">
                            {TIPO_ROTULO[t]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ))}
            <button onClick={() => mudar((d) => { d.paginas.push({ id: novoIdB("pg"), blocos: [] }); })} className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-p-borda-forte py-3 text-[13.5px] font-semibold text-p-texto-2 hover:border-p-acento hover:text-p-acento">
              <Plus size={16} /> Adicionar página
            </button>
          </div>
        </aside>

        {/* prévia exata */}
        <section className="hidden min-w-0 flex-1 overflow-y-auto bg-p-fundo p-6 lg:block" onClick={() => setSel(null)}>
          <div className="mx-auto max-w-[600px]">
            <FolhasEscaladas boletim={b} marcarTransbordo aoSelecionar={setSel} selecionado={sel} espaco={24} />
            <p className="mt-4 text-center text-[12px] text-p-texto-2">Clique numa seção da prévia para editá-la. É exatamente assim que sai no PDF.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
