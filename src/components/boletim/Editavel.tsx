/**
 * Campo de texto editável no lugar — usado para escrever direto na folha do
 * boletim (e nas janelas de edição). Guarda o texto na marcação do boletim.
 */
import { createContext, useLayoutEffect, useRef, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from "react";
import type { Bloco, Boletim } from "@/lib/boletim";
import { escapar, htmlParaMarcado, marcadoParaEdicao, type ModoTexto } from "./marcacao";

/** Presente só no editor do painel: liga a edição direta nas folhas. */
export type Edicao = {
  mudar: (blocoId: string, fn: (b: Bloco) => void) => void;
  adicionar?: (paginaId: string) => void;
  /** campos do boletim todo (versículo da capa) */
  mudarBoletim?: (fn: (b: Boletim) => void) => void;
};
export const EdicaoCtx = createContext<Edicao | null>(null);

/** Vai para o campo editável anterior/seguinte (Tab, Enter numa linha). */
export function irParaCampo(atual: HTMLElement, passo: 1 | -1) {
  const raiz = atual.closest(".bol-folhas, [data-campos]") ?? document.body;
  const todos = Array.from(raiz.querySelectorAll<HTMLElement>(".bol-ed"));
  const i = todos.indexOf(atual);
  const alvo = todos[i + passo];
  if (!alvo) return false;
  alvo.focus();
  const sel = window.getSelection();
  if (sel) {
    const r = document.createRange();
    r.selectNodeContents(alvo);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  return true;
}

export function Editavel({ valor, aoMudar, modo = "linha", como: Tag = "span", dica, className, style }: {
  valor: string;
  aoMudar: (v: string) => void;
  modo?: ModoTexto;
  como?: "span" | "div";
  dica?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const atual = useRef<string | null>(null);

  const marcarVazio = (el: HTMLElement) => {
    if ((el.textContent ?? "").trim()) el.removeAttribute("data-vazio");
    else el.setAttribute("data-vazio", "");
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || valor === atual.current) return;
    el.innerHTML = marcadoParaEdicao(valor, modo);
    atual.current = valor;
    marcarVazio(el);
  }, [valor, modo]);

  const emitir = () => {
    const el = ref.current;
    if (!el) return;
    const v = htmlParaMarcado(el, modo);
    marcarVazio(el);
    if (v === atual.current) return;
    atual.current = v;
    aoMudar(v);
  };

  const teclar = (e: KeyboardEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (e.key === "Escape") { el.blur(); return; }
    if (e.key === "Tab") {
      if (irParaCampo(el, e.shiftKey ? -1 : 1)) e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      if (modo === "linha") { e.preventDefault(); irParaCampo(el, 1); return; }
      if (modo === "linhas" || e.shiftKey) { e.preventDefault(); document.execCommand("insertLineBreak"); }
    }
  };

  const colar = (e: ClipboardEvent<HTMLElement>) => {
    e.preventDefault();
    const t = e.clipboardData.getData("text/plain").replace(/\r/g, "");
    if (!t) return;
    if (modo === "linha") { document.execCommand("insertText", false, t.replace(/\s*\n\s*/g, " ")); return; }
    if (modo === "linhas" || !t.includes("\n")) {
      document.execCommand("insertHTML", false, escapar(t).replace(/\n/g, "<br>"));
      return;
    }
    // vários parágrafos (do Word, do WhatsApp…): cada linha vira um parágrafo
    const ps = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    document.execCommand("insertHTML", false, ps.map((p) => `<p>${escapar(p)}</p>`).join(""));
  };

  return (
    <Tag
      ref={ref as never}
      className={`bol-ed ${className ?? ""}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-dica={dica}
      data-modo={modo}
      onFocus={() => {
        document.execCommand("defaultParagraphSeparator", false, "p");
        document.execCommand("styleWithCSS", false, "false");
      }}
      onInput={emitir}
      onBlur={emitir}
      onKeyDown={teclar}
      onPaste={colar}
      onDrop={(e) => e.preventDefault()}
    />
  );
}

/** Aplica negrito/itálico ao texto selecionado (botões das barras de formatação). */
export function formatar(cmd: "bold" | "italic" | "removeFormat") {
  document.execCommand(cmd);
  const el = document.activeElement as HTMLElement | null;
  el?.dispatchEvent(new Event("input", { bubbles: true }));
}
