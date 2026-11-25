/** Peças do app web para as escalas (cabeçalho, selos, folha de baixo). */
import type { ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, CircleDashed, X, XCircle } from "lucide-react";
import type { Resposta } from "@/lib/escalas";
import { cn } from "@/lib/utils";

export function Cabecalho({ titulo, direita }: { titulo: string; direita?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-[var(--a-borda)] bg-[color-mix(in_srgb,var(--a-sup)_90%,transparent)] px-2 pb-2 pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur-xl">
      <button onClick={() => router.history.back()} className="flex items-center gap-1 px-2 py-2 text-[14px] font-semibold text-[var(--a-azul)]"><ChevronLeft size={19} /> Voltar</button>
      <span className="min-w-0 flex-1 truncate text-center text-[14px] font-bold">{titulo}</span>
      <div className="flex min-w-[72px] justify-end">{direita}</div>
    </header>
  );
}

export function Selo({ r, pequeno }: { r: Resposta; pequeno?: boolean }) {
  const I = r === "confirmado" ? CheckCircle2 : r === "recusado" ? XCircle : CircleDashed;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 font-bold uppercase tracking-[0.1em]", pequeno ? "text-[10px]" : "text-[10.5px]", r === "confirmado" ? "text-[var(--a-azul)]" : r === "recusado" ? "text-[var(--a-vermelho)]" : "text-[var(--a-suave)]")}>
      <I size={pequeno ? 13 : 14} /> {r === "confirmado" ? "Confirmado" : r === "recusado" ? "Não poderá" : "Aguardando"}
    </span>
  );
}

/** Folha que sobe de baixo (formulários rápidos). */
export function Folha({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  return (
    <>
      <div className="a-veu" onClick={aoFechar} />
      <div className="a-folha" role="dialog" aria-label={titulo}>
        <div className="flex items-center justify-between border-b border-[var(--a-borda)] px-5 py-3.5">
          <p className="text-[16px] font-bold">{titulo}</p>
          <button onClick={aoFechar} className="grid size-9 place-items-center text-[var(--a-suave)]" aria-label="Fechar"><X size={19} /></button>
        </div>
        <div className="grid gap-4 p-5">{children}</div>
      </div>
    </>
  );
}

export const Rotulo = ({ children }: { children: ReactNode }) => <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--a-suave)]">{children}</span>;

/** "Hoje", "Amanhã", "em 5 dias". */
export function falta(iso: string) {
  const dia = (t: number) => new Date(t - 3 * 3600e3).toISOString().slice(0, 10);
  const hoje = dia(Date.now());
  const d = dia(new Date(iso).getTime());
  const n = Math.round((new Date(`${d}T12:00:00Z`).getTime() - new Date(`${hoje}T12:00:00Z`).getTime()) / 864e5);
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  if (n < 0) return n === -1 ? "Ontem" : `Há ${-n} dias`;
  return `Em ${n} dias`;
}

/** Compartilha (celular) ou copia o texto; com opção de WhatsApp. */
export async function compartilharTexto(texto: string) {
  if (navigator.share) {
    try { await navigator.share({ text: texto }); return "ok"; } catch { return "cancelado"; }
  }
  await navigator.clipboard?.writeText(texto);
  return "copiado";
}
