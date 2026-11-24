/**
 * Boletim dominical — modelo de dados.
 *
 * O boletim é uma lista de páginas A4; cada página tem blocos (pastoral,
 * avisos, escala, agenda…). Cada tipo de bloco tem um desenho fixo, copiado do
 * boletim em Word da igreja — quem edita mexe no conteúdo, e o padrão (fonte,
 * tamanho, cor, tabelas) se mantém.
 *
 * Marcação nos textos: **negrito**, *itálico*; linha em branco separa parágrafos.
 */

export type Largura = "inteira" | "dois-tercos" | "um-terco" | "larga" | "estreita";

export const LARGURA_ROTULO: Record<Largura, string> = {
  inteira: "Página inteira",
  "dois-tercos": "2/3 da largura",
  "um-terco": "1/3 da largura",
  larga: "Larga (≈ 60%)",
  estreita: "Estreita (≈ 40%)",
};

type Base = { id: string; largura: Largura; /** % do tamanho padrão das letras (85 a 100) */ ajuste: number };

export type BlocoArtigo = Base & {
  tipo: "artigo";
  rotulo: string;
  rotuloLado: "direita" | "esquerda";
  titulo: string;
  texto: string;
  autor: string;
  colunas: 1 | 2;
  /** Em duas colunas: fração da largura para a coluna da esquerda (0,5 = iguais). */
  proporcao?: number;
};
export type BlocoAvisos = Base & { tipo: "avisos"; colunas?: 1 | 2; proporcao?: number; itens: { id: string; titulo: string; texto: string }[] };
export type BlocoEscala = Base & {
  tipo: "escala";
  titulo: string;
  cabecalho: [string, string, string];
  linhas: { id: string; celulas: [string, string, string] }[];
  porteirosTitulo: string;
  porteiros: { id: string; horario: string; nome: string }[];
  semanaTitulo: string;
  semanaColunas: { id: string; dia: string; atividade: string }[];
  semanaLinhas: { id: string; funcao: string; valores: string[] }[];
};
export type BlocoAniversariantes = Base & {
  tipo: "aniversariantes";
  titulo: string;
  linhas: { id: string; dia: string; nomes: string }[];
  versiculo: string;
  referencia: string;
};
export type BlocoOficios = Base & { tipo: "oficios"; titulo: string; colunas: { id: string; texto: string }[] };
export type BlocoTrabalhos = Base & { tipo: "trabalhos"; titulo: string; itens: { id: string; titulo: string; texto: string }[] };
export type BlocoParcerias = Base & { tipo: "parcerias"; titulo: string; itens: { id: string; nome: string; texto: string }[] };
export type BlocoAgenda = Base & {
  tipo: "agenda";
  titulo: string;
  grupos: { id: string; titulo: string; itens: { id: string; data: string; hora: string; texto: string }[] }[];
};
export type BlocoExpediente = Base & {
  tipo: "expediente";
  nome: string;
  texto: string;
  pastoresTitulo: string;
  pastores: string;
  diretoriaTitulo: string;
  diretoria: string;
};
export type BlocoTexto = Base & { tipo: "texto"; titulo: string; texto: string; caixa: boolean };
export type BlocoTabela = Base & { tipo: "tabela"; titulo: string; cabecalho: string[]; linhas: { id: string; celulas: string[] }[] };

export type Bloco =
  | BlocoArtigo | BlocoAvisos | BlocoEscala | BlocoAniversariantes | BlocoOficios
  | BlocoTrabalhos | BlocoParcerias | BlocoAgenda | BlocoExpediente | BlocoTexto | BlocoTabela;

export type TipoBloco = Bloco["tipo"];

export type Pagina = { id: string; blocos: Bloco[] };

export type Boletim = {
  id: string;
  /** yyyy-mm-dd — o domingo do boletim; também forma o endereço no site */
  data: string;
  titulo: string;
  paginas: Pagina[];
  publicado: boolean;
  publicadoEm?: string;
  atualizadoEm: string;
  atualizadoPor: string;
};

export type ResumoBoletim = Pick<Boletim, "id" | "data" | "titulo" | "publicado" | "publicadoEm" | "atualizadoEm" | "atualizadoPor"> & { paginas: number };

