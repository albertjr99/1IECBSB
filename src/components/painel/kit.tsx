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
    <section className="ef-peca ef-peca-filete">
      <div className="flex items-start justify-between gap-4 border-b border-p-borda px-5 pb-4 pt-5 sm:px-6">
        <div>
          <h3 className="text-[16px] font-bold leading-tight tracking-[-0.01em] text-p-texto">{titulo}</h3>
          {descricao && <p className="mt-1 text-[13.5px] leading-relaxed text-p-suave">{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

export function Grade({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={cn("grid gap-5", cols === 2 ? "@xl:grid-cols-2 sm:grid-cols-2" : "sm:grid-cols-3")}>{children}</div>;
}

const estiloCampo = "ef-campo !h-11 !text-[15px]";
const estiloRotulo = "ef-rotulo !text-[13.5px]";
const estiloDica = "ef-dica !mt-0 !text-[12.5px]";

export function Campo({
  rotulo, valor, onChange, dica, multilinha, linhas = 4, placeholder, tipo = "text",
}: {
  rotulo: string; valor: string; onChange: (v: string) => void; dica?: string; multilinha?: boolean; linhas?: number; placeholder?: string; tipo?: string;
}) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={id} className={estiloRotulo}>{rotulo}</label>
      {multilinha ? (
        <textarea id={id} rows={linhas} value={valor} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(estiloCampo, "!h-auto resize-y py-2.5 leading-relaxed")} />
      ) : (
        <input id={id} type={tipo} value={valor} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={estiloCampo} />
      )}
      {dica && <p className={estiloDica}>{dica}</p>}
    </div>
  );
}

export function Selecao<T extends string>({ rotulo, valor, opcoes, onChange }: { rotulo: string; valor: T; opcoes: { valor: T; rotulo: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={id} className={estiloRotulo}>{rotulo}</label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value as T)} className={estiloCampo}>
        {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
    </div>
  );
}

