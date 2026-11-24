/**
 * Consentimento de cookies (LGPD). Guardado no navegador do visitante.
 * - essenciais: sempre ligados (preferências do site, sessão do painel).
 * - midia: conteúdo de terceiros que pode gravar cookies — vídeos do YouTube e mapas do Google.
 */
import { useSyncExternalStore } from "react";

export type Consentimento = { versao: 1; midia: boolean; em: string };
const CHAVE = "iecb_consentimento";
const ouvintes = new Set<() => void>();
let cache: Consentimento | null | undefined;

function ler(): Consentimento | null {
  if (cache !== undefined) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Consentimento | null;
    cache = v && v.versao === 1 ? v : null;
  } catch { cache = null; }
  return cache;
}

export function salvarConsentimento(midia: boolean) {
  cache = { versao: 1, midia, em: new Date().toISOString() };
  try { localStorage.setItem(CHAVE, JSON.stringify(cache)); } catch { /* navegação privada */ }
  preferenciasAbertas = false;
  ouvintes.forEach((f) => f());
}

let preferenciasAbertas = false;
export function abrirPreferenciasCookies() {
  preferenciasAbertas = true;
  ouvintes.forEach((f) => f());
}

const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

/** `pronto` é falso no servidor e no primeiro desenho (evita piscar o aviso). */
export function useConsentimento() {
  const c = useSyncExternalStore(assinar, () => ler(), () => undefined);
  const aberto = useSyncExternalStore(assinar, () => preferenciasAbertas, () => false);
  return { pronto: c !== undefined, decidido: Boolean(c), midia: Boolean(c?.midia), preferenciasAbertas: aberto };
}
