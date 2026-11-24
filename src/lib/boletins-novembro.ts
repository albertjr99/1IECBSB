/**
 * Boletins de 8, 15 e 22 de novembro de 2026, transcritos dos PDFs oficiais
 * para o modelo novo. Entram no sistema sozinhos (já publicados) na primeira
 * vez que o site lê a lista de boletins — ver src/server/boletins.ts.
 */
import { boletimModelo, novoIdB, type BlocoArtigo, type BlocoAvisos, type BlocoAgenda, type BlocoEscala, type BlocoTabela, type Boletim, type EstiloAviso } from "./boletim";

const id = novoIdB;
const linhasEscala = (l: string[][]) => l.map((c) => ({ id: id("l"), celulas: c as [string, string, string] }));
const porteiros = (nomes: string[]) =>
  ["Das 19h00 às 19h15", "Das 19h15 às 19h30", "Das 19h30 às 19h45", "Das 19h45 às 20h", "Das 20h às 20h15", "Das 20h15 às 20h30"].map((horario, i) => ({ id: id("po"), horario, nome: nomes[i] ?? "" }));
const itensAgenda = (l: string[][]) => l.map(([data, hora, texto]) => ({ id: id("i"), data: data!, hora: hora!, texto: texto! }));
/** Avisos na ordem da folha: destaques primeiro, a caixa (motivos de oração) por último. */
const avisos = (l: [string, string, EstiloAviso?][]) => {
  const peso = (e?: EstiloAviso) => (e === "destaque" ? 0 : e === "caixa" ? 2 : 1);
  return [...l].sort((a, b) => peso(a[2]) - peso(b[2])).map(([titulo, texto, estilo]) => ({ id: id("av"), titulo, texto, ...(estilo ? { estilo } : {}) }));
};
const semanaLinhas = (l: string[][]) => l.map((celulas) => ({ id: id("tl"), celulas }));

const IEC_54 = "Em dois cultos, agradeceremos a Deus pelo tempo desta igreja: **5 de dezembro (sábado, 19h)** e **6 de dezembro (domingo, 19h)**. Nas duas oportunidades, o mensageiro será o Pr. Eleazar Duarte, diretor do Projeto Zero. Também no sábado, receberemos o Coral Adorai, da Igreja Presbiteriana de Águas Claras. Outras participações devem ser informadas ao Pr. Hilário José, que está organizando toda a programação.";

/** Parte do boletim de 22/11 e troca o que muda de uma semana para outra. */
function semana(data: string, mudar: (b: Boletim, blocos: { p1: BlocoArtigo; p2: BlocoArtigo; avisos: BlocoAvisos; escala: BlocoEscala; agenda: BlocoAgenda; semana: BlocoTabela }) => void): Boletim {
  const b = boletimModelo();
  b.id = id("bol");
  b.data = data;
  b.publicado = true;
  b.publicadoEm = `${data}T07:00:00.000Z`;
  b.atualizadoEm = b.publicadoEm;
  b.atualizadoPor = "Secretaria";
  const [p1, p2, p3, p4] = b.paginas;
  mudar(b, {
    p1: p1!.blocos[0] as BlocoArtigo,
    p2: p2!.blocos[0] as BlocoArtigo,
    avisos: p3!.blocos[0] as BlocoAvisos,
    escala: p4!.blocos.find((x) => x.tipo === "escala") as BlocoEscala,
    agenda: p4!.blocos.find((x) => x.tipo === "agenda") as BlocoAgenda,
    semana: p4!.blocos.find((x) => x.tipo === "tabela") as BlocoTabela,
  });
  return b;
}

