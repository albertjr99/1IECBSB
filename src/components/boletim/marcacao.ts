/**
 * Marcação dos textos do boletim: **negrito**, *itálico*, ***ambos***;
 * quebra de linha simples dentro do parágrafo; linha em branco separa parágrafos.
 */

export const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Texto marcado → HTML (quebras viram <br>). */
export function marcadoHtml(texto: string) {
  return escapar(espacosComuns(texto))
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

export const paragrafos = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** Envolve com a marca, deixando os espaços das pontas do lado de fora. */
function envolver(s: string, marca: string) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
  if (!m || !m[2]) return s;
  return `${m[1]}${marca}${m[2]}${marca}${m[3]}`;
}

const SEP = "\u0000";

function inline(n: Node): string {
  if (n.nodeType === 3) return (n.textContent ?? "").replace(/ /g, " ");
  if (n.nodeType !== 1) return "";
  const e = n as HTMLElement;
  const tag = e.tagName;
  if (tag === "BR") return "\n";
  let s = Array.from(e.childNodes).map(inline).join("");
  const negrito = tag === "B" || tag === "STRONG" || /^(bold|[6-9]00)$/.test(e.style?.fontWeight ?? "");
  const italico = tag === "I" || tag === "EM" || e.style?.fontStyle === "italic";
  if (italico) s = envolver(s, "*");
  if (negrito) s = envolver(s, "**");
  if (tag === "P" || tag === "DIV" || tag === "LI") s = SEP + s + SEP;
  return s;
}

export type ModoTexto = "linha" | "linhas" | "paragrafos";

/** HTML de um campo editável → texto marcado. */
/** Espaços "que não quebram" (colados do Word/WhatsApp) → espaço comum, para a linha virar na margem. */
export const espacosComuns = (t: string) => t.replace(/[\u00A0\u2007\u202F\u2060\uFEFF]/g, (c) => (c === "\u2060" || c === "\uFEFF" ? "" : " "));

export function htmlParaMarcado(el: HTMLElement, modo: ModoTexto): string {
  const bruto = espacosComuns(Array.from(el.childNodes).map(inline).join(""));
  if (modo === "paragrafos") {
    return bruto
      .split(new RegExp(`${SEP}+`))
      .flatMap((p) => p.split(/\n\s*\n/))
      .map((p) => p.replace(/\n$/, "").replace(/^\n/, ""))
      .filter((p) => p.trim())
      .join("\n\n");
  }
  if (modo === "linhas") {
    return bruto.replace(new RegExp(`${SEP}+`, "g"), "\n").replace(/^\n+/, "").replace(/\n$/, "");
  }
  return bruto.replace(new RegExp(`[${SEP}\n]+`, "g"), " ");
}

/** Texto marcado → HTML do campo editável. */
export function marcadoParaEdicao(valor: string, modo: ModoTexto) {
  if (modo === "paragrafos") {
    const ps = paragrafos(valor);
    return ps.length ? ps.map((p) => `<p>${marcadoHtml(p)}</p>`).join("") : "<p><br></p>";
  }
  return marcadoHtml(valor);
}

export const textoPuro = (t: string) => t.replace(/\*+/g, "");
export const contarPalavras = (t: string) => textoPuro(t).split(/\s+/).filter(Boolean).length;
