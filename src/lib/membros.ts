/** Membros do app — tipos compartilhados (app, painel e servidor). */

export type SituacaoMembro = "pendente" | "ativo" | "inativo";

export type Preferencias = {
  versao: string;
  /** tamanho da letra na leitura: 1 (menor) a 5 (maior) */
  letra: number;
  tema: "claro" | "escuro" | "sistema";
};

export type Membro = {
  id: string;
  nome: string;
  celular: string;
  email: string;
  /** yyyy-mm-dd */
  nascimento: string;
  foto?: string;
  situacao: SituacaoMembro;
  hash: string;
  trocarSenha?: boolean;
  criadoEm: string;
  aprovadoEm?: string;
  aprovadoPor?: string;
  prefs: Preferencias;
  /** versículos ("JHN.3.16") e hinos (número) guardados */
  favoritos: { versos: string[]; hinos: number[] };
  ultimaLeitura?: { versao: string; livro: string; capitulo: number };
};

export type MembroPublico = Omit<Membro, "hash">;

export const PREFS_PADRAO: Preferencias = { versao: "blivre", letra: 3, tema: "sistema" };

export const SITUACAO_MEMBRO_ROTULO: Record<SituacaoMembro, string> = { pendente: "Aguardando aprovação", ativo: "Ativo", inativo: "Inativo" };

export const soDigitos = (t: string) => (t ?? "").replace(/\D/g, "");

export function formatarCelular(t: string) {
  const d = soDigitos(t).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

export function primeiroNome(nome: string) {
  return nome.replace(/^(pr|pb|dc|dca|sem|ir|irmã|irmão)\.?\s+/i, "").split(/\s+/)[0] ?? nome;
}

// ─── Hinário ─────────────────────────────────────────────────────────────────

export type Hino = {
  numero: number;
  titulo: string;
  /** estrofes separadas por linha em branco; coro marcado com "Coro:" na primeira linha */
  letra: string;
  autor?: string;
  /** tema/seção do hinário (ex.: Adoração, Ceia) */
  secao?: string;
};

// ─── Contribuições ───────────────────────────────────────────────────────────

export type TipoContribuicao = "dizimo" | "oferta" | "missoes" | "construcao" | "acao_social";

export const TIPO_CONTRIBUICAO: Record<TipoContribuicao, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
  missoes: "Missões",
  construcao: "Construção e manutenção",
  acao_social: "Ação social",
};

export type Contribuicao = {
  id: string;
  membroId: string;
  membroNome: string;
  tipo: TipoContribuicao;
  /** em centavos */
  valor: number;
  em: string;
  /** "informada" pelo membro; "confirmada" pela tesouraria ao ver no extrato */
  situacao: "informada" | "confirmada";
  confirmadaPor?: string;
  confirmadaEm?: string;
  txid: string;
};

export const reais = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Reuniões online ─────────────────────────────────────────────────────────

export type Reuniao = {
  id: string;
  titulo: string;
  descricao: string;
  /** ISO */
  inicio: string;
  duracaoMin: number;
  /** nome da sala de vídeo (Jitsi) */
  sala: string;
  criadaPor: string;
  criadaEm: string;
  presencas: { membroId: string; nome: string; em: string }[];
  cancelada?: boolean;
};

export const linkDaSala = (sala: string, nome?: string) =>
  `https://meet.jit.si/${encodeURIComponent(sala)}${nome ? `#userInfo.displayName=${encodeURIComponent(JSON.stringify(nome))}&config.prejoinPageEnabled=false` : ""}`;

/** Pode entrar a partir de 15 minutos antes do início até o fim previsto. */
export function salaAberta(r: Reuniao, agora = Date.now()) {
  const ini = new Date(r.inicio).getTime();
  return !r.cancelada && agora >= ini - 15 * 60_000 && agora <= ini + r.duracaoMin * 60_000;
}