export const novoIdB = (p = "b") => `${p}-${Math.random().toString(36).slice(2, 9)}`;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function dataPorExtenso(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

export function proximoDomingo(base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const TIPO_ROTULO: Record<TipoBloco, string> = {
  artigo: "Pastoral / artigo",
  avisos: "Avisos",
  escala: "Escala de serviços",
  aniversariantes: "Aniversariantes",
  oficios: "Ofícios regulares",
  trabalhos: "Outros trabalhos (campos)",
  parcerias: "Parcerias missionárias",
  agenda: "Agenda e datas",
  expediente: "Expediente da igreja",
  texto: "Texto livre",
  tabela: "Tabela",
};

/** Bloco novo, já no padrão do boletim. */
export function blocoNovo(tipo: TipoBloco): Bloco {
  const base = { id: novoIdB(tipo.slice(0, 3)), largura: "inteira" as Largura, ajuste: 100 };
  switch (tipo) {
    case "artigo": return { ...base, tipo, rotulo: "Pastoral", rotuloLado: "direita", titulo: "Título", texto: "Escreva o texto aqui.", autor: "", colunas: 1, proporcao: 0.59 };
    case "avisos": return { ...base, tipo, colunas: 2, proporcao: 0.34, itens: [{ id: novoIdB("av"), titulo: "Novo aviso", texto: "Texto do aviso." }] };
    case "escala": return { ...base, tipo, largura: "larga", titulo: "ESCALA DE SERVIÇOS E DONS", cabecalho: ["Serviços/Dons", "Hoje", "Próximo Domingo"], linhas: [{ id: novoIdB("l"), celulas: ["Pregador(a) da manhã", "", ""] }], porteirosTitulo: "Porteiras e Porteiros de Oração", porteiros: [], semanaTitulo: "Outros Trabalhos da Semana", semanaColunas: [], semanaLinhas: [] };
    case "aniversariantes": return { ...base, tipo, largura: "estreita", titulo: "ANIVERSARIANTES DO MÊS", linhas: [{ id: novoIdB("an"), dia: "1", nomes: "" }], versiculo: "", referencia: "" };
    case "oficios": return { ...base, tipo, titulo: "Ofícios Regulares", colunas: [{ id: novoIdB("c"), texto: "*Domingo*\nCulto, 9h" }] };
    case "trabalhos": return { ...base, tipo, titulo: "Outros Trabalhos", itens: [{ id: novoIdB("t"), titulo: "Campo missionário", texto: "" }] };
    case "parcerias": return { ...base, tipo, titulo: "Outras Parcerias", itens: [{ id: novoIdB("p"), nome: "Nome", texto: "Descrição" }] };
    case "agenda": return { ...base, tipo, largura: "larga", titulo: "Agenda e Datas Magnas", grupos: [{ id: novoIdB("g"), titulo: "MÊS", itens: [{ id: novoIdB("i"), data: "", hora: "", texto: "" }] }] };
    case "expediente": return { ...base, tipo, largura: "estreita", ...EXPEDIENTE };
    case "texto": return { ...base, tipo, titulo: "Título", texto: "Texto.", caixa: false };
    case "tabela": return { ...base, tipo, titulo: "Título da tabela", cabecalho: ["Coluna 1", "Coluna 2"], linhas: [{ id: novoIdB("l"), celulas: ["", ""] }] };
  }
}

const EXPEDIENTE = {
  nome: "Primeira Igreja Evangélica\nCongregacional de Brasília",
  texto: "SHCS SQS 416 – Plano Piloto\nBrasília/DF - CEP 70298-160\nTel. (61) 3346-7866 / 3245-1739\nCNPJ: 00.371.427/0001-04\ninstagram.com/1iecbsb\nyoutube.com/@iecbsb",
  pastoresTitulo: "Pastores",
  pastores: "Hilário José Bispo da Graça\nAluízio Lourenço da Silva Filho (Pr. Aux.)\nJefferson Pontes Guimarães",
  diretoriaTitulo: "Diretoria da Igreja",
  diretoria: "Pastor-Presidente: Hilário José Bispo da Graça\nVice-Presidente: Pb. Ricardo Rogério D. Santos\nSecretária-Geral: Maria Isabel A. Silva dos Santos\nSecretário do Patrimônio: Pb. Jorge E. S. Bonacorso\n1º Tesoureiro: Cristian Caixeta Fernandes\n2ª Tesoureiro: Dca. Vera Nascimento",
};

const id = novoIdB;
type SemId<T> = T extends Bloco ? Omit<T, "id" | "ajuste"> & { ajuste?: number } : never;
const b = (x: SemId<Bloco>) => ({ id: id(), ajuste: 100, ...x }) as Bloco;

/** O boletim de 22/11/2026, transcrito do arquivo em Word — ponto de partida dos próximos. */
export function boletimModelo(): Boletim {
  return {
    id: id("bol"),
    data: "2026-11-22",
    titulo: "Boletim Dominical",
    publicado: false,
    atualizadoEm: new Date().toISOString(),
    atualizadoPor: "",
    paginas: [
      {
        id: id("pg"),
        blocos: [
          b({
            tipo: "artigo", largura: "inteira", rotulo: "Pastoral", rotuloLado: "direita", colunas: 1,
            titulo: "A questão do coração", autor: "Pr. Hilário José",
            texto: `Coração é a categoria bíblica que designa o homem interior. A Bíblia diz que ele deve ser guardado (Pv 4.23). Eis aí uma das grandes questões da vida: como guardar o coração, a estrutura espiritual pela qual reagimos a tudo o que nos cerca?

Primeiro, conhecendo essa realidade interior, formada por Deus, conforme Davi a descreve em seu célebre Salmo 139: “...pois tu formaste o meu interior...” (Sl 139.13). As entranhas apontam para o que há de mais íntimo no ser humano. No início do salmo, Davi já havia falado do Deus que sonda, que conhece e que, de longe, penetra os pensamentos dos homens (Sl 139.1, 2). O salmista reconhece que o Criador formou e conhece o que somos no mais íntimo do ser. Deus tem poder sobre a nossa realidade interior.

Em segundo lugar, não podemos “fugir” de nós mesmos. O que de fato somos está sempre diante de Deus: “Para onde me ausentarei do teu Espírito? Para onde fugirei da tua face?” (Sl 139.7). As questões do “eu interior” precisam ser enfrentadas perante Deus. Meu conselho é que nunca deixemos de examinar os problemas do coração. Não é bom acumular nele desejos e emoções sem submetê-los ao cuidado de Deus. É assim que as pessoas se sobrecarregam e se cansam, a ponto de chegar à fadiga emocional. Convém, então, buscar sem demora a ajuda de alguém capacitado por Deus para aconselhar com base na Palavra de Deus e em oração. O Criador nos formou e nos deu as Escrituras, como um manual para a vida interior, que revelam quem somos, quais são os nossos problemas e como lidar com eles. Elas cumprem esse propósito “porque a palavra de Deus é viva, e eficaz... e é apta para discernir os pensamentos e propósitos do coração” (Hb 4.12).

Por último, cientes dessa verdade, devemos nos submeter à terapia espiritual que requer mudança. O coração precisa ser transformado, o que é possível por meio do evangelho de Cristo. As sagradas letras podem nos dar sabedoria para a salvação pela fé em Cristo Jesus, porque “toda Escritura é inspirada por Deus e útil para o ensino, para a repreensão, para a correção, para a educação na justiça, a fim de que o homem de Deus seja perfeito e perfeitamente habilitado para toda boa obra” (2Tm 3.15-17). Então, submeta seu coração a Deus e deixe-O cuidar de você.`,
          }),
        ],
      },
      {
        id: id("pg"),
        blocos: [
          b({
            tipo: "artigo", largura: "inteira", rotulo: "Segunda da pastoral", rotuloLado: "esquerda", colunas: 2, proporcao: 0.591, ajuste: 99,
            titulo: "Firmes contra as ciladas do inimigo", autor: "Sem. Rodrigo Morais",
            texto: `A vida cristã não está livre de aflições e tentações; por isso, precisamos permanecer vigilantes contra as ciladas do diabo. Na Epístola aos Efésios, o apóstolo Paulo recomenda que nos revistamos de toda a armadura de Deus, para que possamos resistir no dia mau, tudo vencer e permanecer inabaláveis. Os componentes dessa armadura são conhecidos: o cinturão da verdade, a couraça da justiça, o evangelho da paz, o escudo da fé, o capacete da salvação e a palavra de Deus, que é a espada do Espírito (Ef 6.11-17).

Paulo aponta para uma ameaça permanente e uma luta inevitável. O inimigo pretende nos destruir e, para tanto, arma ciladas. Suas táticas não consistem meramente no emprego da força bruta ou em investidas frontais. As Escrituras o apresentam, desde os primórdios da história humana, como um enganador astucioso. O próprio Cristo o chamou de “pai da mentira” (Jo 8.44).

No Éden, a serpente não forçou Eva a pecar. Esta deixou-se convencer pelos argumentos falaciosos e pelas falsas promessas, sendo induzida à desobediência ao Criador. Questionada pelo Senhor sobre seu ato, Eva respondeu: “A serpente me enganou, e eu comi” (Gn 3.13). Adão também desobedeceu a Deus, participando da queda. Esse é o *modus operandi* do inimigo de nossas almas: o diabo mente, ilude, seduz.

Seria ingênuo supor que as antigas artimanhas do diabo, tantas vezes descritas nas Escrituras, tenham perdido eficácia ao longo das eras. Conhecedor da Palavra de Deus, ele não hesita em distorcê-la e em alimentar expectativas enganosas, com o objetivo de confundir as ovelhas, desviá-las e devorá-las.

O próprio Cristo enfrentou as investidas do tentador. Diferentemente de Adão, porém, nosso Salvador permaneceu perfeitamente obediente ao Pai, resistindo às tentações. Sua vitória não é apenas um exemplo a ser seguido, mas o fundamento da esperança daqueles que nele confiam.

Como Jesus, também somos chamados a resistir às investidas do maligno. Paulo ensina que “nossa luta não é contra o sangue e a carne, e sim contra principados e potestades, contra os dominadores deste mundo tenebroso, contra as forças espirituais do mal, nas regiões celestes” (Ef 6.12).

Se a mentira é uma das principais armas do inimigo, o Senhor nos oferece os meios para resistirmos, começando pela verdade da sua Palavra. Não basta, porém, conhecê-los: é necessário lançar mão deles. Cabe-nos tomar toda a armadura de Deus, orando em todo tempo, com toda súplica e vigiando com toda perseverança (Ef 6.18). Desse modo, apesar de nossas fraquezas, podemos ter, em Cristo, a certeza da vitória final.`,
          }),
        ],
      },
      {
        id: id("pg"),
        blocos: [
          b({
            tipo: "avisos", largura: "inteira", colunas: 2, proporcao: 0.339, ajuste: 98,
            itens: [
              { id: id("av"), titulo: "Martelando a Palavra", texto: "*...tomai toda armadura de Deus, para que possais resistir no dia mau e, depois de terdes vencido tudo, permanecer inabaláveis* (Ef 6.13)." },
              { id: id("av"), titulo: "O congresso jovem", texto: "Agradeçamos a Deus por nossos jovens; pela iniciativa e zelo em realizar mais um congresso. Que sigam assim e prosperem em tudo o que Deus lhes designar." },
              { id: id("av"), titulo: "Jovem congregacional", texto: "Amanhã, nossa igreja observa o Dia do Jovem Congregacional. A todos eles, os nossos devidos cumprimentos." },
              { id: id("av"), titulo: "Espanha", texto: "Não deixe de orar pelo projeto na Fuente Del Peregrino, Galícia/Espanha, a partir de 21 de abril/2027. Orem pelos preparativos e por aqueles que intentam compor essa missão. Detalhes de como participar, falar com o Pb. Jorge Bonacorso." },
              { id: id("av"), titulo: "Projeto Zero", texto: "Terá seu impacto missionário realizado na cidade de Iporã-PR, entre 11 e 18 de janeiro/2027. Interessados em participar, falar com o Pr. Hilário José." },
              { id: id("av"), titulo: "Assistência Social", texto: "Hoje é o dia. Fale com a diretora, irmã Silvana Silva, e saiba como cooperar na assistência aos mais necessitados." },
              { id: id("av"), titulo: "Bazar", texto: "Durante os dois dias de programação de aniversário da igreja, funcionará o nosso Bazar Missionário. A irmã Silvana Silva aguarda as doações. Fale com ela e participe." },
              { id: id("av"), titulo: "IEC de Brasília - 54 anos", texto: "Em dois cultos, agradeceremos a Deus pelo tempo desta igreja. Um deles será no dia 5 de dezembro (sábado, 19h) e o outro no dia seguinte (domingo, 19h). Nas duas oportunidades, o mensageiro será o Pr. Eleazar Duarte, diretor do Projeto Zero. Também no sábado, receberemos o Coral Adorai, da Igreja Presbiteriana de Águas Claras. Outras participações devem ser informadas ao Pr. Hilário José, que está organizando toda a programação." },
              { id: id("av"), titulo: "Juniores", texto: "Já será no próximo fim de semana, dias **28 e 29 de novembro**, o **1º Congresso dos Juniores IECB**. Vamos agradecer a Deus pela vida dos nossos pequeninos, que estão muito ávidos pela realização desse importante evento. **Participe e traga convidados!**" },
              { id: id("av"), titulo: "Motivos de oração", texto: "Pela saúde do Pr. Leônidas Duarte, que passará por cirurgia, após diagnóstico de câncer; e demais casos médicos: Cíntia Nascimento, cunhada do Pr. Hilário José; Tereza Pereira, mãe da Dca. Ozanilda Santos; Dc. José Alves, internado em clínica de atenção permanente. Por irmãos que talvez você não conheça, mas que carecem da nossa intercessão: Margarida França; Rossana Marins; Tati BS." },
            ],
          }),
        ],
      },
      {
        id: id("pg"),
        blocos: [
          b({
            tipo: "escala", largura: "larga",
            titulo: "ESCALA DE SERVIÇOS E DONS",
            cabecalho: ["Serviços/Dons", "Hoje", "Próximo Domingo"],
            linhas: [
              ["Pregador(a) da manhã", "Congresso dos Jovens", "Congresso de Juniores"],
              ["Preg./Dir. Culto Infantil 9h", "Sem. Rodrigo/Dani", "Dca. Selma/Dca. Rafaela"],
              ["Pregador(a) da noite", "Congresso dos Jovens", "Congresso de Juniores"],
              ["Dirigente da noite", "Congresso dos Jovens", "Congresso de Juniores"],
              ["Oficial de Plantão", "Pb. Ricardo Santos", "Pb. José Mauro"],
              ["Operador de Som", "Ernesto Pinzan", "Mirelly Belo"],
              ["Portaria/Recepção", "Congresso dos Jovens", "Congresso de Juniores"],
            ].map((c) => ({ id: id("l"), celulas: c as [string, string, string] })),
            porteirosTitulo: "Porteiras e Porteiros de Oração",
            porteiros: [
              ["Das 19h00 às 19h15", "Ângela Miranda"], ["Das 19h15 às 19h30", "Liliane Graça"], ["Das 19h30 às 19h45", "Lívea Santos"],
              ["Das 19h45 às 20h", "Luciana Pinzan"], ["Das 20h às 20h15", "Maria da Luz"], ["Das 20h15 às 20h30", "Dca. Selma R."],
            ].map(([horario, nome]) => ({ id: id("po"), horario: horario!, nome: nome! })),
            semanaTitulo: "Outros Trabalhos da Semana",
            semanaColunas: [
              { id: id("sc"), dia: "Quarta-Feira (19h30)", atividade: "Estudo Bíblico" },
              { id: id("sc"), dia: "Sexta-Feira (20h)", atividade: "Oração | Casais" },
            ],
            semanaLinhas: [
              ["Preletor/Pregador", "Pr. Hilário José", "Min. Casais"],
              ["Dirigente da Oração", "Sem. Renan Bonacorso", "Min. Casais"],
              ["Dirigente do Louvor", "Min. Louvor", "Min. Casais"],
              ["Operador de Som/Mult.", "Por escala", "Min. Casais"],
            ].map(([funcao, ...valores]) => ({ id: id("sl"), funcao: funcao!, valores })),
          }),
          b({
            tipo: "aniversariantes", largura: "estreita",
            titulo: "ANIVERSARIANTES DE NOVEMBRO",
            linhas: [
              ["1º", "Dca.. Ozanilda Tereza P.D. Santos"], ["2", "Uilima Rodrigues dos Santos"], ["4", "Maria Isabel A. Silva dos Santos"],
              ["5", "Helena da Silva Sant'Anna"], ["6", "Cas. Pr. Jefferson e Flávia (27 anos)"], ["7", "Cas. Ernesto e Luciana (18 anos)"],
              ["9", "Luciana Tomiello Gomes da Silva"], ["11", "Guilherme Braga da Silva Moraes\nHelena Henrique S. Oliveira Morais\nJosé Uilas Silva"],
              ["12", "Paulo Roberto Macedo de Souza"], ["16", "Catarina Rodrigues Lourenço"], ["19", "Ernesto Pinzan Neto\nCas. Mauro e Rozânia (13 anos)"],
              ["23", "Daniel de Paiva Vilela Paz"], ["24", "Luciana da Silva Bispo da Graça"], ["27", "Cas. Ismael e Marly (63 anos)"],
              ["30", "Maria da Conceição Macedo Simas\nCas. Maicon e Dominiky (7 anos)"],
            ].map(([dia, nomes]) => ({ id: id("an"), dia: dia!, nomes: nomes! })),
            versiculo: "Ensina-nos a contar os nossos dias, para que alcancemos coração sábio",
            referencia: "(Salmo 90.12).",
          }),
          b({
            tipo: "oficios", largura: "inteira", titulo: "Ofícios Regulares",
            colunas: [
              "***Domingo***\nCulto Matutino, 9h\nEscola Dominical, 10h20\nCulto Noturno, 19h",
              "***Quarta-feira***\nEstudo Bíblico e\nOração, 19h30\n(Estudo sistemático e\ndoutrinário e oração)",
              "***1ª Sexta-feira***\nOração, no Templo, 20h\n***3ª Sexta-feira***\nEncontro para casais, 20h\n(oração e ação)",
              "***2ª e 4ª Sextas-feiras***\nTreinamento por Depto.\nAconselhamento, 20h\n**Eventualmente:**\nReunião nos Lares, 20h",
            ].map((texto) => ({ id: id("of"), texto })),
          }),
          b({
            tipo: "trabalhos", largura: "inteira", titulo: "Outros Trabalhos",
            itens: [
              ["Campo Missionário em Joinville-SC", "Pr. Luiz Felipe de Souza Cintra Duarte\nRua Cidade de Damasco, 787 - Bairro Itaum, Joinville – SC\nCEP 89209-700 – Tel. (21) 98737-9764"],
              ["Campo Missionário - Pirenópolis – GO", "Oficiais da IECB/Missionários voluntários/JOCUM\nRua Tarumã, Qd. 9 - Lote 1 - Vila Cintra – Pirenópolis - GO\nCEP 72980-000 - Tel. (62) 98509-3477"],
              ["Missão Espanha", "Mis. Pr. César Donizete da Silva e Dca. Rosa Amélia Cintra e Silva\nFuente del Peregrino\nLigonde/Lugo – Espanha"],
              ["Congregação de Florianópolis – SC", "Pb. Lucas Cordeiro Nascimento Bispo da Graça\nRua Luís Gonzaga Valente, 606 -Capoeiras - Florianópolis - SC\nCEP 88090-020 - Tel. (48) 9602-1415"],
            ].map(([titulo, texto]) => ({ id: id("tr"), titulo: titulo!, texto: texto! })),
          }),
          b({
            tipo: "parcerias", largura: "inteira", titulo: "Outras Parcerias",
            itens: [
              ["Mis. Thiago Costa (Boa Vista-RR)", "É missionário da MEVA, que atua junto a comunidades indígenas."],
              ["Cristo para las Naciones (CPN - Espanha)", "Pr. Rouzimério e Pra. Denise Campos"],
              ["Mis. Jonaze Pinheiro", "É músico e responsável pelo Projeto TOCAR, que ensina música em várias comunidades ribeirinhas no Amazonas."],
              ["Fuente del Peregrino (Ligonde/Galícia - Espanha)", "Pr. Natan e Tere Souza"],
              ["Yasmin Figueiredo", "Mis. DEM em preparo para projeto com ribeirinhos do AM."],
              ["Projeto Popikari/BigLife", "Ação missionária voltada para capacitação de nativos, a fim de que alcancem seu próprio povo (ênfase no alcance de povos não-alcançados)."],
              ["Mis. Ronaldo Tike", "Atua em comunidade indígena no Amazonas."],
              ["Projeto Zero", "Pr. Eleazar Duarte – São Francisco do Sul-SC."],
              ["Pr. Mis. José Ferrer", "Missionário na Venezuela."],
              ["Mis. Francinaldo e Flávia", "Envio ao Timor Leste (em andamento)."],
              ["Pr. Sebastião Assis", "Missionário em Gado Bravo-PB"],
              ["Leandro e Lilian Santos", "Missionários de base para formação de novos obreiros."],
              ["Mis. Raquel Villela Alves", "Missionária de base (diversos projetos missionários)."],
              ["Gustavo e Aline Costa", "Missionários na Espanha (assistência a refugiados)"],
              ["", ""],
              ["Pr. Luciano José Bispo da Graça", "Missionário da BigLife."],
            ].map(([nome, texto]) => ({ id: id("pa"), nome: nome!, texto: texto! })),
          }),
          b({
            tipo: "agenda", largura: "larga", titulo: "Agenda e Datas Magnas 2026",
            grupos: [
              {
                id: id("g"), titulo: "NOVEMBRO",
                itens: [
                  ["22 (dom)", "-", "Congresso dos Jovens IECB (cont.)"], ["22 (dom)", "-", "Domingo da Assistência Social"], ["22 (dom)", "8h", "Manhã de Consagração (Direção: UHC)"],
                  ["23 (seg)", "-", "Dia do Jovem Congregacional - Data Denominacional"], ["27 (sex)", "-", "Dia do Homem Congregacional - Data Denominacional"],
                  ["28 (sab)", "9h", "Término das atividades da AIECCO (IEC Cristalina-GO)"], ["28 (sab)", "19h", "Congresso dos Juniores IECB"],
                  ["29 (dom)", "-", "Congresso dos Juniores IECB (cont.)"],
                ].map(([data, hora, texto]) => ({ id: id("i"), data: data!, hora: hora!, texto: texto! })),
              },
              {
                id: id("g"), titulo: "DEZEMBRO",
                itens: [
                  ["4 (sex)", "19h", "Jantar de Confraternização IECB"], ["5 (sab)", "19h", "Culto de Gratidão a Deus – IECB 54 Anos"],
                  ["6 (dom)", "-", "Recesso da Escola Dominical"], ["6 (dom)", "19h", "Culto e Ceia do Senhor – IECB 54 Anos"],
                  ["13 (dom)", "9h", "Café da Manhã – aniversariantes do trimestre"],
                ].map(([data, hora, texto]) => ({ id: id("i"), data: data!, hora: hora!, texto: texto! })),
              },
            ],
          }),
          b({ tipo: "expediente", largura: "estreita", ...EXPEDIENTE }),
        ],
      },
    ],
  };
}

/** Próximo boletim: cópia do último, com a data do domingo seguinte e o texto das pastorais em branco. */
export function duplicarParaProximo(base: Boletim): Boletim {
  const c = structuredClone(base);
  c.id = novoIdB("bol");
  const d = new Date(`${base.data}T12:00:00`);
  d.setDate(d.getDate() + 7);
  c.data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  c.publicado = false;
  delete c.publicadoEm;
  for (const p of c.paginas) {
    p.id = novoIdB("pg");
    for (const bl of p.blocos) bl.id = novoIdB(bl.tipo.slice(0, 3));
  }
  return c;
}
