/**
 * Bíblia: índice e livros vêm do site da igreja e ficam guardados no aparelho
 * (depois da primeira leitura, funciona sem internet). Dá para baixar tudo.
 */
import { Platform } from "react-native";
import { API, chamar } from "./api";
import { gravarCache, lerCache } from "./cache";

export type Livro = { id: string; nome: string; testamento: "AT" | "NT" };
export type Versao = { id: string; nome: string; sigla: string; credito: string; capitulos: Record<string, number> };
export type LivroTexto = { capitulos: string[][]; titulos: Record<string, string> };
export type Indice = { livros: Livro[]; versoes: Versao[] };

let indiceMem: Indice | null = null;
const livrosMem = new Map<string, LivroTexto>();

async function arquivo(nome: string) {
  if (Platform.OS === "web") return null;
  const { File, Directory, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, "biblia");
  if (!dir.exists) dir.create({ intermediates: true });
  return new File(dir, nome);
}

async function lerLocal<T>(nome: string): Promise<T | null> {
  try {
    const f = await arquivo(nome);
    if (f) return f.exists ? (JSON.parse(await f.text()) as T) : null;
    return lerCache<T>(`biblia:${nome}`);
  } catch { return null; }
}
async function gravarLocal(nome: string, texto: string) {
  try {
    const f = await arquivo(nome);
    if (f) { if (f.exists) f.delete(); f.create(); f.write(texto); }
    else await gravarCache(`biblia:${nome}`, JSON.parse(texto));
  } catch { /* segue sem guardar */ }
}

export async function obterIndice(): Promise<Indice> {
  if (indiceMem) return indiceMem;
  // o índice (livros e capítulos) vem junto com o app; atualiza em segundo plano
  const local = (await lerLocal<Indice>("indice-v2.json")) ?? (require("../dados/indice-biblia.json") as Indice);
  indiceMem = local;
  fetch(`${API}/biblia/indice.json`).then(async (r) => {
    if (!r.ok) return;
    const t = await r.text();
    const novo = JSON.parse(t) as Indice;
    if (novo.versoes?.length) { indiceMem = novo; await gravarLocal("indice-v2.json", t); }
  }).catch(() => {});
  return local;
}

export async function obterLivro(versao: string, livro: string): Promise<LivroTexto> {
  const k = `${versao}/${livro}`;
  const mem = livrosMem.get(k);
  if (mem) return mem;
  const nome = `v2-${versao}-${livro}.json`;
  const local = await lerLocal<LivroTexto>(nome);
  if (local?.capitulos) { livrosMem.set(k, local); return local; }
  let l: LivroTexto;
  try { l = await chamar<LivroTexto>("biblia", { versao, livro }); }
  catch (e) { throw new Error(e instanceof Error && !/conexão/i.test(e.message) ? e.message : "Sem internet: este livro ainda não foi baixado."); }
  await gravarLocal(nome, JSON.stringify(l));
  livrosMem.set(k, l);
  return l;
}

/** Baixa a versão inteira para ler sem internet. */
export async function baixarVersao(v: Versao, progresso: (feitos: number, total: number) => void) {
  const ids = Object.keys(v.capitulos);
  let feitos = 0;
  for (let i = 0; i < ids.length; i += 6) {
    await Promise.all(ids.slice(i, i + 6).map((id) => obterLivro(v.id, id).catch(() => null).then(() => progresso(++feitos, ids.length))));
  }
}

/** "jo 3:16", "1co 13", "salmos 23" → livro e capítulo/versículo. */
const ABREV: Record<string, string> = {
  gn: "GEN", ex: "EXO", lv: "LEV", nm: "NUM", dt: "DEU", js: "JOS", jz: "JDG", rt: "RUT", "1sm": "1SA", "2sm": "2SA", "1rs": "1KI", "2rs": "2KI",
  "1cr": "1CH", "2cr": "2CH", ed: "EZR", ne: "NEH", et: "EST", "jó": "JOB", sl: "PSA", pv: "PRO", ec: "ECC", ct: "SNG", is: "ISA", jr: "JER",
  lm: "LAM", ez: "EZK", dn: "DAN", os: "HOS", jl: "JOL", am: "AMO", ob: "OBA", jn: "JON", mq: "MIC", na: "NAM", hc: "HAB", sf: "ZEP", ag: "HAG",
  zc: "ZEC", ml: "MAL", mt: "MAT", mc: "MRK", lc: "LUK", jo: "JHN", at: "ACT", rm: "ROM", "1co": "1CO", "2co": "2CO", gl: "GAL", ef: "EPH",
  fp: "PHP", cl: "COL", "1ts": "1TH", "2ts": "2TH", "1tm": "1TI", "2tm": "2TI", tt: "TIT", fm: "PHM", hb: "HEB", tg: "JAS", "1pe": "1PE",
  "2pe": "2PE", "1jo": "1JN", "2jo": "2JN", "3jo": "3JN", jd: "JUD", ap: "REV",
};
const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function interpretar(busca: string, livros: Livro[]): { livro: string; capitulo: number; versiculo?: number } | null {
  const m = busca.trim().toLowerCase().replace(/\s+/g, " ").match(/^(\d?\s?[\p{L}]+\.?)\s*(\d+)?(?:[:.,\s](\d+))?/u);
  if (!m) return null;
  const nome = m[1]!.replace(/\s|\./g, "");
  let id: string | undefined = ABREV[nome];
  if (!id) {
    const alvo = semAcento(nome);
    id = livros.find((l) => semAcento(l.nome.toLowerCase().replace(/\s/g, "")).startsWith(alvo))?.id;
  }
  if (!id) return null;
  return { livro: id, capitulo: Number(m[2] ?? 1), versiculo: m[3] ? Number(m[3]) : undefined };
}
