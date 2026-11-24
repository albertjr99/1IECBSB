/**
 * Bíblia no app web: índice público; textos (ARA/NVI) pelo servidor, só para
 * membros, guardados no aparelho (Cache Storage) para abrir rápido e sem internet.
 */
import { appBiblia } from "./api-biblia";

export type LivroInfo = { id: string; nome: string; testamento: "AT" | "NT" };
export type VersaoInfo = { id: string; nome: string; sigla: string; credito: string; capitulos: Record<string, number> };
export type Indice = { livros: LivroInfo[]; versoes: VersaoInfo[] };
export type LivroTexto = { capitulos: string[][]; titulos: Record<string, string> };

let indice: Promise<Indice> | null = null;
export const carregarIndice = () => (indice ??= fetch("/biblia/indice.json").then((r) => r.json()));

const mem = new Map<string, Promise<LivroTexto>>();
const CACHE = "iecb-biblia-v2";

export function carregarLivro(versao: string, livro: string): Promise<LivroTexto> {
  const k = `${versao}/${livro}`;
  if (!mem.has(k)) {
    const p = (async () => {
      const url = `/__biblia/${k}`;
      try {
        const c = await caches.open(CACHE);
        const r = await c.match(url);
        if (r) return (await r.json()) as LivroTexto;
        const l = await appBiblia({ data: { versao, livro } });
        c.put(url, new Response(JSON.stringify(l), { headers: { "content-type": "application/json" } })).catch(() => {});
        return l;
      } catch (e) {
        if (typeof caches === "undefined") return appBiblia({ data: { versao, livro } });
        throw e;
      }
    })();
    p.catch(() => mem.delete(k));
    mem.set(k, p);
  }
  return mem.get(k)!;
}

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "");

/** Abreviações usuais em português (o acento distingue Jó de Jo/João). */
const ABREV: Record<string, string> = {
  gn: "GEN", ex: "EXO", lv: "LEV", nm: "NUM", dt: "DEU", js: "JOS", jz: "JDG", rt: "RUT", "1sm": "1SA", "2sm": "2SA", "1rs": "1KI", "2rs": "2KI", "1cr": "1CH", "2cr": "2CH",
  ed: "EZR", ne: "NEH", et: "EST", "jó": "JOB", sl: "PSA", pv: "PRO", ec: "ECC", ct: "SNG", is: "ISA", jr: "JER", lm: "LAM", ez: "EZK", dn: "DAN", os: "HOS", jl: "JOL",
  am: "AMO", ob: "OBA", jn: "JON", mq: "MIC", na: "NAM", hc: "HAB", sf: "ZEP", ag: "HAG", zc: "ZEC", ml: "MAL", mt: "MAT", mc: "MRK", lc: "LUK", jo: "JHN", joao: "JHN",
  at: "ACT", rm: "ROM", "1co": "1CO", "2co": "2CO", gl: "GAL", ef: "EPH", fp: "PHP", fl: "PHP", cl: "COL", "1ts": "1TH", "2ts": "2TH", "1tm": "1TI", "2tm": "2TI", tt: "TIT",
  fm: "PHM", hb: "HEB", tg: "JAS", "1pe": "1PE", "2pe": "2PE", "1jo": "1JN", "2jo": "2JN", "3jo": "3JN", jd: "JUD", ap: "REV",
};

/** "Jo 3:16", "joão 3", "1 co 13 4", "Salmos 23" → livro, capítulo, versículo. */
export function lerReferencia(t: string, livros: LivroInfo[]) {
  const m = /^\s*(\d?\s*[^\d\s:.,]+(?:\s+[^\d\s:.,]+)?)\s*(\d+)?(?:\s*[:.,\s]\s*(\d+))?\s*$/.exec(t);
  if (!m) return null;
  const bruto = m[1]!.toLowerCase().replace(/\s+/g, "");
  const q = norm(m[1]!);
  const id =
    livros.find((l) => l.nome.toLowerCase().replace(/\s+/g, "") === bruto)?.id ??
    ABREV[bruto] ?? ABREV[q] ??
    livros.find((l) => norm(l.nome) === q)?.id ??
    livros.find((l) => norm(l.nome).startsWith(q))?.id;
  if (!id) return null;
  return { livro: id, capitulo: m[2] ? Number(m[2]) : 1, verso: m[3] ? Number(m[3]) : undefined };
}

export const filtroLivro = (q: string) => { const n = norm(q); return (l: LivroInfo) => !n || norm(l.nome).includes(n) || norm(l.id) === n; };
