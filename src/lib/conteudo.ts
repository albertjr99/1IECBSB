/**
 * Modelo de conteúdo do site.
 *
 * Tudo o que aparece no site sai deste objeto — nenhum texto, horário, foto ou
 * contato fica escrito direto nas páginas. O painel edita este objeto; as
 * páginas só o leem. Para acrescentar algo editável: declare o campo aqui,
 * dê um valor padrão em CONTEUDO_PADRAO e crie o campo no editor do painel.
 */

export type Botao = { rotulo: string; link: string };

export type ItemMenu = { id: string; rotulo: string; para: string; visivel: boolean };

export type Atividade = {
  id: string;
  dia: string;
  titulo: string;
  horarios: string[];
  local: string;
  descricao: string;
  cor: "azul" | "vermelho" | "claro";
  rotuloLink: string;
  link: string;
};

export type Evento = {
  id: string;
  titulo: string;
  /** yyyy-mm-dd */
  data: string;
  dataFim: string;
  horario: string;
  local: string;
  descricao: string;
  imagem: string;
  rotuloLink: string;
  link: string;
  /** Mostra o aviso em destaque (janela) ao abrir o site, até a data passar. */
  destaque: boolean;
  publicado: boolean;
};

export type Membro = { id: string; nome: string; cargo: string; foto: string; bio: string };
export type GrupoLideranca = { id: string; nome: string; membros: Membro[] };

export type Ministerio = {
  id: string;
  nome: string;
  descricao: string;
  imagem: string;
  lider: string;
  quando: string;
  contato: string;
};

export type ItemFe = { id: string; titulo: string; texto: string };

export type FiltroVideo = { id: string; rotulo: string; playlistId: string };

export type ContaBancaria = {
  id: string;
  banco: string;
  agencia: string;
  conta: string;
  favorecido: string;
  documento: string;
};

export type Conteudo = {
  geral: {
    nome: string;
    nomeCurto: string;
    slogan: string;
    descricaoSite: string;
    telefone: string;
    whatsapp: string;
    email: string;
    horarioAtendimento: string;
    endereco: {
      linha1: string;
      linha2: string;
      cep: string;
      /** O que o Google Maps procura. Pode ser o endereço ou "lat,lng". */
      consultaMapa: string;
    };
    redes: { instagram: string; youtube: string; facebook: string; spotify: string };
  };
  aparencia: {
    corPrimaria: string;
    corDestaque: string;
    corFundo: string;
  };
  menu: ItemMenu[];
  inicio: {
    hero: {
      sobretitulo: string;
      titulo: string;
      subtitulo: string;
      imagem: string;
      botoes: Botao[];
    };
    boasVindas: { titulo: string; texto: string; imagem: string; rotuloBotao: string; link: string };
    versiculo: { texto: string; referencia: string };
    mostrar: {
      programacao: boolean;
      boasVindas: boolean;
      mensagens: boolean;
      eventos: boolean;
      versiculo: boolean;
      contribua: boolean;
      localizacao: boolean;
    };
  };
  programacao: { titulo: string; subtitulo: string; aviso: string; atividades: Atividade[] };
  eventos: { titulo: string; subtitulo: string; itens: Evento[] };
  sobre: {
    titulo: string;
    introducao: string;
    historiaTitulo: string;
    historia: string;
    imagem: string;
    missao: string;
    visao: string;
    valores: string[];
    feTitulo: string;
    feIntroducao: string;
    fe: ItemFe[];
  };
  lideranca: { titulo: string; introducao: string; grupos: GrupoLideranca[] };
  ministerios: { titulo: string; introducao: string; itens: Ministerio[] };
  mensagens: {
    titulo: string;
    subtitulo: string;
    canal: string;
    esconderCurtos: boolean;
    filtros: FiltroVideo[];
  };
  contribua: {
    titulo: string;
    texto: string;
    versiculo: string;
    referencia: string;
    pixChave: string;
    pixTipo: string;
    pixFavorecido: string;
    contas: ContaBancaria[];
  };
  contato: { titulo: string; texto: string };
  rodape: { texto: string };
};

