/**
 * Conversa com o servidor da igreja (o mesmo do site e do painel).
 * A sessão do membro fica guardada com segurança no aparelho (SecureStore).
 */
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const API = (process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? "https://1iecbsb.vercel.app").replace(/\/$/, "");

const CHAVE = "iecb.sessao";
let token: string | null = null;
let aoExpirar: (() => void) | null = null;

const guardar = {
  async ler() {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(CHAVE) ?? null;
    return SecureStore.getItemAsync(CHAVE);
  },
  async gravar(v: string | null) {
    if (Platform.OS === "web") { if (v) globalThis.localStorage?.setItem(CHAVE, v); else globalThis.localStorage?.removeItem(CHAVE); return; }
    if (v) await SecureStore.setItemAsync(CHAVE, v); else await SecureStore.deleteItemAsync(CHAVE);
  },
};

export async function carregarToken() { token = await guardar.ler(); return token; }
export async function definirToken(t: string | null) { token = t; await guardar.gravar(t); }
export const temToken = () => !!token;
export const tokenAtual = () => token;
export function quandoExpirar(fn: () => void) { aoExpirar = fn; }

export class ErroApi extends Error { constructor(msg: string, public sessao = false, public rede = false) { super(msg); } }

export async function chamar<T>(acao: string, dados?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${API}/api/m`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ acao, dados: dados ?? {} }),
    });
  } catch {
    throw new ErroApi("Sem conexão com a internet. Tente de novo.", false, true);
  }
  const j = (await r.json().catch(() => null)) as { ok?: boolean; dados?: T; erro?: string; sessao?: boolean } | null;
  if (!r.ok || !j?.ok) {
    if (j?.sessao) { await definirToken(null); aoExpirar?.(); }
    throw new ErroApi(j?.erro ?? "Não foi possível falar com a igreja agora.", !!j?.sessao);
  }
  return j.dados as T;
}
