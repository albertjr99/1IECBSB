/** Peças compartilhadas do editor do boletim (ícones, campos de grade, arrastar). */
import { useRef, useState, type DragEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import {
  Bold, Building2, Cake, CalendarDays, ClipboardList, Church, GripVertical, Handshake, Italic, MapPinned, Megaphone, PenLine,
  RemoveFormatting, Table2, Type, type LucideIcon,
} from "lucide-react";
import { formatar } from "@/components/boletim/Editavel";
import type { TipoBloco } from "@/lib/boletim";
import { cn } from "@/lib/utils";

export const ICONE_TIPO: Record<TipoBloco, LucideIcon> = {
  artigo: PenLine,
  avisos: Megaphone,
  escala: ClipboardList,
  aniversariantes: Cake,
  oficios: Church,
  trabalhos: MapPinned,
  parcerias: Handshake,
  agenda: CalendarDays,
  expediente: Building2,
  texto: Type,
  tabela: Table2,
};

export const DESCRICAO_TIPO: Record<TipoBloco, string> = {
  artigo: "Pastoral ou artigo: título, texto corrido e assinatura, em uma ou duas colunas.",
  avisos: "Avisos com título e texto, em uma ou duas colunas.",
  escala: "Escala dos domingos, porteiros de oração e trabalhos da semana.",
  aniversariantes: "Dias e nomes dos aniversariantes do mês, com versículo.",
  oficios: "Horários fixos da igreja, lado a lado.",
  trabalhos: "Campos missionários e congregações, com endereço e contato.",
  parcerias: "Missionários e projetos apoiados, em duas colunas.",
  agenda: "Datas, horários e eventos, agrupados por mês.",
  expediente: "Endereço da igreja, pastores e diretoria.",
  texto: "Um texto livre, com ou sem caixa em volta.",
  tabela: "Tabela livre: você define as colunas e as linhas.",
};

export const inp =
  "h-9 w-full min-w-0 rounded-md border border-p-borda-forte bg-p-superficie px-2.5 text-[13.5px] text-p-texto outline-none transition placeholder:text-p-suave/70 focus:border-p-acento focus:ring-2 focus:ring-p-acento/15";

export function mover<T>(arr: T[], de: number, para: number) {
  const [x] = arr.splice(de, 1);
  arr.splice(para, 0, x as T);
}

/** Arrastar para reordenar, iniciado só pela alça (os campos continuam selecionáveis). */
export function useArrastar(aoMover: (de: number, para: number) => void) {
  const de = useRef<number | null>(null);
  const [pegou, setPegou] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);
  const fim = () => { de.current = null; setAlvo(null); setPegou(null); };
  return {
    alca: (i: number) => ({
      onMouseDown: () => setPegou(i),
      onMouseUp: () => setPegou(null),
      onTouchStart: () => setPegou(i),
    }),
    item: (i: number) => ({
      draggable: pegou === i,
      onDragStart: (e: DragEvent) => { de.current = i; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); },
      onDragOver: (e: DragEvent) => { if (de.current === null) return; e.preventDefault(); if (alvo !== i) setAlvo(i); },
      onDrop: (e: DragEvent) => { e.preventDefault(); if (de.current !== null && de.current !== i) aoMover(de.current, i); fim(); },
      onDragEnd: fim,
      "data-alvo": alvo === i && de.current !== null && de.current !== i ? (de.current < i ? "baixo" : "cima") : undefined,
    }),
  };
}

export function Alca(props: ReturnType<ReturnType<typeof useArrastar>["alca"]>) {
  return (
    <span {...props} title="Arraste para reordenar" className="grid w-6 shrink-0 cursor-grab place-items-center self-stretch rounded text-p-suave/60 hover:bg-p-hover hover:text-p-texto-2 active:cursor-grabbing">
      <GripVertical size={15} />
    </span>
  );
}

