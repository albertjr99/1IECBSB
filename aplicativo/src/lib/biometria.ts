/**
 * Entrar com biometria (rosto, digital, íris — o que o aparelho tiver).
 * Ao ativar, uma cópia da sessão fica no cofre do aparelho (SecureStore) e só é
 * usada depois que o sistema confirma a biometria. Também vale para abrir o app.
 */
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const LIGADA = "iecb.bio.ligada";
const COPIA = "iecb.bio.sessao";
const NOME = "iecb.bio.nome";

export type Biometria = { ok: boolean; nome: string; tipo: "rosto" | "digital" | "iris" | "outra" };

/** O que o aparelho oferece ("Face ID", "digital"…), se houver biometria cadastrada. */
export async function biometriaDoAparelho(): Promise<Biometria> {
  if (Platform.OS === "web") return { ok: false, nome: "", tipo: "outra" };
  try {
    const [hw, cad, tipos] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync(), LocalAuthentication.supportedAuthenticationTypesAsync()]);
    const T = LocalAuthentication.AuthenticationType;
    const tipo = tipos.includes(T.FACIAL_RECOGNITION) ? "rosto" : tipos.includes(T.FINGERPRINT) ? "digital" : tipos.includes(T.IRIS) ? "iris" : "outra";
    const nome = tipo === "rosto" ? (Platform.OS === "ios" ? "Face ID" : "reconhecimento facial") : tipo === "digital" ? (Platform.OS === "ios" ? "Touch ID" : "digital") : tipo === "iris" ? "íris" : "biometria";
    return { ok: hw && cad, nome, tipo };
  } catch { return { ok: false, nome: "", tipo: "outra" }; }
}

export async function biometriaLigada() {
  if (Platform.OS === "web") return false;
  return (await SecureStore.getItemAsync(LIGADA).catch(() => null)) === "1";
}

/** Pede a biometria ao sistema (com a senha do aparelho como alternativa). */
export async function confirmarBiometria(motivo = "Entrar no app da igreja") {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: motivo, cancelLabel: "Cancelar", fallbackLabel: "Usar a senha do celular" });
  return r.success;
}

export async function ligarBiometria(token: string, nome: string) {
  if (!(await confirmarBiometria("Confirme para ativar a entrada com biometria"))) return false;
  await SecureStore.setItemAsync(COPIA, token);
  await SecureStore.setItemAsync(NOME, nome);
  await SecureStore.setItemAsync(LIGADA, "1");
  return true;
}

export async function desligarBiometria() {
  await Promise.all([SecureStore.deleteItemAsync(LIGADA), SecureStore.deleteItemAsync(COPIA), SecureStore.deleteItemAsync(NOME)].map((p) => p.catch(() => {})));
}

/** Atualiza a cópia guardada quando a pessoa entra de novo com a senha. */
export async function renovarCopia(token: string) {
  if (await biometriaLigada()) await SecureStore.setItemAsync(COPIA, token).catch(() => {});
}

/** Nome de quem ativou (para "Entrar como Maria"). */
export const nomeGuardado = () => (Platform.OS === "web" ? Promise.resolve(null) : SecureStore.getItemAsync(NOME).catch(() => null));

/** Confirma a biometria e devolve a sessão guardada (ou null). */
export async function entrarComBiometria(): Promise<string | null> {
  if (!(await biometriaLigada())) return null;
  if (!(await confirmarBiometria())) return null;
  return SecureStore.getItemAsync(COPIA).catch(() => null);
}
