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

export type ItemAgenda = { id: string; titulo: string; detalhe: string; horario: string };

/** Um dia da agenda semanal (um cartão do carrossel). */
export type DiaAgenda = {
  id: string;
  dia: string;
  /** 0 = domingo … 6 = sábado; marca o cartão "Hoje". -1 = nenhum. */
  diaSemana: number;
  itens: ItemAgenda[];
  observacao: string;
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

/** Ícones oficiais da marca (Manual, 06 · Grafismos), em public/marca/icones. */
export const ICONES_MARCA = [
  { valor: "cultos", rotulo: "Cultos (cruz)" },
  { valor: "louvor", rotulo: "Louvor" },
  { valor: "kids", rotulo: "Kids" },
  { valor: "jovens", rotulo: "Jovens" },
  { valor: "grupos", rotulo: "Grupos" },
  { valor: "missoes", rotulo: "Missões" },
  { valor: "ofertas", rotulo: "Ofertas / ação social" },
  { valor: "agenda", rotulo: "Agenda" },
  { valor: "contato", rotulo: "Contato" },
  { valor: "sobre", rotulo: "Sobre" },
] as const;

/** Ícone do ministério: o escolhido no painel ou um palpite pelo nome. */
export function iconeMinisterio(m: { icone?: string; id: string; nome: string }): string {
  if (m.icone) return m.icone;
  const n = `${m.id} ${m.nome}`.toLowerCase();
  if (/louvor|m[uú]sica|coral/.test(n)) return "louvor";
  if (/infantil|crian|kids|junior/.test(n)) return "kids";
  if (/jove|adolesc/.test(n)) return "jovens";
  if (/miss/.test(n)) return "missoes";
  if (/social|assist|diacon/.test(n)) return "ofertas";
  return "grupos";
}

export type Ministerio = {
  id: string;
  nome: string;
  descricao: string;
  icone?: string;
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
  programacao: {
    titulo: string;
    subtitulo: string;
    aviso: string;
    /** Cartão de abertura do carrossel */
    capaTitulo: string;
    capaSubtitulo: string;
    capaImagem: string;
    dias: DiaAgenda[];
  };
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
    slogan: "Filiada à União das Igrejas Evangélicas Congregacionais do Brasil – UIECB",
    descricaoSite:
      "Primeira Igreja Evangélica Congregacional de Brasília — cultos, estudos bíblicos, mensagens e programação.",
    telefone: "(61) 3346-7866",
    whatsapp: "",
    email: "",
    horarioAtendimento: "",
    endereco: {
      linha1: "SHCS SQ 415 – Templo",
      linha2: "Asa Sul, Brasília — DF",
      cep: "70298-400",
      consultaMapa: "Primeira Igreja Evangélica Congregacional de Brasília, SHCS SQ 415, Asa Sul, Brasília - DF, 70298-400",
    },
    redes: {
      instagram: "https://www.instagram.com/1iecbsb/",
      youtube: "https://www.youtube.com/@iecbsb",
      facebook: "",
      spotify: "",
    },
  },
  aparencia: {
    corPrimaria: "#00436F",
    corDestaque: "#CC2127",
    corFundo: "#FFFFFF",
  },
  menu: [
    { id: "inicio", rotulo: "Início", para: "/", visivel: true },
    { id: "sobre", rotulo: "A Igreja", para: "/sobre", visivel: true },
    { id: "lideranca", rotulo: "Liderança", para: "/lideranca", visivel: true },
    { id: "ministerios", rotulo: "Ministérios", para: "/ministerios", visivel: true },
    { id: "programacao", rotulo: "Programação", para: "/programacao", visivel: true },
    { id: "mensagens", rotulo: "Mensagens", para: "/mensagens", visivel: true },
    { id: "boletim", rotulo: "Boletim", para: "/boletins", visivel: true },
    { id: "contato", rotulo: "Contato", para: "/contato", visivel: true },
    { id: "contribua", rotulo: "Contribua", para: "/contribua", visivel: true },
  ],
  inicio: {
    hero: {
      sobretitulo: "Bem-vindo à sua casa em Brasília",
      titulo: "Uma igreja para caminhar junto.",
      subtitulo: "Somos uma família de fé que se reúne para adorar a Deus, ouvir a Palavra e servir a cidade com amor.",
      imagem: "",
      botoes: [
        { rotulo: "Planeje sua visita", link: "/contato" },
        { rotulo: "Assista online", link: "/mensagens" },
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
    titulo: "Agenda da semana",
    subtitulo: "Cultos, Escola Bíblica, estudos, oração e encontros. Venha adorar a Deus conosco!",
    aviso: "Programação sujeita a alterações. Confira o boletim da semana.",
    capaTitulo: "Conheça os nossos horários",
    capaSubtitulo: "Cultos · EBD · Estudos · Oração · Eventos",
    capaImagem: "",
    dias: [
      { id: "domingo", dia: "Domingo", diaSemana: 0, observacao: "", itens: [
        { id: "ag-1", titulo: "Consagração", detalhe: "", horario: "8h" },
        { id: "ag-2", titulo: "Culto Matutino", detalhe: "Com Culto Infantil", horario: "9h" },
        { id: "ag-3", titulo: "Escola Bíblica Dominical", detalhe: "Classes para todas as idades", horario: "10h20" },
        { id: "ag-4", titulo: "Culto Noturno", detalhe: "", horario: "19h" },
      ] },
      { id: "terca", dia: "Terça", diaSemana: 2, observacao: "*Confirme o local pelo direct do Instagram.", itens: [
        { id: "ag-5", titulo: "Reunião Sarah Kalley*", detalhe: "União Auxiliadora Feminina", horario: "14h30" },
      ] },
      { id: "quarta", dia: "Quarta", diaSemana: 3, observacao: "", itens: [
        { id: "ag-6", titulo: "Estudo Bíblico e Oração", detalhe: "Estudo sistemático e doutrinário", horario: "19h30" },
      ] },
      { id: "sexta", dia: "Sexta", diaSemana: 5, observacao: "Eventualmente: reunião nos lares, 20h.", itens: [
        { id: "ag-7", titulo: "1ª Sexta | Vigília", detalhe: "Oração no Templo", horario: "20h" },
        { id: "ag-8", titulo: "2ª e 4ª Sextas", detalhe: "Treinamento por departamento e aconselhamento", horario: "20h" },
        { id: "ag-9", titulo: "3ª Sexta | Reunião de Casais", detalhe: "Oração e ação", horario: "20h" },
      ] },
      { id: "sabado", dia: "Sábado", diaSemana: 6, observacao: "*Confirme o local pelo direct do Instagram.", itens: [
        { id: "ag-10", titulo: "2º e 4º Sábados | Na Casa*", detalhe: "União de Jovens", horario: "18h30" },
        { id: "ag-11", titulo: "3º Sábado | Culto Jovem", detalhe: "", horario: "19h" },
      ] },
    ],
  },
  eventos: {
    titulo: "Próximos eventos",
    subtitulo: "Congressos, conferências e encontros especiais.",
    itens: [
      { id: "juniores-2026", titulo: "1º Congresso dos Juniores IECB", data: "2026-11-28", dataFim: "2026-11-29", horario: "Sábado, 19h", local: "Templo — SHCS SQ 415", descricao: "Vamos agradecer a Deus pela vida dos nossos pequeninos. Participe e traga convidados!", imagem: "", rotuloLink: "", link: "", destaque: false, publicado: true },
      { id: "jantar-2026", titulo: "Jantar de Confraternização IECB", data: "2026-12-04", dataFim: "", horario: "19h", local: "", descricao: "", imagem: "", rotuloLink: "", link: "", destaque: false, publicado: true },
      { id: "iecb-54-anos", titulo: "IEC de Brasília — 54 anos", data: "2026-12-05", dataFim: "2026-12-06", horario: "19h", local: "Templo — SHCS SQ 415", descricao: "Cultos de gratidão a Deus pelos 54 anos da igreja, com o Pr. Eleazar Duarte (Projeto Zero). No sábado, participação do Coral Adorai (IP de Águas Claras); no domingo, Ceia do Senhor. Bazar Missionário nos dois dias.", imagem: "", rotuloLink: "", link: "", destaque: true, publicado: true },
      { id: "cafe-aniversariantes", titulo: "Café da manhã dos aniversariantes do trimestre", data: "2026-12-13", dataFim: "", horario: "9h", local: "", descricao: "", imagem: "", rotuloLink: "", link: "", destaque: false, publicado: true },
    ],
  },
  sobre: {
    titulo: "A Igreja",
    introducao:
      "Conheça a nossa história, aquilo em que cremos e o propósito que nos move.",
    historiaTitulo: "Nossa história",
    historia:
      "Há 54 anos, a Primeira Igreja Evangélica Congregacional de Brasília reúne famílias na Asa Sul para adorar a Deus, estudar as Escrituras e anunciar o evangelho de Jesus Cristo. A igreja é filiada à União das Igrejas Evangélicas Congregacionais do Brasil (UIECB).\n\nAlém dos cultos, da Escola Bíblica Dominical e dos estudos de quarta-feira, a igreja mantém departamentos para crianças, juniores, jovens, mulheres, homens e casais, um trabalho de assistência social e o apoio a campos missionários em Joinville, Pirenópolis, Florianópolis e na Espanha.",
    imagem: "",
    missao: "",
    visao: "",
    valores: [],
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
    introducao: "Pastores e oficiais chamados para servir e cuidar da igreja.",
    grupos: [
      {
        id: "pastores",
        nome: "Pastores",
        membros: [
          { id: "pr-hilario", nome: "Pr. Hilário José Bispo da Graça", cargo: "Pastor-Presidente", foto: "", bio: "" },
          { id: "pr-aluizio", nome: "Pr. Aluízio Lourenço da Silva Filho", cargo: "Pastor Auxiliar", foto: "/fotos/pr-aluizio-lourenco.jpg", bio: "" },
          { id: "pr-jefferson", nome: "Pr. Jefferson Pontes Guimarães", cargo: "Pastor", foto: "", bio: "" },
        ],
      },
      {
        id: "diretoria",
        nome: "Diretoria da Igreja",
        membros: [
          { id: "dir-presidente", nome: "Pr. Hilário José Bispo da Graça", cargo: "Pastor-Presidente", foto: "", bio: "" },
          { id: "dir-vice", nome: "Pb. Ricardo Rogério D. Santos", cargo: "Vice-Presidente", foto: "", bio: "" },
          { id: "dir-secretaria", nome: "Maria Isabel A. Silva dos Santos", cargo: "Secretária-Geral", foto: "", bio: "" },
          { id: "dir-patrimonio", nome: "Pb. Jorge E. S. Bonacorso", cargo: "Secretário do Patrimônio", foto: "", bio: "" },
          { id: "dir-tesoureiro-1", nome: "Cristian Caixeta Fernandes", cargo: "1º Tesoureiro", foto: "", bio: "" },
          { id: "dir-tesoureira-2", nome: "Dca. Vera Nascimento", cargo: "2ª Tesoureira", foto: "", bio: "" },
        ],
      },
      { id: "oficiais", nome: "Oficiais (presbíteros e diáconos)", membros: [] },
    ],
  },
  ministerios: {
    titulo: "Ministérios",
    introducao: "Departamentos e ministérios da igreja. Há um lugar para você servir e crescer.",
    itens: [
      { id: "louvor", nome: "Ministério de Louvor", descricao: "Conduz a igreja na adoração com música nos cultos e estudos.", imagem: "", lider: "", quando: "", contato: "" },
      { id: "infantil", nome: "Departamento Infantil", descricao: "Ensino da Palavra para as crianças, com o Culto Infantil durante o culto matutino.", imagem: "", lider: "", quando: "Domingos, 9h", contato: "" },
      { id: "juniores", nome: "Juniores", descricao: "Discipulado e comunhão para os juniores da igreja.", imagem: "", lider: "", quando: "", contato: "" },
      { id: "jovens", nome: "União de Jovens", descricao: "Encontros nos lares e Culto Jovem para a juventude da igreja.", imagem: "", lider: "", quando: "2º e 4º sábados, 18h30 · 3º sábado, 19h (Culto Jovem)", contato: "" },
      { id: "uaf", nome: "União Auxiliadora Feminina", descricao: "Reunião Sarah Kalley: estudo, oração e comunhão entre as mulheres da igreja.", imagem: "", lider: "", quando: "Terças, 14h30", contato: "" },
      { id: "uhc", nome: "União de Homens Congregacionais", descricao: "Comunhão e serviço entre os homens da igreja.", imagem: "", lider: "", quando: "", contato: "" },
      { id: "casais", nome: "Ministério de Casais", descricao: "Encontro para casais com oração e ação.", imagem: "", lider: "", quando: "3ª sexta-feira do mês, 20h", contato: "" },
      { id: "assistencia", nome: "Assistência Social", descricao: "Cuidado com os mais necessitados, com arrecadação e distribuição de doações.", imagem: "", lider: "Irmã Silvana Silva", quando: "", contato: "" },
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
    pixFavorecido: "Primeira Igreja Evangélica Congregacional de Brasília — CNPJ 00.371.427/0001-04",
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
