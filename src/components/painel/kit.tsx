/**
 * Peças de formulário do painel. Cada editor de seção é montado com elas,
 * então toda a experiência de edição fica consistente.
 */
import { useId, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { enviarImagem } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Secao({ titulo, descricao, children, acao }: { titulo: string; descricao?: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900">{titulo}</h3>
          {descricao && <p className="mt-1 text-[13px] text-slate-500">{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

export function Grade({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={cn("grid gap-4", cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>{children}</div>;
}

const estiloCampo =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[14.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-marca focus:ring-3 focus:ring-marca/15";

export function Campo({
  rotulo, valor, onChange, dica, multilinha, linhas = 4, placeholder, tipo = "text",
}: {
  rotulo: string; valor: string; onChange: (v: string) => void; dica?: string; multilinha?: boolean; linhas?: number; placeholder?: string; tipo?: string;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-slate-700">{rotulo}</label>
      {multilinha ? (
        <textarea id={id} rows={linhas} value={valor} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(estiloCampo, "resize-y leading-relaxed")} />
      ) : (
        <input id={id} type={tipo} value={valor} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={estiloCampo} />
      )}
      {dica && <p className="text-[12px] text-slate-500">{dica}</p>}
    </div>
  );
}

export function Selecao<T extends string>({ rotulo, valor, opcoes, onChange }: { rotulo: string; valor: T; opcoes: { valor: T; rotulo: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-slate-700">{rotulo}</label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value as T)} className={estiloCampo}>
        {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
    </div>
  );
}

export function Interruptor({ rotulo, valor, onChange, dica }: { rotulo: string; valor: boolean; onChange: (v: boolean) => void; dica?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50">
      <span>
        <span className="block text-[14px] font-semibold text-slate-800">{rotulo}</span>
        {dica && <span className="block text-[12px] text-slate-500">{dica}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={valor}
        onClick={() => onChange(!valor)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", valor ? "bg-marca" : "bg-slate-300")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", valor ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

export function CampoCor({ rotulo, valor, onChange, dica }: { rotulo: string; valor: string; onChange: (v: string) => void; dica?: string }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-semibold text-slate-700">{rotulo}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={valor} onChange={(e) => onChange(e.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300 bg-white p-1" />
        <input value={valor} onChange={(e) => onChange(e.target.value)} className={cn(estiloCampo, "font-mono uppercase")} />
      </div>
      {dica && <p className="text-[12px] text-slate-500">{dica}</p>}
    </div>
  );
}

/** Reduz a foto no próprio navegador antes de enviar (máx. 2000 px, JPEG/WebP). */
async function comprimir(arquivo: File): Promise<{ base64: string; tipo: string }> {
  if (arquivo.type === "image/svg+xml" || arquivo.type === "image/gif") {
    const buf = new Uint8Array(await arquivo.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
    return { base64: btoa(bin), tipo: arquivo.type };
  }
  const bmp = await createImageBitmap(arquivo);
  const max = 2000;
  const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(bmp.width * escala);
  cv.height = Math.round(bmp.height * escala);
  cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
  const tipo = arquivo.type === "image/png" ? "image/webp" : "image/jpeg";
  const url = cv.toDataURL(tipo, 0.85);
  return { base64: url.split(",")[1] ?? "", tipo };
}

export function CampoImagem({ rotulo, valor, onChange, dica, proporcao = "aspect-video" }: { rotulo: string; valor: string; onChange: (v: string) => void; dica?: string; proporcao?: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [link, setLink] = useState(false);

  const escolher = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Escolha um arquivo de imagem.");
    setEnviando(true);
    try {
      const { base64, tipo } = await comprimir(f);
      const r = await enviarImagem({ data: { nome: f.name, tipo, base64 } });
      onChange(r.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  };

  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-semibold text-slate-700">{rotulo}</span>
      <div
        className={cn("group relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50", proporcao, valor && "border-solid border-slate-200")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); escolher(e.dataTransfer.files[0]); }}
      >
        {valor ? (
          <>
            <img src={valor} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-900/50 opacity-0 transition-opacity group-hover:opacity-100">
              <button type="button" onClick={() => entrada.current?.click()} className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-slate-800">Trocar</button>
              <button type="button" onClick={() => onChange("")} className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-red-600">Remover</button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => entrada.current?.click()} className="flex size-full flex-col items-center justify-center gap-2 p-4 text-slate-500 hover:text-marca">
            {enviando ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            <span className="text-[13px] font-semibold">{enviando ? "Enviando…" : "Clique ou arraste uma imagem"}</span>
          </button>
        )}
        {enviando && valor && <div className="absolute inset-0 grid place-items-center bg-white/70"><Loader2 className="animate-spin text-marca" /></div>}
      </div>
      <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => escolher(e.target.files?.[0])} />
      <div className="flex items-center justify-between gap-2">
        {dica ? <p className="text-[12px] text-slate-500">{dica}</p> : <span />}
        <button type="button" onClick={() => setLink((v) => !v)} className="shrink-0 text-[12px] font-semibold text-marca hover:underline">
          {link ? "Fechar" : "Usar endereço (URL)"}
        </button>
      </div>
      {link && <input value={valor.startsWith("data:") ? "" : valor} placeholder="https://…" onChange={(e) => onChange(e.target.value)} className={estiloCampo} />}
    </div>
  );
}

/** Lista de textos curtos (horários, valores…). */
export function ListaTextos({ rotulo, valores, onChange, placeholder, dica }: { rotulo: string; valores: string[]; onChange: (v: string[]) => void; placeholder?: string; dica?: string }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-semibold text-slate-700">{rotulo}</span>
      <div className="flex flex-wrap gap-2">
        {valores.map((v, i) => (
          <span key={i} className="flex items-center rounded-xl border border-slate-300 bg-white pl-3">
            <input
              value={v}
              placeholder={placeholder}
              onChange={(e) => onChange(valores.map((x, j) => (j === i ? e.target.value : x)))}
              className="w-28 bg-transparent py-2 text-[14px] outline-none"
              style={{ width: `${Math.max(6, v.length + 2)}ch` }}
            />
            <button type="button" onClick={() => onChange(valores.filter((_, j) => j !== i))} className="px-2 text-slate-400 hover:text-red-600" aria-label="Remover"><X size={14} /></button>
          </span>
        ))}
        <button type="button" onClick={() => onChange([...valores, ""])} className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-[13px] font-semibold text-marca hover:border-marca">
          <Plus size={14} /> Adicionar
        </button>
      </div>
      {dica && <p className="text-[12px] text-slate-500">{dica}</p>}
    </div>
  );
}

/** Lista de itens editáveis: abrir/fechar, reordenar, duplicar, excluir. */
export function ListaEditavel<T extends { id: string }>({
  itens, onChange, novo, titulo, subtitulo, render, rotuloNovo = "Adicionar", vazio = "Nenhum item ainda.",
}: {
  itens: T[];
  onChange: (v: T[]) => void;
  novo: () => T;
  titulo: (item: T) => string;
  subtitulo?: (item: T) => string;
  render: (item: T, mudar: (fn: (d: T) => void) => void) => ReactNode;
  rotuloNovo?: string;
  vazio?: string;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  const mudarItem = (i: number) => (fn: (d: T) => void) => {
    const copia = structuredClone(itens);
    fn(copia[i]!);
    onChange(copia);
  };
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= itens.length) return;
    const c = [...itens];
    [c[i], c[j]] = [c[j]!, c[i]!];
    onChange(c);
  };

  return (
    <div className="grid gap-2">
      {itens.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-[13px] text-slate-500">{vazio}</p>}
      {itens.map((item, i) => {
        const ab = aberto === item.id;
        return (
          <div key={item.id} className={cn("rounded-xl border bg-white transition-shadow", ab ? "border-marca/40 shadow-md" : "border-slate-200")}>
            <div className="flex items-center gap-1 pl-4 pr-2">
              <button type="button" onClick={() => setAberto(ab ? null : item.id)} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
                <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", ab && "rotate-180")} />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-slate-800">{titulo(item) || "(sem título)"}</span>
                  {subtitulo && subtitulo(item) && <span className="block truncate text-[12px] text-slate-500">{subtitulo(item)}</span>}
                </span>
              </button>
              <BotaoIcone titulo="Subir" onClick={() => mover(i, -1)} desativado={i === 0}><ArrowUp size={15} /></BotaoIcone>
              <BotaoIcone titulo="Descer" onClick={() => mover(i, 1)} desativado={i === itens.length - 1}><ArrowDown size={15} /></BotaoIcone>
              <BotaoIcone titulo="Duplicar" onClick={() => {
                const c = structuredClone(item);
                c.id = `${item.id.split("-")[0]}-${Math.random().toString(36).slice(2, 8)}`;
                const l = [...itens];
                l.splice(i + 1, 0, c);
                onChange(l);
              }}><Copy size={15} /></BotaoIcone>
              <BotaoIcone titulo="Excluir" perigo onClick={() => {
                if (confirm(`Excluir “${titulo(item) || "item"}”?`)) onChange(itens.filter((_, j) => j !== i));
              }}><Trash2 size={15} /></BotaoIcone>
            </div>
            {ab && <div className="grid gap-4 border-t border-slate-100 p-4">{render(item, mudarItem(i))}</div>}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => { const n = novo(); onChange([...itens, n]); setAberto(n.id); }}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-[13.5px] font-semibold text-marca hover:border-marca hover:bg-marca-clara"
      >
        <Plus size={16} /> {rotuloNovo}
      </button>
    </div>
  );
}

function BotaoIcone({ children, titulo, onClick, desativado, perigo }: { children: ReactNode; titulo: string; onClick: () => void; desativado?: boolean; perigo?: boolean }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={desativado}
      onClick={onClick}
      className={cn("grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30", perigo ? "hover:text-red-600" : "hover:text-slate-700")}
    >
      {children}
    </button>
  );
}
