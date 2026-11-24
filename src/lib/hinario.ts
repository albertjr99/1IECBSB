/**
 * Hinário da igreja: Coletânea dos Salmos e Hinos (números do S.H.).
 * Os textos ficam em src/data/hinario.json, extraídos da coletânea da igreja.
 */
import dados from "@/data/hinario.json";

export type ParteHino = { tipo: "estrofe" | "coro"; n?: number; linhas: string[] };
export type HinoCompleto = { numero: number; titulo: string; autor?: string; partes: ParteHino[] };

export const HINARIO = dados as HinoCompleto[];

export const acharHino = (n: number) => HINARIO.find((h) => h.numero === n) ?? null;

/** Texto corrido (compatível com versões antigas do app): estrofes separadas por linha em branco, coro com "Coro:". */
export function letraDe(h: HinoCompleto) {
  return h.partes.map((p) => (p.tipo === "coro" ? `Coro: ${p.linhas.join("\n")}` : p.linhas.join("\n"))).join("\n\n");
}

/** Como se canta no culto: o coro volta depois de cada estrofe. */
export function sequenciaCulto(h: HinoCompleto): ParteHino[] {
  const coro = h.partes.find((p) => p.tipo === "coro");
  const estrofes = h.partes.filter((p) => p.tipo === "estrofe");
  if (!coro) return h.partes;
  return estrofes.flatMap((e) => [e, coro]);
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca por número, título ou trecho da letra. */
export function buscarHinos(q: string, lista = HINARIO) {
  const b = semAcento(q.trim());
  if (!b) return lista;
  if (/^\d+$/.test(b)) return lista.filter((h) => String(h.numero).startsWith(b));
  return lista.filter((h) => semAcento(h.titulo).includes(b) || h.partes.some((p) => p.linhas.some((l) => semAcento(l).includes(b))));
}
