/**
 * Armazenamento do servidor.
 *
 * Em produção usa o Postgres do Neon (variável DATABASE_URL, criada sozinha ao
 * ligar o Neon pelo painel da Vercel). As tabelas são criadas na primeira
 * gravação — não há migração para rodar.
 *
 * Sem DATABASE_URL (desenvolvimento local), grava em arquivos JSON na pasta
 * .dados-locais. Na Vercel sem banco, cai para a memória do servidor e avisa:
 * o site funciona, mas o que for editado se perde.
 */
import { neon } from "@neondatabase/serverless";
import { promises as fs } from "node:fs";
import path from "node:path";

type Sql = ReturnType<typeof neon>;

let sqlCache: Sql | null = null;
let tabelasProntas: Promise<void> | null = null;

function sql(): Sql | null {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  if (!sqlCache) sqlCache = neon(url);
  return sqlCache;
}

async function prepararTabelas(db: Sql) {
  if (!tabelasProntas) {
    tabelasProntas = (async () => {
      await db`CREATE TABLE IF NOT EXISTS site_kv (
        chave TEXT PRIMARY KEY,
        valor JSONB NOT NULL,
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await db`CREATE TABLE IF NOT EXISTS site_versoes (
        id SERIAL PRIMARY KEY,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
        autor TEXT NOT NULL,
        resumo TEXT NOT NULL,
        conteudo JSONB NOT NULL
      )`;
      await db`CREATE TABLE IF NOT EXISTS site_auditoria (
        id SERIAL PRIMARY KEY,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
        autor TEXT NOT NULL,
        acao TEXT NOT NULL,
        detalhe TEXT NOT NULL DEFAULT ''
      )`;
    })().catch((e) => {
      tabelasProntas = null;
      throw e;
    });
  }
  return tabelasProntas;
}

// ─── Modo local (arquivos / memória) ────────────────────────────────────────

const memoria = new Map<string, unknown>();
const pastaLocal = path.resolve(process.cwd(), ".dados-locais");
const naVercel = !!process.env.VERCEL;

export function modoArmazenamento(): "banco" | "arquivo" | "memoria" {
  if (sql()) return "banco";
  return naVercel ? "memoria" : "arquivo";
}

async function lerLocal<T>(chave: string): Promise<T | null> {
  if (memoria.has(chave)) return memoria.get(chave) as T;
  if (naVercel) return null;
  try {
    const txt = await fs.readFile(path.join(pastaLocal, `${chave.replace(/[^a-z0-9_-]/gi, "_")}.json`), "utf8");
    const v = JSON.parse(txt) as T;
    memoria.set(chave, v);
    return v;
  } catch {
    return null;
  }
}

async function gravarLocal(chave: string, valor: unknown) {
  memoria.set(chave, valor);
  if (naVercel) return;
  await fs.mkdir(pastaLocal, { recursive: true });
  await fs.writeFile(
    path.join(pastaLocal, `${chave.replace(/[^a-z0-9_-]/gi, "_")}.json`),
    JSON.stringify(valor, null, 2),
  );
}

// ─── API ────────────────────────────────────────────────────────────────────

export async function ler<T>(chave: string): Promise<T | null> {
  const db = sql();
  if (!db) return lerLocal<T>(chave);
  await prepararTabelas(db);
  const linhas = (await db`SELECT valor FROM site_kv WHERE chave = ${chave}`) as { valor: T }[];
  return linhas[0]?.valor ?? null;
}

export async function gravar(chave: string, valor: unknown) {
  const db = sql();
  if (!db) return gravarLocal(chave, valor);
  await prepararTabelas(db);
  await db`INSERT INTO site_kv (chave, valor, atualizado_em)
           VALUES (${chave}, ${JSON.stringify(valor)}::jsonb, now())
           ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now()`;
}

export async function apagar(chave: string) {
  const db = sql();
  if (!db) {
    memoria.delete(chave);
    if (!naVercel) await fs.rm(path.join(pastaLocal, `${chave.replace(/[^a-z0-9_-]/gi, "_")}.json`), { force: true });
    return;
  }
  await prepararTabelas(db);
  await db`DELETE FROM site_kv WHERE chave = ${chave}`;
}

export type Versao = { id: number; criadoEm: string; autor: string; resumo: string };
type VersaoLocal = Versao & { conteudo: unknown };

const MAX_VERSOES = 30;

export async function criarVersao(autor: string, resumo: string, conteudo: unknown) {
  const db = sql();
  if (!db) {
    const lista = (await lerLocal<VersaoLocal[]>("versoes")) ?? [];
    const id = (lista[0]?.id ?? 0) + 1;
    lista.unshift({ id, criadoEm: new Date().toISOString(), autor, resumo, conteudo });
    await gravarLocal("versoes", lista.slice(0, MAX_VERSOES));
    return;
  }
  await prepararTabelas(db);
  await db`INSERT INTO site_versoes (autor, resumo, conteudo) VALUES (${autor}, ${resumo}, ${JSON.stringify(conteudo)}::jsonb)`;
  await db`DELETE FROM site_versoes WHERE id NOT IN (SELECT id FROM site_versoes ORDER BY id DESC LIMIT ${MAX_VERSOES})`;
}

export async function listarVersoes(): Promise<Versao[]> {
  const db = sql();
  if (!db) {
    const lista = (await lerLocal<VersaoLocal[]>("versoes")) ?? [];
    return lista.map(({ conteudo: _c, ...v }) => v);
  }
  await prepararTabelas(db);
  const linhas = (await db`SELECT id, criado_em, autor, resumo FROM site_versoes ORDER BY id DESC`) as {
    id: number; criado_em: string | Date; autor: string; resumo: string;
  }[];
  return linhas.map((l) => ({ id: l.id, criadoEm: new Date(l.criado_em).toISOString(), autor: l.autor, resumo: l.resumo }));
}

export async function lerVersao(id: number): Promise<unknown | null> {
  const db = sql();
  if (!db) {
    const lista = (await lerLocal<VersaoLocal[]>("versoes")) ?? [];
    return lista.find((v) => v.id === id)?.conteudo ?? null;
  }
  await prepararTabelas(db);
  const linhas = (await db`SELECT conteudo FROM site_versoes WHERE id = ${id}`) as { conteudo: unknown }[];
  return linhas[0]?.conteudo ?? null;
}

export type RegistroAuditoria = { id: number; criadoEm: string; autor: string; acao: string; detalhe: string };

export async function registrar(autor: string, acao: string, detalhe = "") {
  const db = sql();
  if (!db) {
    const lista = (await lerLocal<RegistroAuditoria[]>("auditoria")) ?? [];
    lista.unshift({ id: (lista[0]?.id ?? 0) + 1, criadoEm: new Date().toISOString(), autor, acao, detalhe });
    await gravarLocal("auditoria", lista.slice(0, 300));
    return;
  }
  await prepararTabelas(db);
  await db`INSERT INTO site_auditoria (autor, acao, detalhe) VALUES (${autor}, ${acao}, ${detalhe})`;
}

export async function listarAuditoria(): Promise<RegistroAuditoria[]> {
  const db = sql();
  if (!db) return (await lerLocal<RegistroAuditoria[]>("auditoria")) ?? [];
  await prepararTabelas(db);
  const linhas = (await db`SELECT id, criado_em, autor, acao, detalhe FROM site_auditoria ORDER BY id DESC LIMIT 200`) as {
    id: number; criado_em: string | Date; autor: string; acao: string; detalhe: string;
  }[];
  return linhas.map((l) => ({ id: l.id, criadoEm: new Date(l.criado_em).toISOString(), autor: l.autor, acao: l.acao, detalhe: l.detalhe }));
}
