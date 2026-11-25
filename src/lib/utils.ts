import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { data as dataDoInstante, dataBR, diaBrasilia } from "./datas";

export function cn(...c: ClassValue[]) {
  return twMerge(clsx(c));
}

export const ehExterno = (link: string) => /^(https?:|mailto:|tel:|whatsapp:)/i.test(link);

export function linkWhatsapp(numero: string, texto = "") {
  const n = numero.replace(/\D/g, "");
  if (!n) return "";
  const comPais = n.length <= 11 ? `55${n}` : n;
  return `https://wa.me/${comPais}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function linkTelefone(t: string) {
  const n = t.replace(/\D/g, "");
  return n ? `tel:+${n.length <= 11 ? `55${n}` : n}` : "";
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-12-05" → Date local (sem deslocar o dia pelo fuso) */
export function dataLocal(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function diaMes(iso: string) {
  if (!iso) return { dia: "", mes: "" };
  const d = dataLocal(iso);
  return { dia: String(d.getDate()).padStart(2, "0"), mes: MESES[d.getMonth()] ?? "" };
}

/** "27/11/2026" ou "27/11 a 29/11/2026" (formato brasileiro). */
export function periodo(inicio: string, fim?: string) {
  if (!inicio) return "";
  if (!fim || fim === inicio) return dataBR(inicio);
  return inicio.slice(0, 4) === fim.slice(0, 4) ? `${dataBR(inicio).slice(0, 5)} a ${dataBR(fim)}` : `${dataBR(inicio)} a ${dataBR(fim)}`;
}

/** Instante → "25/11/2026" no horário de Brasília. */
export function dataCurta(iso: string) {
  return dataDoInstante(iso);
}

export function duracaoTexto(s: number) {
  if (!s) return "";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(seg).padStart(2, "0")}` : `${m}:${String(seg).padStart(2, "0")}`;
}

export function paragrafos(texto: string) {
  return texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/** "aaaa-mm-dd" de hoje no horário de Brasília. */
export function hojeISO() {
  return diaBrasilia();
}
