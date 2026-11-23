import { useEffect, useSyncExternalStore } from "react";
import { obterAoVivo } from "./api";

type Situacao = Awaited<ReturnType<typeof obterAoVivo>>;

let estado: Situacao | null = null;
let canalAtual = "";
let timer: ReturnType<typeof setInterval> | null = null;
const ouvintes = new Set<() => void>();

async function checar() {
  try {
    estado = await obterAoVivo({ data: { canal: canalAtual } });
    ouvintes.forEach((f) => f());
  } catch { /* mantém o último estado */ }
}

/** Situação da transmissão do canal; checa a cada 2 minutos enquanto a página está aberta. */
export function useAoVivo(canal: string): Situacao | null {
  useEffect(() => {
    if (!canal) return;
    if (canal !== canalAtual) {
      canalAtual = canal;
      estado = null;
      checar();
    }
    if (!timer) timer = setInterval(checar, 120_000);
  }, [canal]);
  return useSyncExternalStore(
    (f) => { ouvintes.add(f); return () => ouvintes.delete(f); },
    () => estado,
    () => null,
  );
}