export const classeAlvo =
  "data-[alvo=baixo]:shadow-[inset_0_-2px_0_var(--p-acento)] data-[alvo=cima]:shadow-[inset_0_2px_0_var(--p-acento)]";

/** Campo de grade: Enter/↓ desce, ↑ sobe; Enter na última linha cria outra. */
export function Celula({ r, c, grade, aoNovaLinha, className, ...props }: InputHTMLAttributes<HTMLInputElement> & {
  r: number; c: number; grade: string; aoNovaLinha?: () => void;
}) {
  const focar = (rr: number) => {
    const el = document.querySelector<HTMLInputElement>(`[data-grade="${grade}"] [data-r="${rr}"][data-c="${c}"]`);
    if (el) { el.focus(); el.select(); return true; }
    return false;
  };
  return (
    <input
      {...props}
      data-r={r}
      data-c={c}
      className={cn("h-9 w-full min-w-0 bg-transparent px-2.5 text-[13.5px] text-p-texto outline-none placeholder:text-p-suave/60 focus:bg-p-realce/60 focus:shadow-[inset_0_0_0_1.5px_var(--p-acento)]", className)}
      onKeyDown={(e) => {
        props.onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "ArrowUp") { if (focar(r - 1)) e.preventDefault(); }
        else if (e.key === "ArrowDown" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          if (!focar(r + 1) && e.key === "Enter" && aoNovaLinha) { aoNovaLinha(); setTimeout(() => focar(r + 1), 30); }
        }
      }}
    />
  );
}

/** Área de texto que cresce com o conteúdo. */
export function AreaAuto({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={1}
      {...props}
      style={{ fieldSizing: "content", ...props.style } as React.CSSProperties}
      className={cn("block min-h-9 w-full min-w-0 resize-none rounded-md border border-p-borda-forte bg-p-superficie px-2.5 py-[7px] text-[13.5px] leading-snug text-p-texto outline-none transition placeholder:text-p-suave/70 focus:border-p-acento focus:ring-2 focus:ring-p-acento/15", className)}
    />
  );
}

export function Botao({ children, icone: I, onClick, perigo, primario, title, disabled, className }: {
  children?: ReactNode; icone?: LucideIcon; onClick?: () => void; perigo?: boolean; primario?: boolean; title?: string; disabled?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition disabled:pointer-events-none disabled:opacity-40",
        primario ? "bg-p-acento text-white hover:opacity-90" : perigo ? "text-red-600 hover:bg-red-500/10 dark:text-red-400" : "border border-p-borda bg-p-superficie text-p-texto-2 hover:border-p-borda-forte hover:bg-p-hover hover:text-p-texto",
        !children && "w-8 justify-center px-0",
        className,
      )}
    >
      {I && <I size={15} />}
      {children}
    </button>
  );
}

export function Adicionar({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-p-borda-forte text-[13px] font-semibold text-p-acento transition hover:border-p-acento hover:bg-p-realce">
      {children}
    </button>
  );
}

/** Negrito / itálico para o campo de texto em foco. */
export function BarraFormatacao({ children, className }: { children?: ReactNode; className?: string }) {
  const b = (icone: LucideIcon, cmd: "bold" | "italic" | "removeFormat", titulo: string) => {
    const I = icone;
    return (
      <button type="button" title={titulo} onMouseDown={(e) => { e.preventDefault(); formatar(cmd); }} className="grid size-8 place-items-center rounded-md text-p-texto-2 hover:bg-p-hover hover:text-p-texto">
        <I size={15} />
      </button>
    );
  };
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {b(Bold, "bold", "Negrito (Ctrl+B)")}
      {b(Italic, "italic", "Itálico (Ctrl+I)")}
      <span className="mx-1 h-5 w-px bg-p-borda" />
      {b(RemoveFormatting, "removeFormat", "Tirar formatação")}
      {children}
    </div>
  );
}

/** Rótulo pequeno de grupo. */
export function Legenda({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-p-suave">{children}</span>
      {acao}
    </div>
  );
}
