/**
 * Regras do editor simples do boletim: localizar as seções pelo papel que
 * cumprem (pastoral, avisos, escala…), preparar o boletim da semana seguinte
 * e conferir se está tudo pronto antes de publicar.
 */
import {
  dataPorExtenso, novoIdB,
  type BlocoAgenda, type BlocoAniversariantes, type BlocoArtigo, type BlocoAvisos, type BlocoEscala, type BlocoTabela, type Boletim,
} from "./boletim";

export const MESES_MAIUSC = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

export type Partes = {
  /** todas as pastorais (uma, duas, três… conforme a semana) */
  artigos: BlocoArtigo[];
  pastoral?: BlocoArtigo;
  segunda?: BlocoArtigo;
  avisos?: BlocoAvisos;
  escala?: BlocoEscala;
  semana?: BlocoTabela;
  agenda?: BlocoAgenda;
  aniversariantes?: BlocoAniversariantes;
};

/** As seções que o pastor edita toda semana, achadas pelo tipo (a ordem das páginas pode variar). */
export function partes(b: Boletim): Partes {
  const todos = b.paginas.flatMap((p) => p.blocos);
  const artigos = todos.filter((x): x is BlocoArtigo => x.tipo === "artigo");
  const tabelas = todos.filter((x): x is BlocoTabela => x.tipo === "tabela");
  return {
    artigos,
    pastoral: artigos[0],
    segunda: artigos[1],
    avisos: todos.find((x): x is BlocoAvisos => x.tipo === "avisos"),
    escala: todos.find((x): x is BlocoEscala => x.tipo === "escala"),
    semana: tabelas.find((t) => /semana/i.test(t.titulo)) ?? tabelas[0],
    agenda: todos.find((x): x is BlocoAgenda => x.tipo === "agenda"),
    aniversariantes: todos.find((x): x is BlocoAniversariantes => x.tipo === "aniversariantes"),
  };
}

export const ORDINAIS = ["Primeira", "Segunda", "Terceira", "Quarta", "Quinta", "Sexta"];

/** O passo do editor fácil que cuida de uma página (para "texto demais na página N"). */
function passoDaPagina(p: Boletim["paginas"][number]) {
  const tipos = p.blocos.map((x) => x.tipo);
  if (tipos.includes("artigo")) return "pastoral";
  if (tipos.includes("avisos")) return "avisos";
  if (tipos.includes("agenda")) return "agenda";
  return "escala";
}

/** Rótulo da pastoral pela posição: "Pastoral", "Segunda da pastoral", "Terceira pastoral"… */
export const rotuloPastoral = (i: number) => (i === 0 ? "Pastoral" : i === 1 ? "Segunda da pastoral" : `${ORDINAIS[i] ?? `${i + 1}ª`} pastoral`);

/** Mais uma pastoral, numa página nova logo depois da última (no mesmo desenho dela). */
export function adicionarPastoral(b: Boletim): string {
  const pt = partes(b);
  const ultima = pt.artigos[pt.artigos.length - 1];
  const depois = ultima ? paginaDo(b, ultima.id) : 0;
  const novo: BlocoArtigo = {
    id: novoIdB("art"), tipo: "artigo", largura: "inteira", ajuste: 100,
    rotulo: rotuloPastoral(pt.artigos.length), rotuloLado: "esquerda",
    colunas: ultima?.colunas ?? 2, proporcao: ultima?.proporcao ?? 0.5,
    titulo: "", texto: "", autor: "",
  };
  b.paginas.splice(depois + 1, 0, { id: novoIdB("pg"), blocos: [novo] });
  return novo.id;
}

/** Tira uma pastoral; a página some junto se ficar vazia. */
export function retirarPastoral(b: Boletim, id: string) {
  const pi = paginaDo(b, id);
  if (pi < 0) return;
  const pg = b.paginas[pi]!;
  pg.blocos = pg.blocos.filter((x) => x.id !== id);
  if (!pg.blocos.length && b.paginas.length > 1) b.paginas.splice(pi, 1);
  // renumera os rótulos padrão ("Terceira pastoral" vira "Segunda da pastoral"…); rótulo próprio fica
  const padrao = new Set(ORDINAIS.map((_, i) => rotuloPastoral(i).toLowerCase()));
  partes(b).artigos.forEach((x, i) => { if (padrao.has((x.rotulo ?? "").trim().toLowerCase())) x.rotulo = rotuloPastoral(i); });
}

