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
import { pode, type Area, type Papel } from "@/lib/permissoes";

export type { Papel };
export type Usuario = {
  usuario: string;
  nome: string;
  papel: Papel;
  /** vazio = conta criada, aguardando o administrador gerar a senha provisória */
  hash: string;
  criadoEm: string;
  /** outras grafias aceitas no login (ex.: "aloisio" para "aluizio") */
  apelidos?: string[];
  /** senha provisória: a pessoa cria a própria senha no primeiro acesso */
  trocarSenha?: boolean;
  /** foto de perfil (data URL, já reduzida no navegador) */
  foto?: string;
};
export type Sessao = { usuario: string; nome: string; papel: Papel; exp: number; trocarSenha?: boolean; foto?: string };

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
  const lista = l.map((u) => (u.usuario ? u : { ...u, usuario: normalizarUsuario((u.email ?? "").split("@")[0] ?? "") }));
  return aplicarFotosDaEquipe(await criarContasDaEquipe(lista));
}

/** Fotos enviadas pelo administrador (uma vez só; não substitui foto que a pessoa já colocou). */
const FOTOS_APLICADAS = "usuarios:fotos:v1";
let fotosProntas = false;
async function aplicarFotosDaEquipe(lista: Usuario[]): Promise<Usuario[]> {
  if (fotosProntas || lista.length === 0) return lista;
  if (await ler<boolean>(FOTOS_APLICADAS)) { fotosProntas = true; return lista; }
  const { FOTOS_EQUIPE } = await import("./fotos-equipe");
  let mudou = false;
  for (const u of lista) if (!u.foto && FOTOS_EQUIPE[u.usuario]) { u.foto = FOTOS_EQUIPE[u.usuario]; mudou = true; }
  if (mudou) await gravar("usuarios", lista);
  await gravar(FOTOS_APLICADAS, true);
  fotosProntas = true;
  return lista;
}

/**
 * Contas da equipe (nov/2026), criadas uma vez só e sem senha: o
 * administrador gera a senha provisória de cada uma em Usuários, e a
 * pessoa cria a própria senha no primeiro acesso. Nenhuma senha fica no código.
 */
const CONTAS_EQUIPE = "usuarios:equipe:v1";
const EQUIPE: Omit<Usuario, "hash" | "criadoEm">[] = [
  { usuario: "hilario", nome: "Pr. Hilário José", papel: "pastor" },
  { usuario: "aluizio", nome: "Pr. Aluízio Lourenço", papel: "pastor", apelidos: ["aloisio", "aluisio", "aloizio"] },
  { usuario: "renan", nome: "Renan", papel: "admin" },
  { usuario: "comunicacao", nome: "Equipe de Comunicação", papel: "comunicacao" },
];
let equipePronta = false;
async function criarContasDaEquipe(lista: Usuario[]): Promise<Usuario[]> {
  if (equipePronta || lista.length === 0) return lista;
  if (await ler<boolean>(CONTAS_EQUIPE)) { equipePronta = true; return lista; }
  const agora = new Date().toISOString();
  const novas = EQUIPE.filter((c) => !lista.some((u) => u.usuario === c.usuario)).map((c) => ({ ...c, hash: "", criadoEm: agora, trocarSenha: true }));
  const final = [...lista, ...novas];
  if (novas.length) await gravar("usuarios", final);
  await gravar(CONTAS_EQUIPE, true);
  equipePronta = true;
  return final;
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
  const u = usuarios.find((x) => x.usuario === usuario || x.apelidos?.includes(usuario));
  if (!u || !u.hash || !conferirSenha(senha, u.hash)) return null;
  return u;
}

export function assinar(dados: string) {
  return createHmac("sha256", segredo()).update(dados).digest("base64url");
}

export function abrirSessao(u: Usuario) {
  const s: Sessao = { usuario: u.usuario, nome: u.nome, papel: u.papel, exp: Date.now() + DURACAO_MS, ...(u.trocarSenha ? { trocarSenha: true } : {}) };
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

/**
 * Sessão com o perfil ATUAL da pessoa (lido da lista de usuários): se o
 * administrador muda o perfil ou remove alguém, vale na hora, sem esperar o
 * cookie expirar.
 */
export async function sessaoFresca(): Promise<Sessao | null> {
  const s = sessaoAtual();
  if (!s) return null;
  const u = (await listarUsuarios()).find((x) => x.usuario === s.usuario);
  if (!u) return null;
  return { ...s, nome: u.nome, papel: u.papel, ...(u.trocarSenha ? { trocarSenha: true } : { trocarSenha: false }), ...(u.foto ? { foto: u.foto } : {}) };
}

/** Exige sessão e acesso à área; a pessoa com senha provisória só pode criar a própria senha. */
export async function exigirAcesso(area: Area): Promise<Sessao> {
  const s = await sessaoFresca();
  if (!s) throw new Error("Sessão expirada. Entre novamente.");
  if (s.trocarSenha) throw new Error("Crie a sua senha para continuar.");
  if (!pode(s.papel, area)) throw new Error("O seu perfil não tem acesso a esta área.");
  return s;
}

export function exigirSessao(papel?: Papel): Sessao {
  const s = sessaoAtual();
  if (!s) throw new Error("Sessão expirada. Entre novamente.");
  if (papel === "admin" && s.papel !== "admin") throw new Error("Apenas administradores podem fazer isso.");
  return s;
}
