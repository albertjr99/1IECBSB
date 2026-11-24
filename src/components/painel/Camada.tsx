import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Abre janelas e gavetas por cima de todo o painel (fora das áreas com rolagem). */
export function Camada({ children }: { children: ReactNode }) {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null);
  useEffect(() => setAlvo(document.querySelector<HTMLElement>(".painel") ?? document.body), []);
  return alvo ? createPortal(children, alvo) : null;
}