export function boletinsNovembro(): Boletim[] {
  const b22 = semana("2026-11-22", (b, x) => {
    b.versiculo = "…tomai toda a armadura de Deus, para que possais resistir no dia mau e, depois de terdes vencido tudo, permanecer inabaláveis.";
    b.versiculoRef = "Efésios 6.13";
    x.avisos.itens = x.avisos.itens.filter((a) => a.titulo !== "Martelando a Palavra");
  });

  const b15 = semana("2026-11-15", (b, x) => {
    b.versiculo = "Cada um contribua segundo tiver proposto no coração, não com tristeza ou por necessidade; porque Deus ama a quem dá com alegria.";
    b.versiculoRef = "2 Coríntios 9.7";
    Object.assign(x.p1, {
      titulo: "Somente obedecer", autor: "",
      texto: `Penso que esta igreja nem precisaria ser instada sobre engajamento com a obra missionária. Desde há muito, boa parte dos nossos esforços tem sido dedicada a projetos missionários; desde o envio ao campo, o apoio financeiro e as orações. Creio ser este um fator que determina a vitalidade de um ministério local.

Falar de missões não deveria ser algo extraordinário, somente observado em eventos específicos para despertar esse interesse. Se há esta necessidade, é como imaginar um coração que parou de bater e passa a necessitar de um estímulo elétrico artificial para voltar a pulsar. O normal é que aquele órgão vital à vida funcione sem impulsos ocasionais – é o natural. Deve, portanto, ser espontâneo, sempre esperado, que a igreja local esteja ativa em evangelização e missões. E, graças a Deus, muitos nesta igreja já têm a consciência desse compromisso e, voluntariamente, envolvem-se em projetos afins diversos. Minha oração é para que, na mesma proporção, cada um deles seja recompensado por Deus; e eu sei que Ele faz assim: “…aquele que semeia pouco, pouco também ceifará; e o que semeia com fartura, com abundância também ceifará” (2Co 9.6). E aqui estou eu falando de missões, mais uma vez, na esperança de que os corações ainda não pulsantes pela expansão do Reino de Deus voltem à vida.

Quando falei da vitalidade de uma igreja, o propósito foi referir-me ao poder de Deus, o qual flui por meio do serviço que os crentes prestam ao Reino. E isto tem a ver com obediência. Há uma ordem expressa que não pode ser relegada. Foi o próprio Cristo quem a determinou: “E será pregado este evangelho do reino por todo o mundo, para testemunho a todas as nações. Então, virá o fim” (Mt 24.14). Portanto, é uma questão de obediência. O crente não escolhe um fazer porque gosta ou não gosta. Ele ouve a ordem e a cumpre. E há uma missão a ser cumprida. Quando a cumprimos, por obediência, somos abençoados. Quando não a cumprimos, entramos em juízo, por desobediência – simples assim.

Igreja que obedece está bem, obrigado. Crente que obedece é saudável. Porque crê, cumpre a vontade de Deus e recebe como recompensa o cuidado inigualável: “Não andeis, pois, a indagar o que haveis de comer ou beber e não vos entregueis a inquietações… Buscai, antes de tudo, o seu reino, e estas coisas vos serão acrescentadas” (Lc 12.29-31).`,
    });
    Object.assign(x.p2, {
      titulo: "Eis um esforço eficaz", autor: "Pr. Hilário José",
      texto: `Outro dia, apelei por uma ajuda extraordinária para construção de uma maloca a um povo não alcançado aqui mesmo no Brasil, no interior do Amazonas. Prontamente, as ofertas auferidas foram enviadas e imediatamente renderam frutos.

Fui informado na semana passada pelo missionário que intermediou a entrega dos recursos, que, não somente foi construída a maloca para treinamento de novos crentes naquele contexto, como também foi adquirida uma antena que permite a comunicação entre aqueles a serem evangelizados. O recurso financeiro foi integralmente investido naquele projeto e logo os frutos, em vidas, têm sido colhidos.

Nem sempre quem oferta tem a noção do alcance de sua disposição em participar da assistência aos campos. Mas quando bem direcionados, recursos materiais permitem o avanço da obra de Deus e vidas são salvas. Fico muito feliz com esses resultados; mas não são uma novidade. Observo esse mover de Deus desde sempre. O plano é dEle, portanto, é perfeito, é eficaz.

Quem tem o privilégio de participar desse plano específico de Deus experimenta o poder que Jesus prometeu; e isto é ma-ra-vi-lho-so: “…mas recebereis poder, ao descer sobre vós o Espírito Santo, e sereis minhas testemunhas tanto em Jerusalém como em toda a Judeia e Samaria e até aos confins da terra” (At 1.8).

No entanto, alguns cuidados são necessários. O tema “missões” é atraente. Os mais antigos diriam que “dá Ibope”; hoje, seriam os likes. Porém, observo muito o apelo por missões ser “utilizado” para obtenção de recursos que nem sempre chegam ao destino anunciado: o campo missionário. É bem triste isto; mas acontece. Portanto, é prudente buscar a orientação de alguém, de uma igreja, ou organizações de cunho missionário confiáveis quando se pretende investir em projetos de evangelização. Neste caso, defendo que a igreja local esteja sempre, direta ou indiretamente, envolvida em ser meio de projeção missionária; participando de todos os planos ao envio de pregadores: “E como ouvirão, se não há quem pregue? E como pregarão, se não forem enviados?” (Rm 10.14,15).

Outro cuidado tem a ver com o obreiro. Alguém disse, e eu concordo, que “o problema da obra pode, às vezes, ser o obreiro”. O missionário precisa ser realmente vocacionado; ou seja, ter um chamado de Deus. Deve também buscar o preparo, o treinamento específico, e o apoio de igrejas mantenedoras. No campo, o missionário tem de ser a solução, não o problema.

Por outro lado, igrejas precisam ser despertadas para a manutenção dos campos e o cuidado do missionário, integrando toda uma rede de ações que farão que a obra seja feita.`,
    });
    x.avisos.itens = avisos([
      ["AGE", "Inicia amanhã e vai até sexta-feira a Assembleia Geral Extraordinária da UIECB. São delegados os irmãos Pr. Aluízio Lourenço, Pr. Hilário José e Pb. Jorge Bonacorso. Oremos por todos os delegados, a fim de que decidam segundo a vontade de Deus."],
      ["Nota de falecimento", "Faleceu na madrugada do dia 6 de novembro a Sra. Arlinda Medina, avó do Pr. Aluízio Lourenço, pela qual vínhamos orando. Mas oremos, agora, pelos familiares enlutados, para que descansem na promessa da ressurreição."],
      ["Arthur Muniz", "Nasceu em 29 de agosto de 2026, o segundo filho dos irmãos Gleuber e Natanrry. Desde as primeiras horas de vida, passou por uns “apertos”, assustando a todos; mas hoje, durante o culto da noite, será apresentado por seus pais ao Senhor. Glórias a Deus."],
      ["Domingo Machado", "Hoje é o nosso Domingo de Missões. Oremos por todos os nossos projetos missionários anotados na quarta página deste boletim. Ajudas à gratificação natalina que pretendemos estender aos obreiros em campo, falar com o Pr. Hilário José e/ou o Pb. Jorge Bonacorso."],
      ["IEC de Brasília · 54 anos", IEC_54, "destaque"],
      ["Jovens", "Já no próximo fim de semana, dias 21 e 22 de novembro, realizarão o 4º Congresso da Juventude, com o tema “Mente blindada, coração guardado” (Provérbios 4.23).\n\nNo sábado, às 19h, teremos o culto de abertura com Cláudio Brito, capelão da Força Aérea, e a participação do Ministério de Louvor da Igreja de Cristo.\n\nNo domingo, a missionária Raquel Guerreiro (MPC) pregará nos cultos das 9h e das 19h. Às 10h20, teremos classe única da EBD com a psicóloga Sol Yoshimura e, às 12h, feijoada na Cantina dos Jovens. **Participe e traga convidados!**", "destaque"],
      ["Motivos de oração", "Pela saúde da Cíntia Nascimento, tia do Davi e do Lucas, cunhada do Pr. Hilário José. Pela saúde da irmã Tereza Pereira, mãe da Dca. Ozanilda. Por Ilza, irmã da nossa Isabel Santos, após alta hospitalar, por sua recuperação. Pelo irmão Dc. José Alves, internado em clínica de atenção permanente. Por irmãos que talvez você não conheça, mas que carecem da nossa intercessão: Pr. Samuel Cesarino (IEC Agronomia-RJ); Margarida França; Rossana Marins; Tati BS.", "caixa"],
    ]);
    x.escala.linhas = linhasEscala([
      ["Pregador(a) da manhã", "Pr. Hilário José", "Congresso dos Jovens"],
      ["Preg./Dir. Culto Infantil 9h", "Sem. Rubens/Sem. Isabel", "Sem. Rodrigo/Dani"],
      ["Pregador(a) da noite", "Pr. Hilário José", "Congresso dos Jovens"],
      ["Dirigente da noite", "Pr. Aluízio Lourenço", "Congresso dos Jovens"],
      ["Oficial de Plantão", "Pb. Wanderson Amorim", "Pb. Ricardo Santos"],
      ["Operador de Som", "Sem. Paulo Lima", "Ernesto Pinzan"],
      ["Portaria/Recepção", "Bernardo Silva", "Congresso dos Jovens"],
    ]);
    x.escala.porteiros = porteiros(["Pb. Ricardo R.", "Mauro Dino", "Pb. Vagner Fortes", "Maicon Lima", "Pedro Ivo", "Dc. Aurélio M."]);
    x.semana.linhas = semanaLinhas([
      ["Preletor/Pregador", "Pr. Aluízio Lourenço", "—"], ["Dirigente da Oração", "Daiane Tolentino", "—"],
      ["Dirigente do Louvor", "Min. Louvor", "—"], ["Operador de Som/Mult.", "Por escala", "—"],
    ]);
    x.agenda.grupos = [
      { id: id("g"), titulo: "NOVEMBRO", itens: itensAgenda([
        ["16 (seg)", "9h", "Início da Assembleia Geral Extraordinária (UIECB)"], ["20 (sex)", "20h", "Reunião de Oração – Casais (última do ano)"],
        ["21 (sab)", "19h", "Congresso dos Jovens IECB"], ["22 (dom)", "-", "Congresso dos Jovens IECB (cont.)"], ["22 (dom)", "-", "Domingo da Assistência Social"],
        ["22 (dom)", "8h", "Manhã de Consagração (Direção: UHC)"], ["23 (seg)", "-", "Dia do Jovem Congregacional - Data Denominacional"],
        ["27 (sex)", "-", "Dia do Homem Congregacional - Data Denominacional"], ["28 (sab)", "9h", "Término das atividades da AIECCO (IEC Cristalina-GO)"],
        ["28 (sab)", "19h", "Congresso dos Juniores IECB"], ["29 (dom)", "-", "Congresso dos Juniores IECB (cont.)"],
      ]) },
      { id: id("g"), titulo: "DEZEMBRO", itens: itensAgenda([["4 (sex)", "19h", "Jantar de Confraternização IECB"], ["5 (sab)", "19h", "Culto de Gratidão a Deus – IECB 54 Anos"]]) },
    ];
  });

  const b08 = semana("2026-11-08", (b, x) => {
    b.versiculo = "Digo, porém: andai no Espírito e jamais satisfareis à concupiscência da carne.";
    b.versiculoRef = "Gálatas 5.16";
    Object.assign(x.p1, {
      titulo: "“…enchei-vos do Espírito…”", autor: "",
      texto: `No último domingo, fui presenteado com um quadro. Nele está a pintura de um barco à vela, no mar, em meio às ondas. Recebi pelas mãos da Nice Bárbara; mas o presente veio de sua mãe, a irmã Arlete Souza, lá do Rio de Janeiro-RJ; irmã carnal da Dca. Aryette Machado. Fiquei muito feliz com o presente, que já está ornando uma das paredes lá de casa.

Num dia da semana passada, bem de manhãzinha, lendo a Bíblia na sala, fiquei olhando um pouco aquela pintura: um barco no meio do mar, velas infladas, enfrentando as ondas. Lembrei-me do que Paulo escreveu aos crentes de Éfeso: “…enchei-vos do Espírito…” (Ef 5.18b). Eis uma exortação apostólica necessária a todo cristão. O verbo utilizado – “encher” – é o verbo grego *plēróō*, o qual pode ser empregado para descrever o vento que infla a vela de uma embarcação, impulsionando-a. Com essa imagem em mente, percebo o propósito de Paulo ao descrever a vida conduzida pelo Espírito. Encher, naquele contexto, não exerce uma função estática, como encher um copo de água. É, antes, ação que possibilita movimento; é a vida que depende e se deixa encher pelo Espírito, que a impulsiona e controla diante dos perigos do mar.

Disse Jesus a Nicodemos: “O vento sopra onde quer, ouves a sua voz, mas não sabes donde vem, nem para onde vai; assim é todo o que é nascido do Espírito” (João 3.8). De fato, o vento vem e as velas de uma embarcação precisam acomodar-se ao seu sentido. Velejar é uma arte, requer muita perícia e sabedoria no lidar com o velame, de modo a adaptar-se a cada movimento das ondas e do vento, com o fim de melhor aproveitar sua força. Quem melhor souber dominar todos os aparelhos que manobram o “pano”, é aquele que terá maior desempenho até que chegue ao destino pretendido.

Permitam-me parafrasear Paulo: “O Espírito está soprando… enchei-vos dEle; deixem a vida ser controlada por Ele; não lutem contra Sua força nem tentem mudar Sua direção”. Como diz o hino: “Quando, vencendo os perigos do mar, dos céus à praia dourada eu chegar, a meu Senhor eu puder contemplar, glória das glórias será para mim!” (Salmos e Hinos, 565).

Aqui registro minha gratidão à irmã Arlete Souza.

Encha-nos o Espírito até aquele Dia.`,
    });
    Object.assign(x.p2, {
      titulo: "A bela Sara", autor: "Pr. Hilário José",
      texto: `A Bíblia descreve Sara como uma mulher “sobremaneira formosa”. Quem sabe, em nossos dias, sua beleza também chamasse a atenção de uma sociedade tão exigente quando o assunto é a aparência feminina. No Egito, ela causou forte impressão, tanto que os oficiais do faraó a elogiaram diante dele (Gn 12.11-15).

Séculos depois, ao instruir as mulheres casadas de seu tempo, Pedro dirige o olhar para outra dimensão da beleza de Sara. O apóstolo fala do “interior do coração” e do valor que um espírito manso e tranquilo tem diante de Deus. É nesse contexto que ele lembra Sara entre as santas mulheres que esperavam em Deus (1Pe 3.3-6).

A sociedade contemporânea dá grande importância à aparência, à juventude, ao vestuário e à aprovação alheia. Nas redes sociais, a exposição constante alimenta comparações e reforça expectativas difíceis de alcançar. Cuidar da aparência tem seu lugar. O problema surge quando a beleza se torna medida do valor de uma pessoa e seu corpo passa a ser alvo de julgamentos. É o que se poderia chamar de “ditadura do belo”.

Concordo com John e Janie Street, autores de *Aconselhamento para Mulheres* (Nutra Publicações), quanto à importância de tratar com seriedade as lutas que as mulheres enfrentam. Entre elas, destaco a pressão para corresponder a padrões de beleza que podem constranger e ferir. A lembrança de Sara nos ajuda a colocar essa pressão em perspectiva. O que Pedro põe em evidência é a esperança em Deus que se expressa na maneira de viver. A dignidade e o papel da mulher continuam em debate. Quando falamos de feminilidade e feminismo, precisamos de clareza sobre o sentido desses termos e de discernimento para avaliar, à luz das Escrituras, as ideias que eles expressam. A sabedoria do alto deve orientar essa reflexão.

Homem e mulher têm igual dignidade diante de Deus, compartilham responsabilidades e, conforme ensinam as Escrituras, também têm papéis distintos a cumprir. Para compreender o que significa ser uma mulher segundo Deus em nossos dias, vale voltar à bela Sara e considerar o que Pedro destacou em sua vida. Sua beleza exterior chamou a atenção dos egípcios; mas sua esperança em Deus fez dela um exemplo para milhares de gerações.

Num tempo em que tanto se pergunta como somos vistos pelos outros, o exemplo de Sara nos convida a uma pergunta mais profunda: o que estamos cultivando no coração diante do Senhor? Que nossa esperança nEle se revele na mansidão com que tratamos as pessoas e na serenidade com que enfrentamos as pressões de cada dia.`,
    });
    x.avisos.itens = avisos([
      ["AIECCO", "No dia 28 deste mês, haverá um encontro de nossa associação de igrejas para marcar o encerramento dos trabalhos do ano. Ocorrerá na IEC de Cristalina-GO. Procure saber da programação com o Pr. Aluízio Lourenço ou com a Dca. Vera Nascimento."],
      ["Missões Mundiais", "Hoje, nossa denominação observa o Dia de Missões Mundiais. Oremos por nossos missionários congregacionais que exercem a vocação longe de sua Pátria."],
      ["Confraternização", "Confirme com o Pb. Jorge Bonacorso a participação de sua família. Ocorrerá no dia 4 de dezembro, uma sexta-feira, a partir das 19h, em um restaurante desta cidade."],
      ["Assembleia", "Aos membros, na próxima quinta-feira, 19h, por videoconferência. Esta será a última do ano. Não esqueçamos nossos relatórios."],
      ["Florianópolis-SC", "Lá estão o Pr. Hilário José e a Liliane Graça, para o culto de aniversário daquela igreja. Também, aproveitaram para visitar os irmãos José e Dulcinéia Alves, em Balneário Camboriú-SC. Retornam amanhã, debaixo das orações dos irmãos."],
      ["IEC de Brasília · 54 anos", IEC_54, "destaque"],
      ["Jovens", "Nos dias 21 e 22 de novembro, convidamos toda a igreja para o 4º Congresso da Juventude, com o tema “Mente blindada, coração guardado” (Provérbios 4.23).\n\nNo sábado, às 19h, teremos o culto de abertura com Cláudio Brito, capelão da Força Aérea, e a participação do Ministério de Louvor da Igreja de Cristo.\n\nNo domingo, a missionária Raquel Guerreiro (MPC) pregará nos cultos das 9h e das 19h. Às 10h20, teremos classe única da EBD com a psicóloga Sol Yoshimura e, às 12h, feijoada na Cantina dos Jovens. **Participe e traga convidados!**", "destaque"],
      ["Gideões Internacionais", "Uma representação desse ministério estará conosco no culto vespertino, onde terá breve oportunidade para expor suas atividades. Desejando saber como tornar-se um Gideão, fale com um deles nesta oportunidade."],
      ["Motivos de oração", "Pela saúde da irmã Tereza Pereira, mãe da Dca. Ozanilda. Por Ilza, irmã da nossa Isabel Santos, internada por causa de um infarto e AVC. Pelo irmão Dc. José Alves, internado em clínica de atenção permanente.", "caixa"],
    ]);
    x.escala.linhas = linhasEscala([
      ["Pregador(a) da manhã", "Pr. Aluízio Lourenço", "Pr. Hilário José"],
      ["Preg./Dir. Culto Infantil 9h", "Sem. Paulo/Dca. Daniella", "Sem. Rubens/Sem. Isabel"],
      ["Pregador(a) da noite", "Pr. Aluízio Lourenço", "Pr. Hilário José"],
      ["Dirigente da noite", "Pr. Aluízio Lourenço", "Pr. Aluízio Lourenço"],
      ["Oficial de Plantão", "Pb. José Mauro", "Pb. Wanderson Amorim"],
      ["Operador de Som", "Mirelly Belo", "Sem. Paulo Lima"],
      ["Portaria/Recepção", "Bianca Pessoa", "Bernardo Silva"],
    ]);
    x.escala.porteiros = porteiros(["Dandara Basílio", "Dani Morais", "Dina Bonacorso", "Sem. Isabel Santos", "Lina Gusmão", "Dca. Rafa Amorim"]);
    x.semana.cabecalho[1] = "Quarta-feira (19h) · Estudo Bíblico";
    x.semana.linhas = semanaLinhas([
      ["Preletor/Pregador", "Pr. Hilário José", "—"], ["Dirigente da Oração", "Sem. Renan Bona", "—"],
      ["Dirigente do Louvor", "Min. Louvor", "—"], ["Operador de Som/Mult.", "Escala", "—"],
    ]);
    x.agenda.grupos = [
      { id: id("g"), titulo: "NOVEMBRO", itens: itensAgenda([
        ["8 (dom)", "8h", "Manhã de Consagração (Direção: UAF)"], ["8 (dom)", "-", "Dia de Missões Mundiais - Data Denominacional"], ["8 (dom)", "19h", "Visita dos Gideões Internacionais"],
        ["12 (qui)", "19h", "Assembleia de Membros (videoconferência)"], ["15 (dom)", "-", "Domingo Machado - Missões"],
        ["16 (seg)", "9h", "Início da Assembleia Geral Extraordinária (UIECB)"], ["20 (sex)", "20h", "Reunião de Oração – Casais (última do ano)"],
        ["21 (sab)", "19h", "Congresso dos Jovens IECB"], ["22 (dom)", "-", "Congresso dos Jovens IECB (cont.)"], ["22 (dom)", "-", "Domingo da Assistência Social"],
        ["22 (dom)", "8h", "Manhã de Consagração (Direção: UHC)"], ["23 (seg)", "-", "Dia do Jovem Congregacional - Data Denominacional"],
        ["27 (sex)", "-", "Dia do Homem Congregacional - Data Denominacional"], ["28 (sab)", "9h", "Término das atividades da AIECCO (IEC Cristalina-GO)"],
      ]) },
    ];
  });

  return [b22, b15, b08];
}