/** Em qual página (índice) está um bloco. */
export function paginaDo(b: Boletim, blocoId?: string) {
  if (!blocoId) return -1;
  return b.paginas.findIndex((p) => p.blocos.some((x) => x.id === blocoId));
}

// ─── Datas da agenda ("22 (dom)" dentro do grupo "NOVEMBRO") ────────────────

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Data completa de um item da agenda, deduzindo o ano a partir da data do boletim. */
export function dataDoItem(grupo: string, data: string, dataBoletim: string): string | null {
  const mes = MESES_MAIUSC.findIndex((m) => sem(grupo).startsWith(sem(m)));
  const dia = parseInt(data, 10);
  if (mes < 0 || !dia) return null;
  const [ab, mb] = dataBoletim.split("-").map(Number) as [number, number];
  // agenda de novembro/dezembro que já fala de janeiro: é do ano seguinte
  const ano = mes + 1 < mb - 2 ? ab + 1 : ab;
  const d = new Date(ano, mes, dia, 12);
  return d.getMonth() === mes ? iso(d) : null;
}

export function rotuloAgenda(dataIso: string) {
  const d = new Date(`${dataIso}T12:00:00`);
  return `${d.getDate()} (${SEMANA[d.getDay()]})`;
}

/** Põe (ou move) um compromisso no grupo do mês certo, em ordem de data. */
export function colocarNaAgenda(a: BlocoAgenda, dataBoletim: string, item: { id: string; data: string; hora: string; texto: string }, dataIso: string) {
  for (const g of a.grupos) g.itens = g.itens.filter((x) => x.id !== item.id);
  const d = new Date(`${dataIso}T12:00:00`);
  const nomeMes = MESES_MAIUSC[d.getMonth()]!;
  let g = a.grupos.find((x) => sem(x.titulo).startsWith(sem(nomeMes)));
  if (!g) {
    g = { id: novoIdB("g"), titulo: nomeMes, itens: [] };
    a.grupos.push(g);
  }
  g.itens.push({ ...item, data: rotuloAgenda(dataIso) });
  ordenarAgenda(a, dataBoletim);
}

export function ordenarAgenda(a: BlocoAgenda, dataBoletim: string) {
  const chave = (g: string, d: string) => dataDoItem(g, d, dataBoletim) ?? "9999";
  for (const g of a.grupos) g.itens.sort((x, y) => chave(g.titulo, x.data).localeCompare(chave(g.titulo, y.data)) || horaNum(x.hora) - horaNum(y.hora));
  a.grupos = a.grupos.filter((g) => g.itens.length).sort((x, y) => chave(x.titulo, "1").localeCompare(chave(y.titulo, "1")));
}
const horaNum = (h: string) => { const m = /(\d{1,2})h(\d{2})?/.exec(h); return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : -1; };

// ─── Próximo boletim ────────────────────────────────────────────────────────

