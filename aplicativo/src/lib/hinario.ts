/** Hinário oficial (Coletânea dos Salmos e Hinos), embutido no app: funciona sem internet. */
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const HINARIO = require("../dados/hinario.json") as HinoCompleto[];
export const acharHino = (n: number) => HINARIO.find((h) => h.numero === n) ?? null;

/** Como se canta: o coro volta depois de cada estrofe. */
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
export function buscarHinos(q: string) {
  const b = semAcento(q.trim());
  if (!b) return HINARIO;
  if (/^\d+$/.test(b)) return HINARIO.filter((h) => String(h.numero).startsWith(b));
  return HINARIO.filter((h) => semAcento(h.titulo).includes(b) || h.partes.some((p) => p.linhas.some((l) => semAcento(l).includes(b))));
}
