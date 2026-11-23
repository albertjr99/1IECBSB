/**
 * Contas do painel e sessão.
 *
 * Senhas guardadas com scrypt (sal próprio por usuário). A sessão é um cookie
 * HttpOnly assinado com HMAC — o servidor não precisa guardar sessões.
 *
 * Login pelo primeiro nome (sem diferença de maiúsculas e acentos) e senha.
 *
 * Primeiro acesso: enquanto não existir nenhum usuário, quem entrar com o
 * nome e a senha das variáveis ADMIN_USUARIO e ADMIN_SENHA vira o primeiro
 * administrador. Em desenvolvimento local, sem essas variáveis, vale
 * admin / admin123.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { gravar, ler, urlDoBanco } from "./armazem";

export type Papel = "admin" | "editor";
export type Usuario = { usuario: string; nome: string; papel: Papel; hash: string; criadoEm: string };
export type Sessao = { usuario: string; nome: string; papel: Papel; exp: number };

/** "Hilário" → "hilario": é assim que o nome de acesso é guardado e comparado. */
export function normalizarUsuario(t: string) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9.]/g, "");
}

const COOKIE = "iecb_sessao";
const DURACAO_MS = 1000 * 60 * 60 * 24 * 7;

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // Sem segredo configurado, deriva um do banco (estável entre reinícios)
  // ou usa um fixo em desenvolvimento.
  const base = urlDoBanco() || "desenvolvimento-local-iecb";
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
  const l = (await ler<(Usuario & { email?: string })[]>("usuarios")) ?? [];
  // contas antigas (por e-mail) passam a usar o nome antes do @
  return l.map((u) => (u.usuario ? u : { ...u, usuario: normalizarUsuario((u.email ?? "").split("@")[0] ?? "") }));
}

export async function salvarUsuarios(lista: Usuario[]) {
  await gravar("usuarios", lista);
}

function credenciaisIniciais(): { usuario: string; senha: string } | null {
  const bruto = process.env.ADMIN_USUARIO || (process.env.ADMIN_EMAIL ?? "").split("@")[0] || "";
  const usuario = normalizarUsuario(bruto);
  const senha = process.env.ADMIN_SENHA;
  if (usuario && senha) return { usuario, senha };
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    return { usuario: "admin", senha: "admin123" };
  }
  return null;
}

export async function precisaPrimeiroAcesso() {
  return (await listarUsuarios()).length === 0;
}

export async function autenticar(usuarioBruto: string, senha: string): Promise<Usuario | null> {
  const usuario = normalizarUsuario(usuarioBruto);
  const usuarios = await listarUsuarios();
  if (usuarios.length === 0) {
    const ini = credenciaisIniciais();
    if (ini && ini.usuario === usuario && ini.senha === senha) {
      const bruto = (process.env.ADMIN_USUARIO ?? "").trim();
      const novo: Usuario = {
        usuario, nome: bruto ? bruto.charAt(0).toUpperCase() + bruto.slice(1) : "Administrador", papel: "admin", hash: gerarHash(senha), criadoEm: new Date().toISOString(),
      };
      await salvarUsuarios([novo]);
      return novo;
    }
    return null;
  }
  const u = usuarios.find((x) => x.usuario === usuario);
  if (!u || !conferirSenha(senha, u.hash)) return null;
  return u;
}

function assinar(dados: string) {
  return createHmac("sha256", segredo()).update(dados).digest("base64url");
}

export function abrirSessao(u: Usuario) {
  const s: Sessao = { usuario: u.usuario, nome: u.nome, papel: u.papel, exp: Date.now() + DURACAO_MS };
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
    return s.exp > Date.now() && s.usuario ? s : null;
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
