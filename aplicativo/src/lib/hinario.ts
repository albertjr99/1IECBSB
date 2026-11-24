/** Hinário oficial (Coletânea dos Salmos e Hinos), embutido no app: funciona sem internet. */
export type ParteHino = { tipo: "estrofe" | "coro"; n?: number; linhas: string[] };
export type HinoCompleto = { numero: number; titulo: string; autor?: string; partes: ParteHino[] };

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const HINARIO = require("../dados/hinario.json") as HinoCompleto[];
export const acharHino = (n: number) => HINARIO.find((h) => h.numero === n) ?? null;

/** Como se canta: o coro volta depois de cada estrofe. */
export function sequenciaCulto(h: HinoCompleto): ParteHino[] {
  const coro = h.partes.find((p) => p.tipo === "coro");
  if (!coro) return h.partes;
  return h.partes.filter((p) => p.tipo === "estrofe").flatMap((e) => [e, coro]);
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function buscarHinos(q: string) {
  const b = semAcento(q.trim());
  if (!b) return HINARIO;
  if (/^\d+$/.test(b)) return HINARIO.filter((h) => String(h.numero).startsWith(b));
  return HINARIO.filter((h) => semAcento(h.titulo).includes(b) || h.partes.some((p) => p.linhas.some((l) => semAcento(l).includes(b))));
}
