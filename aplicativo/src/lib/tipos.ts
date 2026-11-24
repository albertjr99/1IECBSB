/** Tipos que vêm do servidor da igreja (mesmos do site). */
export type Preferencias = { versao: string; letra: number; tema: "claro" | "escuro" | "sistema" };

export type Membro = {
  id: string;
  nome: string;
  celular: string;
  email: string;
  nascimento: string;
  foto?: string;
  situacao: "pendente" | "ativo" | "inativo";
  trocarSenha?: boolean;
  prefs: Preferencias;
  favoritos: { versos: string[]; hinos: number[] };
  ultimaLeitura?: { versao: string; livro: string; capitulo: number };
};

export type Hino = { numero: number; titulo: string; letra: string; autor?: string; secao?: string };

export type TipoContribuicao = "dizimo" | "oferta" | "missoes" | "construcao" | "acao_social";
export const TIPO_CONTRIBUICAO: Record<TipoContribuicao, string> = {
  dizimo: "Dízimo",
  oferta: "Oferta",
  missoes: "Missões",
  construcao: "Construção e manutenção",
  acao_social: "Ação social",
};

export type Contribuicao = { id: string; tipo: TipoContribuicao; valor: number; em: string; situacao: "informada" | "confirmada"; txid: string };

export type Reuniao = { id: string; titulo: string; descricao: string; inicio: string; duracaoMin: number; sala: string; cancelada?: boolean };

export type Inicio = {
  boletim: { data: string; versiculo: string; referencia: string; pastoral: string; autor: string } | null;
  avisos: { titulo: string; texto: string; destaque: boolean }[];
  votacoes: { id: string; titulo: string; situacao: "agendada" | "em_andamento" | "encerrada"; fim: string; inicio: string; token: string; votou: boolean }[];
  reunioes: Reuniao[];
};

export type Cedula =
  | { encontrada: false }
  | {
      encontrada: true;
      titulo: string;
      descricao: string;
      sigilo: "secreta" | "presidencia" | "aberta";
      inicio: string;
      fim: string;
      situacao: "rascunho" | "agendada" | "em_andamento" | "encerrada";
      eleitor: string;
      opcoes: { id: string; texto: string }[];
      jaVotou: boolean;
      resultado: { totalEleitores: number; votaram: number; quorumAtingido: boolean; contagem: { id: string; texto: string; votos: number }[] } | null;
    };

export type Igreja = {
  geral: {
    nome: string; nomeCurto: string; slogan: string; telefone: string; whatsapp: string; email: string; horarioAtendimento: string;
    endereco: { linha1: string; linha2: string; cep: string; consultaMapa: string };
    redes: { instagram: string; youtube: string; facebook: string; spotify: string };
  };
  programacao: { titulo: string; aviso: string; dias: { id: string; dia: string; diaSemana: number; observacao: string; itens: { id: string; titulo: string; detalhe: string; horario: string }[] }[] };
  eventos: { id: string; titulo: string; data: string; dataFim: string; horario: string; local: string; descricao: string }[];
  contribua: { texto: string; versiculo: string; referencia: string; contas: { id?: string; banco: string; agencia: string; conta: string; favorecido?: string }[] };
};

/** Boletim completo (mesma estrutura do site). Só os campos que o app usa. */
export type Boletim = {
  id: string;
  data: string;
  titulo: string;
  versiculo?: string;
  versiculoRef?: string;
  paginas: { id: string; blocos: Bloco[] }[];
};

export type Bloco =
  | { id: string; tipo: "artigo"; rotulo?: string; titulo: string; texto: string; autor?: string }
  | { id: string; tipo: "avisos"; itens: { id: string; titulo: string; texto: string; estilo?: string }[] }
  | { id: string; tipo: "escala"; titulo: string; cabecalho: string[]; linhas: { id: string; celulas: string[] }[]; porteirosTitulo?: string; porteiros: { id: string; horario: string; nome: string }[] }
  | { id: string; tipo: "tabela"; titulo: string; cabecalho: string[]; linhas: { id: string; celulas: string[] }[] }
  | { id: string; tipo: "agenda"; titulo: string; grupos: { id: string; titulo: string; itens: { id: string; data: string; hora: string; texto: string }[] }[] }
  | { id: string; tipo: "aniversariantes"; titulo: string; linhas: { id: string; dia: string; nomes: string }[]; versiculo?: string; referencia?: string }
  | { id: string; tipo: "oficios"; titulo: string; colunas: { id: string; texto: string }[] }
  | { id: string; tipo: "texto"; titulo: string; texto: string }
  | { id: string; tipo: string };
