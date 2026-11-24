/**
 * Membros do app: cadastro, sessão (cookie próprio, separado do painel) e
 * dados que o app usa. Senha com o mesmo cuidado do painel (scrypt com sal).
 */
import { timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";
import { gravar, ler } from "./armazem";
import { assinar, conferirSenha } from "./auth";
import { PREFS_PADRAO, soDigitos, type Contribuicao, type Membro, type MembroPublico, type Reuniao } from "@/lib/membros";

const COOKIE = "iecb_membro";
const DURACAO_MS = 1000 * 60 * 60 * 24 * 120; // 4 meses: no celular ninguém quer entrar toda hora

export const novoId = (p = "m") => `${p}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

export async function lerMembros(): Promise<Membro[]> {
  const l = (await ler<Membro[]>("membros")) ?? [];
  return l.map((m) => ({ ...m, prefs: { ...PREFS_PADRAO, ...m.prefs }, favoritos: m.favoritos ?? { versos: [], hinos: [] } }));
}
export async function gravarMembros(l: Membro[]) { await gravar("membros", l); }

export const publico = ({ hash: _h, aparelhos: _a, ...m }: Membro): MembroPublico => m;

/** Acha pelo celular (só dígitos, com ou sem DDD/55) ou e-mail. */
export function acharPorLogin(l: Membro[], login: string) {
  const t = login.trim().toLowerCase();
  if (t.includes("@")) return l.find((m) => m.email.toLowerCase() === t);
  const d = soDigitos(t).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length < 8) return undefined;
  return l.find((m) => { const c = soDigitos(m.celular).replace(/^55(?=\d{10,11}$)/, ""); return c === d || c.endsWith(d) || d.endsWith(c); });
}

export function autenticarMembro(m: Membro | undefined, senha: string) {
  return !!m && !!m.hash && conferirSenha(senha, m.hash);
}

/** Credencial assinada do membro (cookie no site; "Bearer" no app das lojas). */
export function tokenDoMembro(m: Pick<Membro, "id">, duracaoMs = DURACAO_MS) {
  const dados = Buffer.from(JSON.stringify({ id: m.id, exp: Date.now() + duracaoMs })).toString("base64url");
  return `${dados}.${assinar(`membro.${dados}`)}`;
}

export function abrirSessaoMembro(m: Membro) {
  setCookie(COOKIE, tokenDoMembro(m), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACAO_MS / 1000 });
}
export function encerrarSessaoMembro() { deleteCookie(COOKIE, { path: "/" }); }

function idDaSessao(): string | null {
  const auth = getRequestHeader("authorization");
  const bruto = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : getCookie(COOKIE);
  if (!bruto) return null;
  const [dados, sig] = bruto.split(".");
  if (!dados || !sig) return null;
  const esperado = assinar(`membro.${dados}`);
  if (esperado.length !== sig.length || !timingSafeEqual(Buffer.from(esperado), Buffer.from(sig))) return null;
  try {
    const s = JSON.parse(Buffer.from(dados, "base64url").toString()) as { id: string; exp: number };
    return s.exp > Date.now() ? s.id : null;
  } catch { return null; }
}

/** O membro da sessão, como está agora no cadastro (inativado = sem acesso). */
export async function membroAtual(): Promise<Membro | null> {
  const id = idDaSessao();
  if (!id) return null;
  return (await lerMembros()).find((m) => m.id === id) ?? null;
}

/** Exige membro ativo (aprovado) e com a própria senha criada. */
export async function exigirMembro(): Promise<Membro> {
  const m = await membroAtual();
  if (!m) throw new Error("Entre novamente no aplicativo.");
  if (m.situacao === "pendente") throw new Error("Seu cadastro ainda está aguardando a aprovação da secretaria.");
  if (m.situacao === "inativo") throw new Error("Seu acesso ao aplicativo está desativado. Fale com a secretaria.");
  if (m.trocarSenha) throw new Error("Crie a sua senha para continuar.");
  return m;
}

/** Altera o próprio membro (uma gravação). */
export async function alterarMembro(id: string, fn: (m: Membro) => void) {
  const l = await lerMembros();
  const m = l.find((x) => x.id === id);
  if (!m) throw new Error("Cadastro não encontrado.");
  fn(m);
  await gravarMembros(l);
  return m;
}

// ─── Hinário, contribuições, reuniões ───────────────────────────────────────


export async function lerContribuicoes(): Promise<Contribuicao[]> { return (await ler<Contribuicao[]>("contribuicoes")) ?? []; }
export async function gravarContribuicoes(l: Contribuicao[]) { await gravar("contribuicoes", l); }

export async function lerReunioes(): Promise<Reuniao[]> { return ((await ler<Reuniao[]>("reunioes")) ?? []).sort((a, b) => a.inicio.localeCompare(b.inicio)); }
export async function gravarReunioes(l: Reuniao[]) { await gravar("reunioes", l); }
