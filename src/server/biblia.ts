/**
 * Textos da Bíblia (ARA e NVI) guardados no banco da igreja, fora do repositório
 * público. Só membros logados recebem o texto (pelo app). O índice (livros e
 * quantidade de capítulos) continua público em /biblia/indice.json.
 */
import { ler, gravar } from "./armazem";

export const VERSOES_BIBLIA = ["ara", "nvi"] as const;
export type VersaoBiblia = (typeof VERSOES_BIBLIA)[number];
export type LivroBiblia = { capitulos: string[][]; titulos: Record<string, string> };

const chave = (v: string, l: string) => `biblia:${v}:${l}`;

export async function lerLivroBiblia(versao: string, livro: string) {
  if (!(VERSOES_BIBLIA as readonly string[]).includes(versao) || !/^[1-3A-Z]{3}$/.test(livro)) return null;
  return ler<LivroBiblia>(chave(versao, livro));
}

export async function gravarLivroBiblia(versao: VersaoBiblia, livro: string, dados: LivroBiblia) {
  await gravar(chave(versao, livro), dados);
  const st = (await ler<Record<string, string[]>>("biblia:importados")) ?? {};
  st[versao] = [...new Set([...(st[versao] ?? []), livro])];
  await gravar("biblia:importados", st);
}

export async function situacaoBiblia() {
  return (await ler<Record<string, string[]>>("biblia:importados")) ?? {};
}

// ─── Busca por palavras ─────────────────────────────────────────────────────
const ORDEM = ["GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL","MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN","3JN","JUD","REV"];
const memoria = new Map<string, LivroBiblia | null>();
const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type Achado = { livro: string; capitulo: number; versiculo: number; texto: string };

/** Versículos que contêm todas as palavras (sem diferenciar acentos). Até `limite` resultados. */
export async function buscarNaBiblia(versao: string, termo: string, testamento?: "AT" | "NT", limite = 120) {
  const palavras = normal(termo).split(/\s+/).filter((p) => p.length >= 2);
  if (!palavras.length) return { total: 0, achados: [] as Achado[] };
  // cada palavra precisa começar uma palavra do versículo ("bom" não acha "abominação")
  const testes = palavras.map((p) => new RegExp(`(^|[^a-z0-9])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  const livros = testamento === "AT" ? ORDEM.slice(0, 39) : testamento === "NT" ? ORDEM.slice(39) : ORDEM;
  await Promise.all(livros.map(async (l) => {
    const k = `${versao}:${l}`;
    if (!memoria.has(k)) memoria.set(k, await lerLivroBiblia(versao, l));
  }));
  const achados: Achado[] = [];
  let total = 0;
  for (const l of livros) {
    const d = memoria.get(`${versao}:${l}`);
    d?.capitulos.forEach((cap, ci) => cap.forEach((v, vi) => {
      const n = normal(v);
      if (testes.every((r) => r.test(n))) { total++; if (achados.length < limite) achados.push({ livro: l, capitulo: ci + 1, versiculo: vi + 1, texto: v }); }
    }));
  }
  return { total, achados };
}
