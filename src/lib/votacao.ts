/** Votação Online — tipos e regras compartilhadas entre o painel e a cédula. */

export type TipoVotacao = "sim_nao" | "favor_contra_abstencao" | "personalizada";
export type Sigilo = "secreta" | "presidencia" | "aberta";

export type Opcao = { id: string; texto: string };

export type Eleitor = {
  id: string;
  nome: string;
  contato: string;
  /** Link individual de voto: quem tem o link vota uma única vez. */
  token: string;
};

export type Votacao = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoVotacao;
  opcoes: Opcao[];
  sigilo: Sigilo;
  /** ISO */
  inicio: string;
  fim: string;
  /** Votos mínimos para a votação valer (0 = sem quórum). */
  quorum: number;
  encerrarQuandoTodosVotarem: boolean;
  eleitores: Eleitor[];
  rascunho: boolean;
  encerradaEm?: string;
  encerradaPor?: string;
  criadaPor: string;
  criadaEm: string;
  historico: { em: string; autor: string; acao: string }[];
};

export type Situacao = "rascunho" | "agendada" | "em_andamento" | "encerrada";

export const SITUACAO_ROTULO: Record<Situacao, string> = {
  rascunho: "Rascunho",
  agendada: "Agendada",
  em_andamento: "Em andamento",
  encerrada: "Encerrada",
};

export const TIPO_ROTULO: Record<TipoVotacao, string> = {
  sim_nao: "Sim ou não",
  favor_contra_abstencao: "A favor, contra ou abstenção",
  personalizada: "Opções personalizadas",
};

export const SIGILO_ROTULO: Record<Sigilo, string> = {
  secreta: "Voto secreto",
  presidencia: "Voto reservado à presidência",
  aberta: "Voto aberto",
};

export const SIGILO_DESC: Record<Sigilo, string> = {
  secreta: "Ninguém sabe em que cada pessoa votou — nem quem administra o painel. Só se sabe quem já votou.",
  presidencia: "O resultado é geral; o voto de cada pessoa só aparece para quem administra o painel.",
  aberta: "O voto de cada pessoa aparece no resultado.",
};

export function opcoesDa(v: Pick<Votacao, "tipo" | "opcoes">): Opcao[] {
  if (v.tipo === "sim_nao") return [{ id: "sim", texto: "Sim" }, { id: "nao", texto: "Não" }];
  if (v.tipo === "favor_contra_abstencao") return [{ id: "favor", texto: "A favor" }, { id: "contra", texto: "Contra" }, { id: "abstencao", texto: "Abstenção" }];
  return v.opcoes;
}

export function situacaoDa(v: Pick<Votacao, "rascunho" | "inicio" | "fim" | "encerradaEm">, agora = Date.now()): Situacao {
  if (v.rascunho) return "rascunho";
  if (v.encerradaEm || agora >= new Date(v.fim).getTime()) return "encerrada";
  if (agora < new Date(v.inicio).getTime()) return "agendada";
  return "em_andamento";
}

export type Resultado = {
  totalEleitores: number;
  votaram: number;
  quorumAtingido: boolean;
  contagem: { id: string; texto: string; votos: number }[];
  /** Só quando o sigilo permite identificar o voto. */
  nominal?: { nome: string; opcao: string; em: string }[];
  /** Quem já votou (sem dizer em quê). */
  presenca: { eleitorId: string; em: string }[];
};
