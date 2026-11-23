/**
 * Votos no servidor.
 *
 * A presença (quem votou) e a cédula (em que se votou) ficam em tabelas
 * separadas. No voto secreto a cédula é gravada sem nome e sem horário, então
 * não há como ligar um voto a uma pessoa. A chave única da presença impede
 * votar duas vezes, mesmo com dois cliques simultâneos.
 */
import { createHash, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { gravar, ler } from "./armazem";
import type { Votacao } from "@/lib/votacao";

type Sql = ReturnType<typeof neon>;
let db: Sql | null = null;
let pronto: Promise<void> | null = null;

function sql(): Sql | null {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  if (!db) db = neon(url);
  return db;
}

async function preparar(s: Sql) {
  if (!pronto) {
    pronto = (async () => {
      await s`CREATE TABLE IF NOT EXISTS site_votacao_presenca (
        votacao_id TEXT NOT NULL,
        eleitor_id TEXT NOT NULL,
        em TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (votacao_id, eleitor_id)
      )`;
      await s`CREATE TABLE IF NOT EXISTS site_votacao_cedulas (
        id SERIAL PRIMARY KEY,
        votacao_id TEXT NOT NULL,
        opcao TEXT NOT NULL,
        eleitor_id TEXT,
        em TIMESTAMPTZ,
        comprovante TEXT NOT NULL
      )`;
    })().catch((e) => { pronto = null; throw e; });
  }
  return pronto;
}

// Modo local (sem banco)
type Local = { presenca: { votacaoId: string; eleitorId: string; em: string }[]; cedulas: { votacaoId: string; opcao: string; eleitorId: string | null; em: string | null; comprovante: string }[] };
async function local(): Promise<Local> {
  return (await ler<Local>("votacao:votos")) ?? { presenca: [], cedulas: [] };
}

export const novoToken = () => randomBytes(18).toString("base64url");

export async function listarVotacoes(): Promise<Votacao[]> {
  return (await ler<Votacao[]>("votacoes")) ?? [];
}
export async function salvarVotacoes(l: Votacao[]) {
  await gravar("votacoes", l);
}

export async function acharPorToken(token: string) {
  for (const v of await listarVotacoes()) {
    const e = v.eleitores.find((x) => x.token === token);
    if (e) return { v, e };
  }
  return null;
}

export async function registrarVoto(v: Votacao, eleitorId: string, opcao: string): Promise<{ ok: true; comprovante: string } | { ok: false; erro: string }> {
  const comprovante = createHash("sha256").update(`${v.id}|${eleitorId}|${opcao}|${Date.now()}|${randomBytes(8).toString("hex")}`).digest("hex").slice(0, 16).toUpperCase();
  const identificado = v.sigilo !== "secreta";
  const s = sql();
  if (!s) {
    const d = await local();
    if (d.presenca.some((p) => p.votacaoId === v.id && p.eleitorId === eleitorId)) return { ok: false, erro: "O voto deste link já foi registrado." };
    const em = new Date().toISOString();
    d.presenca.push({ votacaoId: v.id, eleitorId, em });
    d.cedulas.push({ votacaoId: v.id, opcao, eleitorId: identificado ? eleitorId : null, em: identificado ? em : null, comprovante });
    await gravar("votacao:votos", d);
    return { ok: true, comprovante };
  }
  await preparar(s);
  const ins = (await s`INSERT INTO site_votacao_presenca (votacao_id, eleitor_id) VALUES (${v.id}, ${eleitorId})
                       ON CONFLICT DO NOTHING RETURNING eleitor_id`) as unknown[];
  if (ins.length === 0) return { ok: false, erro: "O voto deste link já foi registrado." };
  if (identificado) {
    await s`INSERT INTO site_votacao_cedulas (votacao_id, opcao, eleitor_id, em, comprovante) VALUES (${v.id}, ${opcao}, ${eleitorId}, now(), ${comprovante})`;
  } else {
    await s`INSERT INTO site_votacao_cedulas (votacao_id, opcao, comprovante) VALUES (${v.id}, ${opcao}, ${comprovante})`;
  }
  return { ok: true, comprovante };
}

export async function jaVotou(votacaoId: string, eleitorId: string): Promise<boolean> {
  const s = sql();
  if (!s) return (await local()).presenca.some((p) => p.votacaoId === votacaoId && p.eleitorId === eleitorId);
  await preparar(s);
  const r = (await s`SELECT 1 FROM site_votacao_presenca WHERE votacao_id = ${votacaoId} AND eleitor_id = ${eleitorId}`) as unknown[];
  return r.length > 0;
}

export async function votosDa(votacaoId: string) {
  const s = sql();
  if (!s) {
    const d = await local();
    return {
      presenca: d.presenca.filter((p) => p.votacaoId === votacaoId).map((p) => ({ eleitorId: p.eleitorId, em: p.em })),
      cedulas: d.cedulas.filter((c) => c.votacaoId === votacaoId).map((c) => ({ opcao: c.opcao, eleitorId: c.eleitorId, em: c.em })),
    };
  }
  await preparar(s);
  const p = (await s`SELECT eleitor_id, em FROM site_votacao_presenca WHERE votacao_id = ${votacaoId} ORDER BY em`) as { eleitor_id: string; em: string | Date }[];
  const c = (await s`SELECT opcao, eleitor_id, em FROM site_votacao_cedulas WHERE votacao_id = ${votacaoId}`) as { opcao: string; eleitor_id: string | null; em: string | Date | null }[];
  return {
    presenca: p.map((x) => ({ eleitorId: x.eleitor_id, em: new Date(x.em).toISOString() })),
    cedulas: c.map((x) => ({ opcao: x.opcao, eleitorId: x.eleitor_id, em: x.em ? new Date(x.em).toISOString() : null })),
  };
}

export async function apagarVotos(votacaoId: string) {
  const s = sql();
  if (!s) {
    const d = await local();
    d.presenca = d.presenca.filter((p) => p.votacaoId !== votacaoId);
    d.cedulas = d.cedulas.filter((c) => c.votacaoId !== votacaoId);
    await gravar("votacao:votos", d);
    return;
  }
  await preparar(s);
  await s`DELETE FROM site_votacao_presenca WHERE votacao_id = ${votacaoId}`;
  await s`DELETE FROM site_votacao_cedulas WHERE votacao_id = ${votacaoId}`;
}
