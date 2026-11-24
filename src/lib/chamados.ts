/**
 * Chamados de TI — modelo compartilhado (painel e servidor).
 *
 * Mesmo desenho da Central de chamados da ACIP: quem abre descreve o
 * problema; quem atende (equipe GRATIA, pelo GRATIA HUB) define prioridade e
 * situação. Os nomes de situação são os do Hub — no app da equipe aparece
 * exatamente o mesmo texto. "Enviado" é o único só daqui: o chamado saiu do
 * portal e o Hub ainda não confirmou o recebimento.
 */

export type Situacao =
  | "aberto" | "recebido" | "em_analise" | "em_desenvolvimento"
  | "aguardando_cliente" | "resolvido" | "encerrado" | "cancelado";

export type Prioridade = "baixa" | "media" | "alta" | "critica";

export type Categoria =
  | "erro" | "funcionalidade" | "treinamento" | "melhoria"
  | "duvida" | "login" | "permissoes" | "nova_funcionalidade"
  | "integracao" | "outros";

export type Anexo = { id: string; nome: string; tipo: string; tamanho: number; dados: string };

export type Evento = {
  id: string;
  em: string;
  tipo: "abertura" | "comentario" | "situacao" | "prioridade" | "anexo";
  autor: string;
  /** usuário do painel que escreveu (para a foto); ausente nas mensagens do Hub */
  autorUsuario?: string;
  conteudo: string;
  anexos?: Anexo[];
};

export type Chamado = {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  /** definida pela equipe que atende; ausente enquanto não classificada */
  prioridade?: Prioridade;
  situacao: Situacao;
  autor: string;
  autorUsuario: string;
  criadoEm: string;
  atualizadoEm: string;
  resolvidoEm?: string;
  canceladoEm?: string;
  anexos: Anexo[];
  eventos: Evento[];
  /** identificador no Hub, devolvido no primeiro envio */
  externalId?: string;
  /** último envio confirmado ao Hub; ausente = pendente */
  sincronizadoEm?: string;
};

export const SITUACAO_ROTULO: Record<Situacao, string> = {
  aberto: "Enviado",
  recebido: "Recebido",
  em_analise: "Em análise",
  em_desenvolvimento: "Em atendimento",
  aguardando_cliente: "Aguardando você",
  resolvido: "Concluído",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

/** No Hub, "Aguardando solicitante" (aqui mostramos "Aguardando você"). */
export const SITUACAO_HUB: Record<Situacao, string> = { ...SITUACAO_ROTULO, aguardando_cliente: "Aguardando solicitante" };

export const PRIORIDADE_ROTULO: Record<Prioridade, string> = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };

export const CATEGORIA_ROTULO: Record<Categoria, string> = {
  erro: "Erro do sistema",
  funcionalidade: "Funcionalidade inoperante",
  treinamento: "Solicitação de treinamento",
  melhoria: "Solicitação de melhoria",
  duvida: "Dúvida de utilização",
  login: "Problema com login",
  permissoes: "Problema de permissões",
  nova_funcionalidade: "Nova funcionalidade",
  integracao: "Problema em integração",
  outros: "Outros",
};

export const CATEGORIA_DICA: Record<Categoria, string> = {
  erro: "Algo deu erro ou parou de funcionar.",
  funcionalidade: "Um recurso existe, mas não está funcionando.",
  treinamento: "Quer aprender a usar alguma parte do painel.",
  melhoria: "Algo funciona, mas poderia ser melhor.",
  duvida: "Não sabe como fazer alguma coisa.",
  login: "Não consegue entrar ou esqueceu a senha.",
  permissoes: "Não consegue acessar uma área que deveria.",
  nova_funcionalidade: "Precisa de algo que ainda não existe.",
  integracao: "YouTube, mapas, e-mail ou outro serviço ligado ao site.",
  outros: "Nenhuma das opções acima.",
};

/** Chamados que podem ser abertos por mês (mesma regra da ACIP). */
export const LIMITE_MENSAL = 8;

/** Cancelar só antes do recebimento: depois já há trabalho de atendimento em curso. */
export const podeCancelar = (c: Chamado) => c.situacao === "aberto";
export const fechado = (c: Chamado) => c.situacao === "encerrado" || c.situacao === "cancelado";
export const pendenteDeEnvio = (c: Chamado) => !c.sincronizadoEm || c.atualizadoEm > c.sincronizadoEm;

export function doMes(lista: Chamado[], agora = new Date()) {
  return lista.filter((c) => {
    const d = new Date(c.criadoEm);
    return d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth() && c.situacao !== "cancelado";
  }).length;
}
