/** Membro logado, compartilhado por todas as telas. */
import { createContext, useContext } from "react";
import type { Membro } from "./tipos";

export type Sessao = {
  membro: Membro;
  atualizar: (m: Membro) => void;
  /** grava no servidor e já reflete no app (otimista) */
  salvarPerfil: (p: Partial<Pick<Membro, "prefs" | "favoritos" | "ultimaLeitura" | "foto" | "celular" | "email" | "nascimento">>) => Promise<void>;
  sair: () => Promise<void>;
};

export const SessaoCtx = createContext<Sessao | null>(null);
export function useMembro() {
  const s = useContext(SessaoCtx);
  if (!s) throw new Error("Sem sessão");
  return s;
}
