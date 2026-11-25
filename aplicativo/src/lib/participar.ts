/** Votações e reuniões online: dados, entrada na sala e lembretes no aparelho. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";
import { chamar } from "./api";
import { AZUL } from "./tema";

export type VotacaoMembro = {
  id: string; titulo: string; descricao: string; situacao: "agendada" | "em_andamento" | "encerrada" | "rascunho";
  inicio: string; fim: string; token: string; sigilo: "secreta" | "presidencia" | "aberta"; votou: boolean;
  participacao: { votaram: number; eleitores: number };
};
export type ReuniaoMembro = {
  id: string; titulo: string; descricao: string; inicio: string; duracaoMin: number; sala: string; cancelada?: boolean;
  aoVivo: boolean; passou: boolean; participei: boolean; presentes: number;
};
export type Participacao = { votacoes: VotacaoMembro[]; reunioes: ReuniaoMembro[] };

export const carregarParticipacao = () => chamar<Participacao>("participar");

export const pendencias = (p: Participacao | null) =>
  (p?.votacoes.filter((v) => v.situacao === "em_andamento" && !v.votou).length ?? 0) + (p?.reunioes.filter((r) => r.aoVivo && !r.cancelada).length ?? 0);

/** Entra na sala: pelo app Jitsi Meet, se estiver instalado; senão, no navegador. */
export async function entrarNaSala(id: string) {
  const { url } = await chamar<{ url: string }>("entrarReuniao", { id });
  if (Platform.OS !== "web") {
    try { await Linking.openURL(url.replace(/^https:\/\//, "org.jitsi.meet://")); return; } catch { /* sem o app: navegador */ }
  }
  await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN, toolbarColor: AZUL });
}

// ─── lembretes (15 min antes) ───
const CHAVE = "lembretes:reunioes";
async function mapa(): Promise<Record<string, string>> {
  try { return JSON.parse((await AsyncStorage.getItem(CHAVE)) ?? "{}"); } catch { return {}; }
}
export async function lembretesAtivos() { return mapa(); }

export async function alternarLembrete(r: ReuniaoMembro): Promise<boolean> {
  const m = await mapa();
  if (m[r.id]) {
    await Notifications.cancelScheduledNotificationAsync(m[r.id]!).catch(() => {});
    delete m[r.id];
    await AsyncStorage.setItem(CHAVE, JSON.stringify(m));
    return false;
  }
  const quando = new Date(r.inicio).getTime() - 15 * 60_000;
  if (quando < Date.now()) throw new Error("A reunião já vai começar: a sala já está aberta.");
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") throw new Error("Permita as notificações do aplicativo para receber o lembrete.");
  const nid = await Notifications.scheduleNotificationAsync({
    content: { title: "A reunião vai começar", body: `${r.titulo}: a sala abre agora. Toque para entrar.`, data: { tela: "participar" }, sound: "default" },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando, channelId: "avisos" },
  });
  m[r.id] = nid;
  await AsyncStorage.setItem(CHAVE, JSON.stringify(m));
  return true;
}
