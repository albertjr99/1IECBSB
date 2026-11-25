/**
 * Ministérios e escalas de serviço — tipos e regras compartilhadas
 * (painel, app web, app das lojas e servidor).
 *
 * Um ministério tem funções (Vocal, Baixo, Projeção…) e membros, alguns
 * líderes. O líder monta escalas: uma data/hora, vagas por função com a
 * pessoa escalada, roteiro e (no louvor) as músicas. Cada escalado confirma
 * ou avisa que não poderá. Séries criam sozinhas as próximas datas.
 */

export type Funcao = { id: string; nome: string };

export type MembroMinisterio = { membroId: string; funcoes: string[]; lider?: boolean };

export type MinisterioApp = {
  id: string;
  nome: string;
  descricao?: string;
  /** chave do ícone (ver ICONES_MINISTERIO) */
  icone: string;
  funcoes: Funcao[];
  membros: MembroMinisterio[];
  /** louvor e afins: escalas têm músicas (com o hinário) */
  repertorio: boolean;
  criadoEm: string;
  /** criado pelos dados de exemplo */
  exemplo?: boolean;
};

export type Resposta = "pendente" | "confirmado" | "recusado";

export type Vaga = {
  id: string;
  funcaoId: string;
  membroId?: string;
  resposta: Resposta;
  /** só o líder vê */
  motivo?: string;
  respondidoEm?: string;
};

export type ItemRoteiro = { id: string; item: string; minutos?: number; obs?: string };

export type Musica = {
  id: string;
  /** número no Salmos e Hinos, quando é do hinário */
  hino?: number;
  titulo: string;
  artista?: string;
  tom?: string;
  /** para ouvir (YouTube, Spotify…) */
  link?: string;
  /** cifra (Cifra Club, PDF…) */
  cifra?: string;
  obs?: string;
};

export type SituacaoEscala = "rascunho" | "publicada";

export type Escala = {
  id: string;
  ministerioId: string;
  titulo: string;
  /** ISO (UTC) */
  inicio: string;
  local?: string;
  observacoes?: string;
  situacao: SituacaoEscala;
  serieId?: string;
  vagas: Vaga[];
  roteiro: ItemRoteiro[];
  musicas: Musica[];
  criadoEm: string;
  alteradoEm: string;
  historico: { em: string; quem: string; o: string }[];
  exemplo?: boolean;
};

export type Frequencia = "semanal" | "quinzenal" | "mensal";

/** Uma escala que se repete. As datas são criadas como rascunho, sem pessoas. */
export type Serie = {
  id: string;
  ministerioId: string;
  titulo: string;
  /** "HH:MM" em Brasília */
  hora: string;
  /** 0 = domingo … 6 = sábado */
  diaSemana: number;
  frequencia: Frequencia;
  /** só na mensal: 1ª, 2ª… semana do mês (5 = última) */
  semanaDoMes?: number;
  /** yyyy-mm-dd */
  desde: string;
  ate?: string;
  local?: string;
  observacoes?: string;
  /** uma vaga por item (a mesma função pode repetir: 2 Vocais) */
  vagas: string[];
  roteiro: ItemRoteiro[];
  /** fixos: funcaoId → membroId, já entram preenchidos */
  fixos?: Record<string, string>;
  /** datas (yyyy-mm-dd) que o líder apagou e não devem voltar */
  excluidas?: string[];
  ativa: boolean;
  exemplo?: boolean;
};

export type Indisponibilidade = {
  id: string;
  membroId: string;
  /** yyyy-mm-dd */
  de: string;
  ate: string;
  /** só os líderes veem */
  motivo?: string;
  criadoEm: string;
  exemplo?: boolean;
};

// ─── Modelos prontos ────────────────────────────────────────────────────────

export const ICONES_MINISTERIO = ["musica", "video", "maos", "crianca", "coracao", "porta", "microfone", "livro", "cafe", "estrela"] as const;

export type ModeloMinisterio = { chave: string; nome: string; icone: string; repertorio: boolean; descricao: string; funcoes: string[] };

