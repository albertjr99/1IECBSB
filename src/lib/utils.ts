import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function periodo(inicio: string, fim?: string) {
  if (!inicio) return "";
  const f = (iso: string) => dataLocal(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  if (!fim || fim === inicio) return dataLocal(inicio).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  return `${f(inicio)} a ${f(fim)}`;
}

export function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

export function duracaoTexto(s: number) {
  if (!s) return "";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(seg).padStart(2, "0")}` : `${m}:${String(seg).padStart(2, "0")}`;
}

export function paragrafos(texto: string) {
  return texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