export const CONTEUDO_PADRAO: Conteudo = {
  geral: {
    nome: "Primeira Igreja Evangélica Congregacional de Brasília",
    nomeCurto: "1ª IEC Brasília",
    slogan: "Uma igreja centrada em Cristo, na Palavra e no próximo.",
    descricaoSite:
      "Primeira Igreja Evangélica Congregacional de Brasília — cultos, estudos bíblicos, mensagens e programação.",
    telefone: "",
    whatsapp: "",
    email: "",
    horarioAtendimento: "",
    endereco: {
      linha1: "EQS 415 Sul",
      linha2: "Asa Sul, Brasília — DF",
      cep: "",
      consultaMapa: "Primeira Igreja Evangélica Congregacional de Brasília, EQS 415 Sul, Brasília - DF",
    },
    redes: {
      instagram: "https://www.instagram.com/1iecbsb/",
      youtube: "https://www.youtube.com/@iecbsb",
      facebook: "",
      spotify: "",
    },
  },
  aparencia: {
    corPrimaria: "#00416B",
    corDestaque: "#C1242C",
    corFundo: "#F7F5F0",
  },
  menu: [
    { id: "inicio", rotulo: "Início", para: "/", visivel: true },
    { id: "sobre", rotulo: "A Igreja", para: "/sobre", visivel: true },
    { id: "lideranca", rotulo: "Liderança", para: "/lideranca", visivel: true },
    { id: "ministerios", rotulo: "Ministérios", para: "/ministerios", visivel: true },
    { id: "programacao", rotulo: "Programação", para: "/programacao", visivel: true },
    { id: "mensagens", rotulo: "Mensagens", para: "/mensagens", visivel: true },
    { id: "contato", rotulo: "Contato", para: "/contato", visivel: true },
    { id: "contribua", rotulo: "Contribua", para: "/contribua", visivel: true },
  ],
  inicio: {
    hero: {
      sobretitulo: "Bem-vindo à",
      titulo: "Primeira Igreja Evangélica Congregacional de Brasília",
      subtitulo: "Venha adorar a Deus conosco, crescer na Palavra e viver em comunhão.",
      imagem: "",
      botoes: [
        { rotulo: "Horários dos cultos", link: "/programacao" },
        { rotulo: "Assistir mensagens", link: "/mensagens" },
      ],
    },
    boasVindas: {
      titulo: "Uma família em Cristo, no coração de Brasília",
      texto:
        "Somos uma igreja que crê na suficiência das Escrituras e no evangelho da graça de Jesus Cristo. Aqui você encontra um lugar para adorar, aprender a Palavra e servir junto com outras famílias.\n\nSeja você visitante ou membro, será uma alegria recebê-lo.",
      imagem: "",
      rotuloBotao: "Conheça a igreja",
      link: "/sobre",
    },
    versiculo: {
      texto:
        "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.",
      referencia: "João 3.16",
    },
    mostrar: {
      programacao: true,
      boasVindas: true,
      mensagens: true,
      eventos: true,
      versiculo: true,
      contribua: true,
      localizacao: true,
    },
  },
  programacao: {
    titulo: "Programação semanal",
    subtitulo: "Encontros da semana para adorar, aprender e caminhar juntos.",
    aviso: "Horários de exemplo — atualize pelo painel.",
    atividades: [
      {
        id: "culto-dominical",
        dia: "Domingo",
        titulo: "Culto Dominical",
        horarios: ["10h00", "19h00"],
        local: "Templo — EQS 415 Sul",
        descricao: "Culto de adoração e pregação da Palavra.",
        cor: "azul",
        rotuloLink: "Como chegar",
        link: "/#localizacao",
      },
      {
        id: "ebd",
        dia: "Domingo",
        titulo: "Escola Bíblica Dominical",
        horarios: ["09h00"],
        local: "Salas de estudo",
        descricao: "Classes para todas as idades.",
        cor: "claro",
        rotuloLink: "",
        link: "",
      },
      {
        id: "estudo-biblico",
        dia: "Quarta-feira",
        titulo: "Estudo Bíblico e Oração",
        horarios: ["20h00"],
        local: "Templo",
        descricao: "Estudo das Escrituras e momento de intercessão.",
        cor: "vermelho",
        rotuloLink: "Ver estudos",
        link: "/mensagens",
      },
    ],
  },
  eventos: {
    titulo: "Próximos eventos",
    subtitulo: "Congressos, conferências e encontros especiais.",
    itens: [],
  },
  sobre: {
    titulo: "A Igreja",
    introducao:
      "Conheça a nossa história, aquilo em que cremos e o propósito que nos move.",
    historiaTitulo: "Nossa história",
    historia:
      "Escreva aqui a história da igreja: quando e como começou, quem foram os fundadores e os marcos da caminhada até hoje.\n\nEste texto é editado no painel, em A Igreja.",
    imagem: "",
    missao: "Glorificar a Deus, anunciando o evangelho de Cristo e edificando vidas pela Palavra.",
    visao: "Ser uma igreja bíblica, acolhedora e missionária em Brasília e além.",
    valores: ["Centralidade das Escrituras", "Adoração", "Comunhão", "Missão", "Serviço"],
    feTitulo: "O que cremos",
    feIntroducao:
      "Somos uma igreja evangélica congregacional. Estes são alguns pontos centrais da nossa fé.",
    fe: [
      { id: "escrituras", titulo: "As Escrituras", texto: "A Bíblia é a Palavra de Deus, inspirada, infalível e suficiente para a fé e a prática." },
      { id: "deus", titulo: "Deus", texto: "Há um só Deus, eternamente existente em três pessoas: Pai, Filho e Espírito Santo." },
      { id: "cristo", titulo: "Jesus Cristo", texto: "Jesus é verdadeiro Deus e verdadeiro homem, que morreu pelos nossos pecados e ressuscitou." },
      { id: "salvacao", titulo: "A salvação", texto: "A salvação é pela graça, mediante a fé em Cristo, e não por obras." },
      { id: "igreja", titulo: "A Igreja", texto: "A igreja é o corpo de Cristo, chamada a adorar, edificar-se e anunciar o evangelho." },
    ],
  },
  lideranca: {
    titulo: "Liderança",
    introducao: "Pessoas chamadas para servir e cuidar da igreja.",
    grupos: [
      {
        id: "pastores",
        nome: "Pastores",
        membros: [
          { id: "pastor-1", nome: "Nome do pastor", cargo: "Pastor titular", foto: "", bio: "" },
        ],
      },
      { id: "diaconia", nome: "Diaconia", membros: [] },
    ],
  },
  ministerios: {
    titulo: "Ministérios",
    introducao: "Há um lugar para você servir e crescer. Conheça os ministérios da igreja.",
    itens: [
      { id: "louvor", nome: "Louvor", descricao: "Conduz a igreja na adoração com música.", imagem: "", lider: "", quando: "", contato: "" },
      { id: "infantil", nome: "Ministério Infantil", descricao: "Ensino da Palavra para as crianças.", imagem: "", lider: "", quando: "", contato: "" },
      { id: "jovens", nome: "Jovens", descricao: "Comunhão e discipulado para a juventude.", imagem: "", lider: "", quando: "", contato: "" },
      { id: "mulheres", nome: "Mulheres", descricao: "Encontros, estudos e congressos.", imagem: "", lider: "", quando: "", contato: "" },
    ],
  },
  mensagens: {
    titulo: "Mensagens",
    subtitulo: "Cultos, estudos bíblicos e séries da igreja no YouTube.",
    canal: "iecbsb",
    esconderCurtos: true,
    filtros: [
      { id: "cultos", rotulo: "Cultos Dominicais", playlistId: "PLycyoK7f40SCkZ0dtOxC-EtGvdFQtD-TG" },
      { id: "estudos", rotulo: "Estudos Bíblicos", playlistId: "PLycyoK7f40SCDR3BaBZ5lxv9ap4cSoMv8" },
      { id: "ebd", rotulo: "EBD", playlistId: "PLycyoK7f40SBuqAGNRrSRsjcI9dRG2J_r" },
      { id: "atos", rotulo: "Atos dos Apóstolos", playlistId: "PLycyoK7f40SAbRPCXpokc15e2CrP998q8" },
      { id: "corintios", rotulo: "Coríntios", playlistId: "PLycyoK7f40SAlfwjagywAZo_qG101Daz1" },
      { id: "aconselhamento", rotulo: "Aconselhamento Bíblico", playlistId: "PLycyoK7f40SDDJnq3UO4ITYjRs7PE89BO" },
      { id: "jovem", rotulo: "Culto Jovem", playlistId: "PLycyoK7f40SDNbDhEhJFp23TfJqQLw1FG" },
      { id: "eventos", rotulo: "Eventos", playlistId: "PLycyoK7f40SAPd8hvH0QPR7KhS3Y5qwEL" },
    ],
  },
  contribua: {
    titulo: "Dízimos e ofertas",
    texto:
      "Sua contribuição sustenta o culto, o ensino, a ação social e as missões da igreja. Obrigado por participar com generosidade.",
    versiculo: "Cada um contribua segundo propôs no seu coração, não com tristeza ou por necessidade; porque Deus ama ao que dá com alegria.",
    referencia: "2 Coríntios 9.7",
    pixChave: "",
    pixTipo: "CNPJ",
    pixFavorecido: "",
    contas: [],
  },
  contato: {
    titulo: "Fale conosco",
    texto: "Quer conhecer a igreja, pedir oração ou tirar uma dúvida? Mande uma mensagem.",
  },
  rodape: { texto: "Igreja, corpo de Cristo em Brasília." },
};

/**
 * Completa um conteúdo salvo com os campos que o modelo ganhou depois.
 * Sem isto, um campo novo no código quebraria a leitura de um conteúdo antigo.
 */
export function completarConteudo(salvo: unknown): Conteudo {
  return mesclar(CONTEUDO_PADRAO, salvo) as Conteudo;
}

function mesclar(padrao: unknown, valor: unknown): unknown {
  if (valor === undefined || valor === null) return structuredClone(padrao);
  if (Array.isArray(padrao)) return Array.isArray(valor) ? valor : structuredClone(padrao);
  if (typeof padrao === "object" && padrao !== null) {
    if (typeof valor !== "object" || Array.isArray(valor)) return structuredClone(padrao);
    const saida: Record<string, unknown> = {};
    for (const k of Object.keys(padrao)) {
      saida[k] = mesclar((padrao as Record<string, unknown>)[k], (valor as Record<string, unknown>)[k]);
    }
    return saida;
  }
  return typeof valor === typeof padrao ? valor : padrao;
}

export function novoId(prefixo = "i") {
  return `${prefixo}-${Math.random().toString(36).slice(2, 9)}`;
}
