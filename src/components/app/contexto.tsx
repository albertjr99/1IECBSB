import { createContext, useContext } from "react";
import type { MembroPublico } from "@/lib/membros";

export type CtxApp = { membro: MembroPublico; atualizar: (m: MembroPublico) => void; sair: () => void };
export const AppCtx = createContext<CtxApp | null>(null);
export function useMembro() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useMembro fora do app");
  return c;
}
