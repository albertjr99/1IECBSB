/**
 * Hinário da igreja: Coletânea dos Salmos e Hinos (números do S.H.).
 * Os textos ficam em src/data/hinario.json, extraídos da coletânea da igreja.
 */
import dados from "@/data/hinario.json";

export type ParteHino = { tipo: "estrofe" | "coro" | "subtitulo"; n?: number; linhas: string[] };
export type HinoCompleto = {
  numero: number;
  titulo: string;
  autor?: string;
  /** "Insp. em …", "Letra: … · Música: …" */
  credito?: string;
  /** salmo em que o hino se baseia (ex.: "Salmo 23") */
  referencia?: string;
  /** observação de canto (ex.: "Cantado para terminar o hino.") */
  nota?: string;
  partes: ParteHino[];
};

export const HINARIO = dados as HinoCompleto[];

export const acharHino = (n: number) => HINARIO.find((h) => h.numero === n) ?? null;

/** Texto corrido (compatível com versões antigas do app): estrofes separadas por linha em branco, coro com "Coro:". */
export function letraDe(h: HinoCompleto) {
  return h.partes.map((p) => (p.tipo === "coro" ? `Coro: ${p.linhas.join("\n")}` : p.tipo === "subtitulo" ? p.linhas.join(" ").toUpperCase() : p.linhas.join("\n"))).join("\n\n");
}

/** Como se canta no culto: o coro volta depois de cada estrofe. */
export function sequenciaCulto(h: HinoCompleto): ParteHino[] {
  // cada seção (I, II… ou Coro I, II…) tem o seu coro, que volta depois de cada estrofe dela
  const saida: ParteHino[] = [];
  let secao: ParteHino[] = [];
  const fechar = () => {
    const coro = secao.find((p) => p.tipo === "coro");
    const estrofes = secao.filter((p) => p.tipo === "estrofe");
    if (!coro) saida.push(...secao);
    else if (!estrofes.length) saida.push(coro);
    else estrofes.forEach((e) => saida.push(e, coro));
    secao = [];
  };
  for (const p of h.partes) {
    if (p.tipo === "subtitulo") { fechar(); continue; }
    secao.push(p);
  }
  fechar();
  return saida;
}

/** Primeira linha cantada (para listas e buscas). */
export const primeiraLinha = (h: HinoCompleto) => h.partes.find((p) => p.tipo !== "subtitulo")?.linhas[0] ?? "";

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca por número, título ou trecho da letra. */
export function buscarHinos(q: string, lista = HINARIO) {
  const b = semAcento(q.trim());
  if (!b) return lista;
  if (/^\d+$/.test(b)) return lista.filter((h) => String(h.numero).startsWith(b));
  return lista.filter((h) => semAcento(h.titulo).includes(b) || h.partes.some((p) => p.linhas.some((l) => semAcento(l).includes(b))));
}