export function Interruptor({ rotulo, valor, onChange, dica }: { rotulo: string; valor: boolean; onChange: (v: boolean) => void; dica?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 border border-p-borda bg-p-superficie px-4 py-3.5 transition hover:border-p-borda-forte">
      <span>
        <span className="block text-[14px] font-bold text-p-texto">{rotulo}</span>
        {dica && <span className="mt-0.5 block text-[12.5px] leading-relaxed text-p-suave">{dica}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={valor}
        onClick={() => onChange(!valor)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full shadow-inner transition-colors", valor ? "bg-p-acento" : "bg-p-borda-forte")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-md transition-all", valor ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

export function CampoCor({ rotulo, valor, onChange, dica }: { rotulo: string; valor: string; onChange: (v: string) => void; dica?: string }) {
  return (
    <div className="grid min-w-0 gap-2">
      <span className={estiloRotulo}>{rotulo}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={valor} onChange={(e) => onChange(e.target.value)} className="h-11 w-12 shrink-0 cursor-pointer border border-p-borda-forte bg-p-superficie p-1" />
        <input value={valor} onChange={(e) => onChange(e.target.value)} className={cn(estiloCampo, "font-mono uppercase")} />
      </div>
      {dica && <p className={estiloDica}>{dica}</p>}
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
    <div className="grid min-w-0 gap-2">
      <span className={estiloRotulo}>{rotulo}</span>
      <div
        data-imagem-campo={valor ? (valor.startsWith("data:") ? valor.slice(0, 200) : valor) : undefined}
        className={cn("group relative overflow-hidden border border-dashed border-p-borda-forte bg-p-sutil transition hover:border-p-acento", proporcao, valor && "border-solid border-p-borda shadow-sm")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); escolher(e.dataTransfer.files[0]); }}
      >
        {valor ? (
          <>
            <img src={valor} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#001d33]/55 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
              <button type="button" onClick={() => entrada.current?.click()} className="ef-btn ef-btn-branco !h-9 !px-3.5">Trocar</button>
              <button type="button" onClick={() => onChange("")} className="ef-btn ef-btn-vidro !h-9 !px-3.5">Remover</button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => entrada.current?.click()} className="flex size-full flex-col items-center justify-center gap-2 p-4 text-p-suave hover:text-p-acento">
            {enviando ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            <span className="text-[13.5px] font-semibold">{enviando ? "Enviando…" : "Clique aqui ou arraste uma foto"}</span>
          </button>
        )}
        {enviando && valor && <div className="absolute inset-0 grid place-items-center bg-p-superficie/70"><Loader2 className="animate-spin text-p-acento" /></div>}
      </div>
      <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => escolher(e.target.files?.[0])} />
      <div className="flex items-center justify-between gap-2">
        {dica ? <p className={estiloDica}>{dica}</p> : <span />}
        <button type="button" onClick={() => setLink((v) => !v)} className="shrink-0 text-[12px] font-semibold text-p-acento hover:underline">
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
    <div className="grid min-w-0 gap-2">
      <span className={estiloRotulo}>{rotulo}</span>
      <div className="flex flex-wrap gap-2">
        {valores.map((v, i) => (
          <span key={i} className="flex h-11 items-center border border-p-borda-forte bg-p-superficie pl-3 shadow-[inset_0_1px_2px_rgba(0,42,71,0.05)]">
            <input
              value={v}
              placeholder={placeholder}
              onChange={(e) => onChange(valores.map((x, j) => (j === i ? e.target.value : x)))}
              className="w-28 bg-transparent text-[15px] text-p-texto outline-none"
              style={{ width: `${Math.max(6, v.length + 2)}ch` }}
            />
            <button type="button" onClick={() => onChange(valores.filter((_, j) => j !== i))} className="px-2 text-p-suave hover:text-red-600 dark:text-red-400" aria-label="Remover"><X size={14} /></button>
          </span>
        ))}
        <button type="button" onClick={() => onChange([...valores, ""])} className="ef-adicionar !h-11 !w-auto px-4">
          <Plus size={15} /> Adicionar
        </button>
      </div>
      {dica && <p className={estiloDica}>{dica}</p>}
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
    <div className="grid min-w-0 gap-2">
      {itens.length === 0 && <p className="border border-dashed border-p-borda-forte px-4 py-7 text-center text-[14px] text-p-suave">{vazio}</p>}
      {itens.map((item, i) => {
        const ab = aberto === item.id;
        return (
          <div key={item.id} className={cn("border bg-p-superficie transition", ab ? "border-p-acento shadow-[0_14px_30px_-20px_rgba(0,42,71,0.5)]" : "border-p-borda hover:border-p-borda-forte")} style={ab ? { borderTopWidth: 3 } : undefined}>
            <div className="flex items-center gap-0.5 pl-3 pr-1.5">
              <button type="button" onClick={() => setAberto(ab ? null : item.id)} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
                <span className="ef-num w-6 shrink-0 text-[12px] font-bold text-p-acento">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-p-texto">{titulo(item) || "(sem título)"}</span>
                  {subtitulo && subtitulo(item) && <span className="block truncate text-[12.5px] text-p-suave">{subtitulo(item)}</span>}
                </span>
                <span className={cn("hidden shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] sm:inline-flex", ab ? "text-p-acento" : "text-p-suave")}>{ab ? "Fechar" : "Editar"} <ChevronDown size={14} className={cn("transition-transform", ab && "rotate-180")} /></span>
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
            {ab && <div className="grid grid-cols-[minmax(0,1fr)] gap-5 border-t border-p-borda bg-[color-mix(in_srgb,var(--p-sutil)_60%,transparent)] p-4 sm:p-5">{render(item, mudarItem(i))}</div>}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => { const n = novo(); onChange([...itens, n]); setAberto(n.id); }}
        className="ef-adicionar"
      >
        <Plus size={17} strokeWidth={2.4} /> {rotuloNovo}
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
      className={cn("grid size-8 place-items-center text-p-suave transition hover:bg-p-hover disabled:opacity-30", perigo ? "hover:text-red-600 dark:hover:text-red-400" : "hover:text-p-texto")}
    >
      {children}
    </button>
  );
}

/** Páginas do site, pelo nome que o visitante conhece. */
export const PAGINAS_SITE: { valor: string; rotulo: string }[] = [
  { valor: "/", rotulo: "Página inicial" },
  { valor: "/sobre", rotulo: "A Igreja" },
  { valor: "/lideranca", rotulo: "Liderança" },
  { valor: "/ministerios", rotulo: "Ministérios" },
  { valor: "/programacao", rotulo: "Programação e eventos" },
  { valor: "/mensagens", rotulo: "Mensagens (vídeos)" },
  { valor: "/ao-vivo", rotulo: "Culto ao vivo" },
  { valor: "/boletins", rotulo: "Boletins" },
  { valor: "/contribua", rotulo: "Contribua (dízimos e ofertas)" },
  { valor: "/contato", rotulo: "Contato e localização" },
];

/**
 * Para onde um botão leva — sem a pessoa precisar saber "caminhos" (/contato):
 * escolhe a página do site pelo nome, ou cola o endereço de outro site.
 */
export function CampoDestino({ rotulo, valor, onChange, dica, permiteVazio }: { rotulo: string; valor: string; onChange: (v: string) => void; dica?: string; permiteVazio?: boolean }) {
  const id = useId();
  const pagina = PAGINAS_SITE.find((p) => p.valor === valor);
  const [externo, setExterno] = useState(!pagina && !!valor);
  const escolha = !valor && !externo ? "" : pagina && !externo ? valor : "__externo";
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={id} className={estiloRotulo}>{rotulo}</label>
      <select
        id={id}
        value={escolha}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__externo") { setExterno(true); if (pagina) onChange(""); return; }
          setExterno(false);
          onChange(v);
        }}
        className={estiloCampo}
      >
        {(permiteVazio || !valor) && <option value="">{permiteVazio ? "Sem botão" : "Escolha…"}</option>}
        <optgroup label="Páginas do site">
          {PAGINAS_SITE.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </optgroup>
        <optgroup label="Fora do site">
          <option value="__externo">Outro site (inscrição, formulário, WhatsApp…)</option>
        </optgroup>
      </select>
      {escolha === "__externo" && (
        <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder="Cole aqui o endereço, ex.: https://forms.gle/…" className={estiloCampo} aria-label="Endereço do outro site" />
      )}
      {dica && <p className={estiloDica}>{dica}</p>}
    </div>
  );
}
