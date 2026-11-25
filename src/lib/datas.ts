/**
 * Datas e horas de todo o sistema no horário de Brasília (America/Sao_Paulo, UTC−3)
 * e no formato brasileiro dd/mm/aaaa — no navegador de qualquer fuso e no servidor (UTC).
 */
export const FUSO = "America/Sao_Paulo";
const p2 = (n: number) => String(n).padStart(2, "0");
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" });
const SEMANA_EN: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Partes da data/hora em Brasília de um instante. */
export function emBrasilia(t: string | number | Date = Date.now()) {
  const o: Record<string, string> = {};
  for (const x of fmt.formatToParts(new Date(t))) o[x.type] = x.value;
  return { ano: Number(o.year), mes: Number(o.month), dia: Number(o.day), hora: Number(o.hour) % 24, minuto: Number(o.minute), semana: SEMANA_EN[o.weekday!] ?? 0 };
}

/** "aaaa-mm-dd" de hoje (ou de um instante) em Brasília. */
export function diaBrasilia(t: string | number | Date = Date.now()) {
  const b = emBrasilia(t);
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

/** Instante → "25/11/2026". */
export function data(t: string | number | Date) {
  const b = emBrasilia(t);
  return `${p2(b.dia)}/${p2(b.mes)}/${b.ano}`;
}
/** Instante → "07h40". */
export function hora(t: string | number | Date) {
  const b = emBrasilia(t);
  return `${p2(b.hora)}h${p2(b.minuto)}`;
}
/** Instante → "25/11/2026 às 07h40". */
export const dataHora = (t: string | number | Date) => `${data(t)} às ${hora(t)}`;
/** Instante → "qua, 25/11/2026 · 07h40". */
export function quando(t: string | number | Date) {
  const b = emBrasilia(t);
  return `${DIAS_CURTOS[b.semana]}, ${data(t)} · ${hora(t)}`;
}
/** Instante → "quarta, 25/11/2026 às 07h40". */
export function quandoLongo(t: string | number | Date) {
  const b = emBrasilia(t);
  return `${DIAS[b.semana]}, ${dataHora(t)}`;
}

/** Campo datetime-local (digitado em horário de Brasília) → ISO. */
export const localParaIso = (v: string) => new Date(`${v.length === 16 ? `${v}:00` : v}-03:00`).toISOString();
/** ISO → valor para campo datetime-local em horário de Brasília. */
export function isoParaLocal(iso: string) {
  const b = emBrasilia(iso);
  return `${b.ano}-${p2(b.mes)}-${p2(b.dia)}T${p2(b.hora)}:${p2(b.minuto)}`;
}
