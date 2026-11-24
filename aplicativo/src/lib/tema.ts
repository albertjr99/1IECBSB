/**
 * Identidade visual da 1ª IEC Brasília (docs/IDENTIDADE-VISUAL.md):
 * azul-marinho institucional, vermelho só em detalhes (a cruz), Montserrat,
 * Lora itálico nos versículos, cantos retos.
 */
import { createContext, useContext } from "react";

export const AZUL = "#00436F";
export const NOITE = "#002A47";
export const VERMELHO = "#CC2127";

export type Cores = {
  fundo: string; sup: string; borda: string; texto: string; suave: string; azul: string; realce: string; escuro: boolean;
};

export const CLARO: Cores = { fundo: "#F3F6F9", sup: "#FFFFFF", borda: "#D9E6EF", texto: "#1D2B36", suave: "#5B7F99", azul: AZUL, realce: "#E8F0F6", escuro: false };
export const ESCURO: Cores = { fundo: "#0B1219", sup: "#121C26", borda: "#22313F", texto: "#E6EDF3", suave: "#8AA3B8", azul: "#8FB6D3", realce: "#16283A", escuro: true };

export const F = {
  regular: "Montserrat_400Regular",
  medio: "Montserrat_500Medium",
  semi: "Montserrat_600SemiBold",
  negrito: "Montserrat_700Bold",
  extra: "Montserrat_800ExtraBold",
  verso: "Lora_400Regular_Italic",
  versoMedio: "Lora_500Medium_Italic",
  leitura: "Lora_400Regular",
};

/** Escala da letra de leitura (preferência 1–5). */
export const ESCALA_LETRA = [0.86, 0.93, 1, 1.12, 1.26];

export const RAIO = 2;

export const TemaCtx = createContext<{ c: Cores; letra: number }>({ c: CLARO, letra: 1 });
export const useTema = () => useContext(TemaCtx);