export const MODELOS_MINISTERIO: ModeloMinisterio[] = [
  { chave: "louvor", nome: "Louvor", icone: "musica", repertorio: true, descricao: "Música dos cultos.", funcoes: ["Ministro(a)", "Vocal", "Violão", "Guitarra", "Baixo", "Teclado", "Bateria", "Sopro"] },
  { chave: "multimidia", nome: "Multimídia", icone: "video", repertorio: false, descricao: "Som, projeção e transmissão.", funcoes: ["Som", "Projeção", "Transmissão", "Câmera", "Fotografia"] },
  { chave: "recepcao", nome: "Recepção", icone: "porta", repertorio: false, descricao: "Acolhida na entrada e no estacionamento.", funcoes: ["Recepção", "Porteiro(a) de oração", "Estacionamento"] },
  { chave: "infantil", nome: "Ministério Infantil", icone: "crianca", repertorio: false, descricao: "Classes e cuidado das crianças.", funcoes: ["Professor(a)", "Auxiliar", "Berçário"] },
  { chave: "diaconia", nome: "Diaconia", icone: "maos", repertorio: false, descricao: "Serviço nos cultos e na Ceia.", funcoes: ["Diácono(a)", "Santa Ceia", "Ofertório"] },
  { chave: "intercessao", nome: "Intercessão", icone: "coracao", repertorio: false, descricao: "Oração antes e durante os cultos.", funcoes: ["Intercessor(a)"] },
  { chave: "palavra", nome: "Púlpito", icone: "livro", repertorio: false, descricao: "Pregação, dirigente e leituras.", funcoes: ["Pregador(a)", "Dirigente", "Leitura bíblica"] },
  { chave: "cantina", nome: "Cantina e café", icone: "cafe", repertorio: false, descricao: "Café e comunhão depois do culto.", funcoes: ["Cozinha", "Atendimento"] },
  { chave: "vazio", nome: "Outro ministério", icone: "estrela", repertorio: false, descricao: "", funcoes: [] },
];

export const RESPOSTA_ROTULO: Record<Resposta, string> = { pendente: "Aguardando", confirmado: "Confirmado", recusado: "Não poderá" };

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const FREQUENCIA_ROTULO: Record<Frequencia, string> = { semanal: "Toda semana", quinzenal: "A cada 15 dias", mensal: "Uma vez por mês" };

export const SEMANA_DO_MES = ["", "1ª", "2ª", "3ª", "4ª", "Última"];

export const TONS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B", "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bbm", "Bm"];

// ─── Regras ─────────────────────────────────────────────────────────────────

/** Duração considerada para choque de horário entre escalas. */
export const DURACAO_PADRAO_MIN = 150;

/** "yyyy-mm-dd" do instante, em Brasília. */
export function diaDe(iso: string) {
  return new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10);
}

/** Instante (ISO) de uma data e hora de Brasília. */
export const instante = (dia: string, hora: string) => new Date(`${dia}T${hora}:00-03:00`).toISOString();

/** Duração total do roteiro, em minutos. */
export const duracaoRoteiro = (r: ItemRoteiro[]) => r.reduce((s, x) => s + (x.minutos ?? 0), 0);

export function indisponivelEm(lista: Indisponibilidade[], membroId: string, dia: string) {
  return lista.find((i) => i.membroId === membroId && i.de <= dia && dia <= i.ate);
}

/** Escalas (de qualquer ministério) em que o membro já está, perto do mesmo horário. */
export function choques(todas: Escala[], escala: Pick<Escala, "id" | "inicio">, membroId: string) {
  const t = new Date(escala.inicio).getTime();
  return todas.filter((e) => e.id !== escala.id && e.vagas.some((v) => v.membroId === membroId && v.resposta !== "recusado") && Math.abs(new Date(e.inicio).getTime() - t) < DURACAO_PADRAO_MIN * 60_000);
}

/** Próximas datas (yyyy-mm-dd) de uma série a partir de `de` até `ate`, inclusive. */
export function datasDaSerie(s: Serie, de: string, ate: string): string[] {
  const fim = s.ate && s.ate < ate ? s.ate : ate;
  const ini = s.desde > de ? s.desde : de;
  const out: string[] = [];
  const d = new Date(`${ini}T12:00:00Z`);
  const base = new Date(`${s.desde}T12:00:00Z`);
  // primeira ocorrência da série (o dia da semana certo, a partir de "desde")
  while (base.getUTCDay() !== s.diaSemana) base.setUTCDate(base.getUTCDate() + 1);
  for (; d.toISOString().slice(0, 10) <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== s.diaSemana || d < base) continue;
    const dia = d.toISOString().slice(0, 10);
    if (s.frequencia === "quinzenal") {
      const semanas = Math.round((d.getTime() - base.getTime()) / (7 * 864e5));
      if (semanas % 2) continue;
    }
    if (s.frequencia === "mensal") {
      const n = Math.ceil(d.getUTCDate() / 7);
      const ultima = new Date(d.getTime() + 7 * 864e5).getUTCMonth() !== d.getUTCMonth();
      const alvo = s.semanaDoMes ?? 1;
      if (!(alvo === 5 ? ultima : n === alvo)) continue;
    }
    out.push(dia);
  }
  return out;
}

