/**
 * Ministérios e escalas — armazenamento e regras do lado do servidor.
 * Chaves: "ministerios-app", "escalas", "escalas-series", "indisponibilidades".
 */
import { gravar, ler } from "./armazem";
import { novoId } from "./membros";
import { datasDaSerie, diaDe, instante, type Escala, type Indisponibilidade, type MinisterioApp, type Serie } from "@/lib/escalas";

export { novoId };

export async function lerMinisterios(): Promise<MinisterioApp[]> {
  return ((await ler<MinisterioApp[]>("ministerios-app")) ?? []).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
export async function gravarMinisterios(l: MinisterioApp[]) { await gravar("ministerios-app", l); }

export async function lerSeries(): Promise<Serie[]> { return (await ler<Serie[]>("escalas-series")) ?? []; }
export async function gravarSeries(l: Serie[]) { await gravar("escalas-series", l); }

export async function lerIndisponibilidades(): Promise<Indisponibilidade[]> {
  const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  return ((await ler<Indisponibilidade[]>("indisponibilidades")) ?? []).filter((i) => i.ate >= hoje);
}
export async function gravarIndisponibilidades(l: Indisponibilidade[]) { await gravar("indisponibilidades", l); }

const DIAS_A_FRENTE = 70;

async function lerEscalasBrutas(): Promise<Escala[]> { return (await ler<Escala[]>("escalas")) ?? []; }

export async function gravarEscalas(l: Escala[]) {
  // guarda um ano de histórico
  const limite = Date.now() - 400 * 864e5;
  await gravar("escalas", l.filter((e) => new Date(e.inicio).getTime() > limite).sort((a, b) => a.inicio.localeCompare(b.inicio)));
}

/** Cria (como rascunho) as próximas datas das séries ativas que ainda não existem. */
export function completarSeries(escalas: Escala[], series: Serie[], ministerios: MinisterioApp[]) {
  const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const ate = new Date(Date.now() + DIAS_A_FRENTE * 864e5).toISOString().slice(0, 10);
  let criadas = 0;
  for (const s of series) {
    if (!s.ativa || !ministerios.some((m) => m.id === s.ministerioId)) continue;
    const dias = new Set(escalas.filter((e) => e.serieId === s.id).map((e) => diaDe(e.inicio)));
    for (const dia of datasDaSerie(s, hoje, ate)) {
      if (dias.has(dia) || (s.excluidas ?? []).includes(dia)) continue;
      // já existe uma escala do ministério nesse dia e horário (feita à mão): passa a ser desta repetição
      const mesma = escalas.find((e) => e.ministerioId === s.ministerioId && !e.serieId && e.inicio === instante(dia, s.hora));
      if (mesma) { mesma.serieId = s.id; criadas++; continue; }
      const agora = new Date().toISOString();
      escalas.push({
        id: novoId("esc"), ministerioId: s.ministerioId, titulo: s.titulo, inicio: instante(dia, s.hora), local: s.local, observacoes: s.observacoes,
        situacao: "rascunho", serieId: s.id,
        vagas: s.vagas.map((funcaoId) => ({ id: novoId("v"), funcaoId, resposta: "pendente" as const })),
        roteiro: s.roteiro.map((r) => ({ ...r, id: novoId("r") })), musicas: [], criadoEm: agora, alteradoEm: agora,
        historico: [{ em: agora, quem: "Série", o: "Criada pela repetição" }],
      });
      // pessoas fixas entram já escaladas (uma por função)
      const e = escalas[escalas.length - 1]!;
      for (const [funcaoId, membroId] of Object.entries(s.fixos ?? {})) {
        const v = e.vagas.find((x) => x.funcaoId === funcaoId && !x.membroId);
        if (v) v.membroId = membroId;
      }
      criadas++;
    }
  }
  return criadas;
}

/** Todas as escalas, já com as datas das séries completadas. */
export async function lerEscalas(): Promise<Escala[]> {
  const l = await lerEscalasBrutas();
  const series = await lerSeries();
  if (series.some((s) => s.ativa)) {
    const n = completarSeries(l, series, await lerMinisterios());
    if (n) await gravarEscalas(l);
  }
  return l.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export const ehLider = (m: MinisterioApp, membroId: string) => m.membros.some((x) => x.membroId === membroId && x.lider);
export const participa = (m: MinisterioApp, membroId: string) => m.membros.some((x) => x.membroId === membroId);

/** Exige que o membro seja líder do ministério (ou devolve erro claro). */
export async function exigirLider(ministerioId: string, membroId: string) {
  const ms = await lerMinisterios();
  const m = ms.find((x) => x.id === ministerioId);
  if (!m) throw new Error("Ministério não encontrado.");
  if (!ehLider(m, membroId)) throw new Error("Só a liderança do ministério pode fazer isso.");
  return { m, ms };
}