export function mais7(dataIso: string, dias = 7) {
  const d = new Date(`${dataIso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return iso(d);
}

/**
 * O boletim do domingo seguinte, a partir do último: mesmas seções e avisos;
 * pastorais em branco (com o mesmo autor), escala adiantada uma semana
 * ("próximo domingo" vira "hoje") e compromissos que já passaram retirados.
 */
export function prepararProximo(base: Boletim, datasOcupadas: string[], minimo = ""): { boletim: Boletim; lembretes: string[] } {
  const c = structuredClone(base);
  c.id = novoIdB("bol");
  c.data = mais7(base.data);
  while (c.data < minimo || datasOcupadas.includes(c.data)) c.data = mais7(c.data);
  c.publicado = false;
  delete c.publicadoEm;
  c.versiculo = "";
  c.versiculoRef = "";
  for (const p of c.paginas) {
    p.id = novoIdB("pg");
    for (const bl of p.blocos) bl.id = novoIdB(bl.tipo.slice(0, 3));
  }
  const pt = partes(c);
  const lembretes: string[] = [];
  for (const a of pt.artigos) { a.titulo = ""; a.texto = ""; a.ajuste = 100; }
  if (pt.avisos) pt.avisos.ajuste = 100;
  if (pt.escala) {
    for (const l of pt.escala.linhas) l.celulas = [l.celulas[0], l.celulas[2], ""];
    for (const po of pt.escala.porteiros) po.nome = "";
    lembretes.push("A escala foi adiantada: o que era “próximo domingo” virou “hoje”. Preencha a coluna do próximo domingo e os porteiros.");
  }
  if (pt.agenda) {
    let tirados = 0;
    for (const g of pt.agenda.grupos) {
      const antes = g.itens.length;
      g.itens = g.itens.filter((it) => { const d = dataDoItem(g.titulo, it.data, base.data); return !d || d >= c.data; });
      tirados += antes - g.itens.length;
    }
    pt.agenda.grupos = pt.agenda.grupos.filter((g) => g.itens.length);
    if (tirados) lembretes.push(`${tirados} ${tirados === 1 ? "compromisso que já passou saiu" : "compromissos que já passaram saíram"} da agenda.`);
  }
  if (pt.aniversariantes && Number(base.data.slice(5, 7)) !== Number(c.data.slice(5, 7))) {
    lembretes.push(`Começou ${MESES_MAIUSC[Number(c.data.slice(5, 7)) - 1]!.toLowerCase()}: atualize a lista de aniversariantes.`);
  }
  lembretes.unshift("Os avisos da semana passada foram mantidos — apague os que já passaram.");
  return { boletim: c, lembretes };
}

// ─── Conferência antes de publicar ──────────────────────────────────────────

export type Conferencia = { ok: boolean; texto: string; passo: string; grave?: boolean };

export function conferir(b: Boletim, ocupacao: Record<string, number>): Conferencia[] {
  const pt = partes(b);
  const l: Conferencia[] = [];
  const domingo = new Date(`${b.data}T12:00:00`).getDay() === 0;
  l.push({ ok: domingo, texto: domingo ? `Data: domingo, ${dataPorExtenso(b.data)}` : `A data (${dataPorExtenso(b.data)}) não é um domingo`, passo: "inicio" });
  l.push({ ok: Boolean(b.versiculo?.trim()), texto: b.versiculo?.trim() ? "Versículo da semana preenchido" : "Falta o versículo da semana", passo: "inicio" });
  pt.artigos.forEach((a, i) => {
    const nome = pt.artigos.length > 1 ? `${ORDINAIS[i] ?? `${i + 1}ª`} pastoral` : "pastoral";
    const ok = Boolean(a.titulo.trim() && a.texto.trim());
    l.push({ ok, texto: ok ? `${nome[0]!.toUpperCase()}${nome.slice(1)}: “${a.titulo.replace(/\*/g, "")}”` : `Falta o título ou o texto da ${nome}`, passo: "pastoral", grave: !ok });
  });
  if (pt.avisos) {
    const brancos = pt.avisos.itens.filter((x) => !x.titulo.trim() && !x.texto.trim()).length;
    if (brancos) l.push({ ok: false, texto: `${brancos} ${brancos === 1 ? "aviso está em branco" : "avisos estão em branco"} — preencha ou apague`, passo: "avisos" });
  }
  if (pt.agenda) {
    const brancos = pt.agenda.grupos.flatMap((g) => g.itens).filter((x) => !x.texto.trim()).length;
    if (brancos) l.push({ ok: false, texto: `${brancos} ${brancos === 1 ? "compromisso da agenda está sem descrição" : "compromissos da agenda estão sem descrição"}`, passo: "agenda" });
  }
  if (pt.escala) {
    const vazios = pt.escala.linhas.filter((x) => !x.celulas[1].trim()).length;
    l.push({ ok: !vazios, texto: vazios ? `Escala de hoje: ${vazios} ${vazios === 1 ? "função sem nome" : "funções sem nome"}` : "Escala de hoje completa", passo: "escala" });
  }
  if (pt.aniversariantes) {
    const mes = MESES_MAIUSC[Number(b.data.slice(5, 7)) - 1]!;
    const ok = sem(pt.aniversariantes.titulo).includes(sem(mes));
    l.push({ ok, texto: ok ? `Aniversariantes de ${mes.toLowerCase()}` : `Os aniversariantes não são de ${mes.toLowerCase()}`, passo: "aniversariantes" });
  }
  const cheias = b.paginas.map((p, i) => ({ n: i + 1, pct: ocupacao[p.id] ?? 0 })).filter((x) => x.pct > 100);
  l.push({
    ok: !cheias.length,
    grave: cheias.length > 0,
    texto: cheias.length ? `Texto demais na página ${cheias.map((x) => x.n).join(" e ")} — encurte um pouco` : "Tudo cabe nas páginas",
    passo: cheias[0] ? passoDaPagina(b.paginas[cheias[0].n - 1]!) : "publicar",
  });
  return l;
}

/** O domingo desta semana em Brasília: hoje, se for domingo; senão, o próximo. */
export function domingoDaVez(agora = new Date()) {
  const hoje = agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const dia = new Date(`${hoje}T12:00:00`).getDay();
  return dia === 0 ? hoje : mais7(hoje, 7 - dia);
}
