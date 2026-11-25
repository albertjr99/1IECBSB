/** Escalas dos ministérios: chamadas ao servidor, tipos das telas e lembretes no aparelho. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { chamar } from "./api";
import type { Funcao, Indisponibilidade, ItemRoteiro, MinisterioApp, Musica, Resposta, Serie } from "./escalas-regras";

export * from "./escalas-regras";

export type VagaVista = { id: string; funcaoId: string; funcao: string; membroId?: string; nome?: string; resposta: Resposta; motivo?: string; respondidoEm?: string };
export type EscalaVista = {
  id: string; ministerioId: string; ministerio: string; icone: string; titulo: string; inicio: string; local?: string; observacoes?: string;
  situacao: "rascunho" | "publicada"; serieId?: string; vagas: VagaVista[]; roteiro: ItemRoteiro[]; musicas: Musica[];
  minhas: string[]; confirmados: number; preenchidas: number; total: number; historico?: { em: string; quem: string; o: string }[];
};
export type MeuMinisterio = { id: string; nome: string; icone: string; lider: boolean; funcoes: string[]; pessoas: number; rascunhos: number; recusas: number };
export type InicioEscalas = { ministerios: MeuMinisterio[]; proximas: EscalaVista[]; recentes: EscalaVista[]; pendentes: number; ausencias: Indisponibilidade[] };
export type VerEscala = { escala: EscalaVista; ministerio: { id: string; nome: string; icone: string; repertorio: boolean; funcoes: Funcao[] }; lider: boolean; alertas: Record<string, string[]> };
export type PessoaEquipe = { membroId: string; nome: string; lider: boolean; funcoes: string[]; funcoesNomes: string[]; vezes90: number; ultima?: string; faltas: number };
export type DadosMinisterio = {
  ministerio: MinisterioApp; equipe: PessoaEquipe[]; escalas: EscalaVista[]; series: Serie[];
  ausencias: (Indisponibilidade & { nome: string })[]; membrosIgreja: { id: string; nome: string }[]; musicasUsadas: (Musica & { vezes: number })[];
};

export const carregarEscalas = () => chamar<InicioEscalas>("escalas");
export const verEscala = (id: string) => chamar<VerEscala>("escala", { id });
export const responderEscala = (id: string, vagaId: string, resposta: Resposta, motivo?: string) => chamar<{ ok: true }>("escalaResponder", { id, vagaId, resposta, motivo });
export const marcarAusencia = (de: string, ate: string, motivo?: string) => chamar<{ ok: true }>("ausencia", { de, ate, motivo });
export const removerAusencia = (id: string) => chamar<{ ok: true }>("ausenciaRemover", { id });
export const carregarMinisterio = (id: string) => chamar<DadosMinisterio>("ministerio", { id });
export const salvarEscala = (d: unknown) => chamar<{ id: string; situacao: "rascunho" | "publicada" }>("escalaSalvar", d);
export const excluirEscala = (id: string) => chamar<{ ok: true }>("escalaExcluir", { id });
export const salvarSerie = (d: unknown) => chamar<{ id: string }>("serieSalvar", d);
export const excluirSerie = (id: string) => chamar<{ ok: true }>("serieExcluir", { id });
export const salvarEquipe = (d: unknown) => chamar<{ ok: true }>("equipe", d);

// ─── datas digitadas (dd/mm/aaaa e hh:mm) ───
export function mascaraData(t: string) {
  const d = t.replace(/\D/g, "").slice(0, 8);
  return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
export function mascaraHora(t: string) {
  const d = t.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}
/** "dd/mm/aaaa" → "aaaa-mm-dd" (ou "" se inválida). */
export function dataDigitada(t: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t.trim());
  if (!m) return "";
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : "";
}
export const horaValida = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

// ─── lembrete no aparelho: 2 horas antes de cada escala minha ───
const CHAVE = "lembretes:escalas";
async function mapa(): Promise<Record<string, string>> {
  try { return JSON.parse((await AsyncStorage.getItem(CHAVE)) ?? "{}"); } catch { return {}; }
}

/** Agenda (ou desfaz) os lembretes conforme as escalas atuais. Silencioso: sem permissão, não faz nada. */
export async function sincronizarLembretes(proximas: EscalaVista[]) {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const m = await mapa();
    const quer = new Map<string, EscalaVista>();
    for (const e of proximas) {
      const minhas = e.vagas.filter((v) => e.minhas.includes(v.id) && v.resposta !== "recusado");
      const t = new Date(e.inicio).getTime() - 2 * 3600e3;
      if (minhas.length && t > Date.now()) quer.set(`${e.id}@${e.inicio}`, e);
    }
    for (const [k, nid] of Object.entries(m)) if (!quer.has(k)) { await Notifications.cancelScheduledNotificationAsync(nid).catch(() => {}); delete m[k]; }
    for (const [k, e] of quer) {
      if (m[k]) continue;
      const funcoes = e.vagas.filter((v) => e.minhas.includes(v.id)).map((v) => v.funcao).join(", ");
      m[k] = await Notifications.scheduleNotificationAsync({
        content: { title: `Daqui a 2 horas: ${e.ministerio}`, body: `${e.titulo} (${funcoes}). Bom serviço!`, data: { tela: "escala", id: e.id }, sound: "default" },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(e.inicio).getTime() - 2 * 3600e3, channelId: "avisos" },
      });
    }
    await AsyncStorage.setItem(CHAVE, JSON.stringify(m));
  } catch { /* lembrete é cortesia: nunca atrapalha a tela */ }
}
