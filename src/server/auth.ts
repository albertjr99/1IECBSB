/**
 * Contas do painel e sessão.
 *
 * Senhas guardadas com scrypt (sal próprio por usuário). A sessão é um cookie
 * HttpOnly assinado com HMAC — o servidor não precisa guardar sessões.
 *
 * Primeiro acesso: enquanto não existir nenhum usuário, quem entrar com o
 * e-mail e a senha das variáveis ADMIN_EMAIL e ADMIN_SENHA vira o primeiro
 * administrador. Em desenvolvimento local, sem essas variáveis, vale
 * admin@local / admin123.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { gravar, ler } from "./armazem";

export type Papel = "admin" | "editor";
export type Usuario = { email: string; nome: string; papel: Papel; hash: string; criadoEm: string };
export type Sessao = { email: string; nome: string; papel: Papel; exp: number };

const COOKIE = "iecb_sessao";
const DURACAO_MS = 1000 * 60 * 60 * 24 * 7;

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // Sem segredo configurado, deriva um do banco (estável entre reinícios)
  // ou usa um fixo em desenvolvimento.
  const base = process.env.DATABASE_URL || process.env.POSTGRES_URL || "desenvolvimento-local-iecb";
  return createHmac("sha256", "iecb-sessao").update(base).digest("hex");
}

export function gerarHash(senha: string): string {
  const sal = randomBytes(16).toString("hex");
  const h = scryptSync(senha, sal, 64).toString("hex");
  return `${sal}:${h}`;
}

export function conferirSenha(senha: string, hash: string): boolean {
  const [sal, h] = hash.split(":");
  if (!sal || !h) return false;
  const calc = scryptSync(senha, sal, 64);
  const esperado = Buffer.from(h, "hex");
  return esperado.length === calc.length && timingSafeEqual(calc, esperado);
}

export async function listarUsuarios(): Promise<Usuario[]> {
  return (await ler<Usuario[]>("usuarios")) ?? [];
}

export async function salvarUsuarios(lista: Usuario[]) {
  await gravar("usuarios", lista);
}

function credenciaisIniciais(): { email: string; senha: string } | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_SENHA;
  if (email && senha) return { email, senha };
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    return { email: "admin@local", senha: "admin123" };
  }
  return null;
}

export async function precisaPrimeiroAcesso() {
  return (await listarUsuarios()).length === 0;
}

export async function autenticar(emailBruto: string, senha: string): Promise<Usuario | null> {
  const email = emailBruto.trim().toLowerCase();
  const usuarios = await listarUsuarios();
  if (usuarios.length === 0) {
    const ini = credenciaisIniciais();
    if (ini && ini.email === email && ini.senha === senha) {
      const novo: Usuario = {
        email, nome: "Administrador", papel: "admin", hash: gerarHash(senha), criadoEm: new Date().toISOString(),
      };
      await salvarUsuarios([novo]);
      return novo;
    }
    return null;
  }
  const u = usuarios.find((x) => x.email === email);
  if (!u || !conferirSenha(senha, u.hash)) return null;
  return u;
}

function assinar(dados: string) {
  return createHmac("sha256", segredo()).update(dados).digest("base64url");
}

export function abrirSessao(u: Usuario) {
  const s: Sessao = { email: u.email, nome: u.nome, papel: u.papel, exp: Date.now() + DURACAO_MS };
  const dados = Buffer.from(JSON.stringify(s)).toString("base64url");
  setCookie(COOKIE, `${dados}.${assinar(dados)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_MS / 1000,
  });
}

export function encerrarSessao() {
  deleteCookie(COOKIE, { path: "/" });
}

export function sessaoAtual(): Sessao | null {
  const bruto = getCookie(COOKIE);
  if (!bruto) return null;
  const [dados, assinatura] = bruto.split(".");
  if (!dados || !assinatura) return null;
  const esperado = assinar(dados);
  if (esperado.length !== assinatura.length || !timingSafeEqual(Buffer.from(esperado), Buffer.from(assinatura))) return null;
  try {
    const s = JSON.parse(Buffer.from(dados, "base64url").toString()) as Sessao;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function exigirSessao(papel?: Papel): Sessao {
  const s = sessaoAtual();
  if (!s) throw new Error("Sessão expirada. Entre novamente.");
  if (papel === "admin" && s.papel !== "admin") throw new Error("Apenas administradores podem fazer isso.");
  return s;
}
