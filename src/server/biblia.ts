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