/** Frase da série: "Todo domingo às 10h00", "1º sábado do mês às 19h30". */
export function descreverSerie(s: Pick<Serie, "diaSemana" | "frequencia" | "hora" | "semanaDoMes">) {
  const dia = DIAS_SEMANA[s.diaSemana]!.toLowerCase();
  const h = s.hora.replace(":", "h");
  const fem = s.diaSemana === 0 || s.diaSemana === 6 ? "" : "-feira";
  if (s.frequencia === "semanal") return `${s.diaSemana === 0 || s.diaSemana === 6 ? "Todo" : "Toda"} ${dia}${fem} às ${h}`;
  if (s.frequencia === "quinzenal") return `${s.diaSemana === 0 || s.diaSemana === 6 ? "Um" : "Uma"} ${dia}${fem} sim, outr${s.diaSemana === 0 || s.diaSemana === 6 ? "o" : "a"} não, às ${h}`;
  const n = s.semanaDoMes ?? 1;
  return `${n === 5 ? "Últim" : `${n}`}${s.diaSemana === 0 || s.diaSemana === 6 ? (n === 5 ? "o" : "º") : n === 5 ? "a" : "ª"} ${dia}${fem} do mês às ${h}`;
}

/** Texto pronto para mandar no WhatsApp. */
export function textoDaEscala(
  e: Pick<Escala, "titulo" | "inicio" | "local" | "observacoes" | "vagas" | "musicas" | "roteiro">,
  ministerio: Pick<MinisterioApp, "nome" | "funcoes">,
  nomes: Record<string, string>,
  dataLonga: string,
) {
  const linhas = [`*${ministerio.nome} · ${e.titulo}*`, dataLonga + (e.local ? ` · ${e.local}` : ""), ""];
  for (const f of ministerio.funcoes) {
    const v = e.vagas.filter((x) => x.funcaoId === f.id);
    if (!v.length) continue;
    linhas.push(`*${f.nome}:* ${v.map((x) => (x.membroId ? nomes[x.membroId] ?? "—" : "a definir")).join(", ")}`);
  }
  if (e.musicas.length) {
    linhas.push("", "*Músicas*");
    e.musicas.forEach((m, i) => linhas.push(`${i + 1}. ${m.hino ? `${m.hino} – ` : ""}${m.titulo}${m.tom ? ` (${m.tom})` : ""}${m.link ? `\n   Ouvir: ${m.link}` : ""}${m.cifra ? `\n   Cifra: ${m.cifra}` : ""}`));
  }
  if (e.roteiro.length) {
    linhas.push("", "*Roteiro*");
    e.roteiro.forEach((r) => linhas.push(`• ${r.item}${r.minutos ? ` (${r.minutos} min)` : ""}`));
  }
  if (e.observacoes) linhas.push("", e.observacoes);
  linhas.push("", "Confirme no app da IECB Brasília.");
  return linhas.join("\n");
}

/**
 * Sugere quem preencher nas vagas vazias, com rodízio justo: quem tem a função,
 * não marcou ausência no dia e ainda não está na escala; primeiro quem serviu
 * menos nos últimos 90 dias e há mais tempo. Não mexe nas vagas já preenchidas.
 */
export function sugerirEquipe<V extends { funcaoId: string; membroId?: string }>(
  vagas: V[],
  equipe: { membroId: string; funcoes: string[]; vezes90: number; ultima?: string }[],
  ausentes: Set<string>,
): V[] {
  const usados = new Set(vagas.map((v) => v.membroId).filter(Boolean) as string[]);
  const conta = new Map(equipe.map((p) => [p.membroId, p.vezes90]));
  return vagas.map((v) => {
    if (v.membroId) return v;
    const cand = equipe
      .filter((p) => p.funcoes.includes(v.funcaoId) && !ausentes.has(p.membroId) && !usados.has(p.membroId))
      .sort((a, b) => (conta.get(a.membroId)! - conta.get(b.membroId)!) || (a.ultima ?? "").localeCompare(b.ultima ?? "") || Math.random() - 0.5)[0];
    if (!cand) return v;
    usados.add(cand.membroId);
    conta.set(cand.membroId, conta.get(cand.membroId)! + 1);
    return { ...v, membroId: cand.membroId };
  });
}
