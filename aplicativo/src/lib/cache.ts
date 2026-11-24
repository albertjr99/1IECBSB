/** Guarda respostas no aparelho para o app abrir rápido e funcionar sem internet. */
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function lerCache<T>(chave: string): Promise<T | null> {
  try { const v = await AsyncStorage.getItem(`c:${chave}`); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
export async function gravarCache(chave: string, v: unknown) {
  try { await AsyncStorage.setItem(`c:${chave}`, JSON.stringify(v)); } catch { /* sem espaço: segue */ }
}
export async function limparCache() {
  try { const ks = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith("c:")); await AsyncStorage.multiRemove(ks); } catch { /* nada */ }
}
