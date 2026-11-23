/** Boletins: um registro por boletim e um índice leve para as listas. */
import { createHmac } from "node:crypto";
import { apagar, gravar, ler } from "./armazem";
import type { Boletim, ResumoBoletim } from "@/lib/boletim";

const INDICE = "boletins:indice";
const chave = (id: string) => `boletim:${id}`;

export const resumir = (b: Boletim): ResumoBoletim => ({
  id: b.id, data: b.data, titulo: b.titulo, publicado: b.publicado,
  ...(b.publicadoEm ? { publicadoEm: b.publicadoEm } : {}),
  atualizadoEm: b.atualizadoEm, atualizadoPor: b.atualizadoPor, paginas: b.paginas.length,
});

export async function indice(): Promise<ResumoBoletim[]> {
  const l = (await ler<ResumoBoletim[]>(INDICE)) ?? [];
  return l.sort((a, b) => b.data.localeCompare(a.data));
}

export async function obter(id: string): Promise<Boletim | null> {
  return ler<Boletim>(chave(id));
}

export async function obterPorData(data: string): Promise<Boletim | null> {
  const r = (await indice()).find((x) => x.data === data && x.publicado);
  return r ? obter(r.id) : null;
}

export async function salvar(b: Boletim) {
  const l = await indice();
  if (l.some((x) => x.data === b.data && x.id !== b.id)) {
    throw new Error("Já existe um boletim com esta data. Mude a data ou abra o boletim existente.");
  }
  await gravar(chave(b.id), b);
  await gravar(INDICE, [resumir(b), ...l.filter((x) => x.id !== b.id)]);
}

export async function excluir(id: string) {
  await apagar(chave(id));
  await gravar(INDICE, (await indice()).filter((x) => x.id !== id));
}

// Link assinado para o gerador de PDF abrir um boletim ainda não publicado.
function segredo() {
  return process.env.SESSION_SECRET || process.env.DATABASE_URL || "desenvolvimento-local-iecb";
}
export function tokenImpressao(id: string, validadeMs = 5 * 60_000) {
  const exp = Date.now() + validadeMs;
  const sig = createHmac("sha256", segredo()).update(`${id}.${exp}`).digest("base64url").slice(0, 32);
  return `${exp}.${sig}`;
}
export function tokenValido(id: string, token: string | undefined) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return createHmac("sha256", segredo()).update(`${id}.${exp}`).digest("base64url").slice(0, 32) === sig;
}
