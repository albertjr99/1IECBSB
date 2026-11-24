/** Boletins: um registro por boletim e um índice leve para as listas. */
import { createHmac } from "node:crypto";
import { apagar, gravar, ler, urlDoBanco } from "./armazem";
import type { Boletim, ResumoBoletim } from "@/lib/boletim";

const INDICE = "boletins:indice";
const chave = (id: string) => `boletim:${id}`;

export const resumir = (b: Boletim): ResumoBoletim => ({
  id: b.id, data: b.data, titulo: b.titulo, publicado: b.publicado,
  ...(b.publicadoEm ? { publicadoEm: b.publicadoEm } : {}),
  atualizadoEm: b.atualizadoEm, atualizadoPor: b.atualizadoPor, paginas: b.paginas.length,
});

export async function indice(): Promise<ResumoBoletim[]> {
  const l = await semear((await ler<ResumoBoletim[]>(INDICE)) ?? []);
  return l.sort((a, b) => b.data.localeCompare(a.data));
}

/**
 * Na primeira leitura, coloca no sistema os boletins de novembro/2026 já no
 * modelo novo (publicados). Cada data entra uma vez só: se a igreja apagar ou
 * já tiver um boletim naquela data, nada é sobrescrito.
 */
const SEMENTES = "boletins:sementes:v2";
let semeado: Promise<ResumoBoletim[]> | null = null;
let pronto = false;
async function semear(l: ResumoBoletim[]): Promise<ResumoBoletim[]> {
  if (pronto) return l;
  semeado ??= (async () => {
    const feitos = new Set((await ler<string[]>(SEMENTES)) ?? []);
    const { boletinsNovembro } = await import("@/lib/boletins-novembro");
    const novos = boletinsNovembro().filter((b) => !feitos.has(b.data));
    if (!novos.length) return l;
    let lista = l;
    for (const b of novos) {
      feitos.add(b.data);
      const existente = lista.find((x) => x.data === b.data);
      // só substitui a carga anterior se ninguém a editou depois
      const intocado = existente && existente.atualizadoPor === "Secretaria" && existente.atualizadoEm === existente.publicadoEm;
      if (existente && !intocado) continue;
      if (existente) b.id = existente.id;
      await gravar(chave(b.id), b);
      lista = [resumir(b), ...lista.filter((x) => x.id !== b.id)];
    }
    await gravar(INDICE, lista);
    await gravar(SEMENTES, [...feitos]);
    return lista;
  })();
  try {
    const r = await semeado;
    pronto = true;
    return r;
  } catch {
    semeado = null;
    return l;
  }
}

export async function obter(id: string): Promise<Boletim | null> {
  const b = await ler<Boletim>(chave(id));
  // o Pr. Jefferson não faz mais parte do pastorado (nov/2026): sai do expediente
  if (b) for (const p of b.paginas) for (const x of p.blocos) {
    if (x.tipo === "expediente") x.pastores = x.pastores.split("\n").filter((l) => !/Jefferson Pontes/i.test(l)).join("\n");
  }
  return b;
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
  return process.env.SESSION_SECRET || urlDoBanco() || "desenvolvimento-local-iecb";
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
