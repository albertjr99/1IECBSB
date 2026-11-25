/**
 * Datas e horas do app: sempre no horário de Brasília (America/Sao_Paulo, UTC−3,
 * sem horário de verão desde 2019) e no formato brasileiro dd/mm/aaaa,
 * qualquer que seja o fuso configurado no celular.
 */
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const OFFSET_MS = -3 * 60 * 60_000;
const p2 = (n: number) => String(n).padStart(2, "0");

/** Partes da data/hora em Brasília para um instante (ISO, número ou Date). */
export function emBrasilia(t: string | number | Date = Date.now()) {
  const d = new Date(new Date(t).getTime() + OFFSET_MS);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate(), hora: d.getUTCHours(), minuto: d.getUTCMinutes(), semana: d.getUTCDay() };
}

/** "aaaa-mm-dd" de hoje em Brasília. */
export function hojeBrasilia() {
  const b = emBrasilia();
  return `${b.ano}-${p2(b.mes)}-${p2(b.dia)}`;
}

/** Data de calendário "aaaa-mm-dd" → "dd/mm/aaaa". */
export function dataBR(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

/** "aaaa-mm-dd" → "domingo, 22/11/2026". */
export function dataComDia(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return iso;
  return `${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]}, ${dataBR(iso)}`;
}

/** Compatível com as telas antigas: agora também em dd/mm/aaaa. */
export const dataPorExtenso = dataComDia;
export const diaEMes = dataBR;

/** Instante → "qua, 25/11/2026 · 07h40" (horário de Brasília). */
export function quando(iso: string) {
  const b = emBrasilia(iso);
  return `${DIAS_CURTOS[b.semana]}, ${p2(b.dia)}/${p2(b.mes)}/${b.ano} · ${p2(b.hora)}h${p2(b.minuto)}`;
}

/** Instante → "25/11/2026" (data em Brasília). */
export function dataDoInstante(iso: string) {
  const b = emBrasilia(iso);
  return `${p2(b.dia)}/${p2(b.mes)}/${b.ano}`;
}

export const reais = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const soDigitos = (t: string) => (t ?? "").replace(/\D/g, "");
export function primeiroNome(nome: string) {
  return nome.replace(/^(pr|pb|dc|dca|sem|ir|irmã|irmão)\.?\s+/i, "").split(/\s+/)[0] ?? nome;
}
export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1]![0] : "")).toUpperCase();
}
export function saudacao() {
  const h = emBrasilia().hora;
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
export function mascaraCelular(t: string) {
  const d = soDigitos(t).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
/** Sala aberta 15 min antes até o fim previsto. */
export function salaAberta(r: { inicio: string; duracaoMin: number; cancelada?: boolean }, agora = Date.now()) {
  const ini = new Date(r.inicio).getTime();
  return !r.cancelada && agora >= ini - 15 * 60_000 && agora <= ini + r.duracaoMin * 60_000;
}
