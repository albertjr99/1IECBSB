/**
 * Notificações: pede permissão uma vez, registra o aparelho no servidor
 * e leva o membro à tela certa quando ele toca no aviso.
 */
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { chamar } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let tokenAparelho: string | null = null;
export const aparelhoAtual = () => tokenAparelho;

export async function registrarAparelho() {
  if (Platform.OS === "web" || !Device.isDevice) return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("avisos", { name: "Avisos da igreja", importance: Notifications.AndroidImportance.HIGH, lightColor: "#00436F" });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId || undefined;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    tokenAparelho = data;
    await chamar("aparelho", { token: data, plataforma: Platform.OS });
  } catch {
    // sem configuração de push (Firebase/APNs) o app segue normalmente
  }
}
