const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function dataPorExtenso(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return iso;
  return `${d} de ${MESES[m - 1]} de ${a}`;
}
export function diaEMes(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} de ${MESES[(m ?? 1) - 1]}`;
}
export function quando(iso: string) {
  const d = new Date(iso);
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, "0") : ""}`;
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
  const h = new Date().getHours();
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
