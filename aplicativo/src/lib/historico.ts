/** Últimos capítulos lidos e hinos abertos (no aparelho), para voltar com um toque. */
import AsyncStorage from "@react-native-async-storage/async-storage";

async function ler<T>(k: string): Promise<T[]> {
  try { return JSON.parse((await AsyncStorage.getItem(k)) ?? "[]") as T[]; } catch { return []; }
}
async function anotar<T>(k: string, item: T, igual: (a: T, b: T) => boolean, max = 8) {
  const l = (await ler<T>(k)).filter((x) => !igual(x, item));
  await AsyncStorage.setItem(k, JSON.stringify([item, ...l].slice(0, max))).catch(() => {});
}

export type Leitura = { livro: string; cap: number };
export const leiturasRecentes = () => ler<Leitura>("hist:biblia");
export const anotarLeitura = (l: Leitura) => anotar("hist:biblia", l, (a, b) => a.livro === b.livro && a.cap === b.cap);
export const hinosRecentes = () => ler<number>("hist:hinos");
export const anotarHino = (n: number) => anotar("hist:hinos", n, (a, b) => a === b, 10);
