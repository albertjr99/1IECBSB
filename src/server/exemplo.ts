/**
 * Dados de exemplo para testar as escalas: pessoas fictícias, ministérios e
 * escalas (passadas e futuras), tudo marcado com `exemplo: true` para sair
 * inteiro com "Remover exemplos". Pessoas reais que já estão num ministério
 * (ex.: no Louvor) continuam e também entram em algumas escalas.
 * Não manda notificação para ninguém.
 */
import { gravarMembros, lerMembros, novoId } from "./membros";
import { gravarEscalas, gravarIndisponibilidades, gravarMinisterios, gravarSeries, lerEscalas, lerIndisponibilidades, lerMinisterios, lerSeries } from "./escalas";
import { MODELOS_MINISTERIO, diaDe, instante, type Escala, type MinisterioApp, type Resposta } from "@/lib/escalas";
import { PREFS_PADRAO, type Membro } from "@/lib/membros";

const PESSOAS = [
  "Ana Beatriz Lima", "Bruno Carvalho", "Camila Rocha", "Daniel Martins", "Eduarda Freitas", "Felipe Andrade", "Gabriela Nunes",
  "Henrique Barros", "Isabela Moreira", "João Victor Pires", "Larissa Teixeira", "Lucas Ferreira", "Mariana Costa", "Mateus Ribeiro",
  "Natália Gomes", "Otávio Mendes", "Paula Cardoso", "Rafael Souza", "Sara Oliveira", "Thiago Almeida", "Vitória Campos",
  "Wesley Duarte", "Yasmin Castro", "Pr. Eliseu Ramos", "Dc. Marta Vieira", "Sem. Igor Batista",
];

/** Quem faz o quê em cada ministério (índices de PESSOAS → funções pelo nome). */
const EQUIPES: Record<string, [number, string[]][]> = {
  louvor: [[0, ["Vocal"]], [1, ["Violão", "Guitarra"]], [2, ["Ministro(a)", "Vocal"]], [3, ["Bateria"]], [4, ["Vocal"]], [5, ["Baixo"]], [6, ["Teclado"]], [7, ["Guitarra"]], [8, ["Vocal", "Ministro(a)"]], [9, ["Bateria"]], [10, ["Teclado", "Vocal"]], [11, ["Violão"]], [12, ["Sopro"]], [13, ["Baixo"]]],
  multimidia: [[13, ["Som"]], [14, ["Projeção"]], [15, ["Transmissão", "Câmera"]], [16, ["Fotografia"]], [17, ["Som", "Projeção"]], [9, ["Câmera"]], [21, ["Projeção"]]],
  recepcao: [[18, ["Recepção"]], [19, ["Porteiro(a) de oração"]], [20, ["Recepção"]], [21, ["Estacionamento"]], [22, ["Porteiro(a) de oração"]], [24, ["Recepção"]], [4, ["Recepção"]], [16, ["Estacionamento"]]],
  infantil: [[22, ["Professor(a)"]], [20, ["Auxiliar"]], [10, ["Professor(a)"]], [24, ["Berçário"]], [18, ["Auxiliar"]], [6, ["Professor(a)"]]],
  palavra: [[23, ["Pregador(a)"]], [25, ["Pregador(a)", "Dirigente"]], [24, ["Leitura bíblica"]], [2, ["Dirigente"]], [17, ["Leitura bíblica"]]],
};

const MUSICAS = [
  { hino: 1, titulo: "", tom: "G" }, { hino: 15, titulo: "", tom: "D" }, { hino: 32, titulo: "", tom: "C" }, { hino: 101, titulo: "", tom: "E" },
  { titulo: "Grande é o Senhor", artista: "Adhemar de Campos", tom: "A" }, { titulo: "Quão Grande és Tu", artista: "Tradicional", tom: "Bb" },
  { titulo: "Bondade de Deus", artista: "Isaías Saad", tom: "G" }, { titulo: "Santo Espírito", artista: "Laura Souguellis", tom: "D" },
];

const busca = (s: string, onde: "youtube" | "cifra") => onde === "youtube" ? `https://www.youtube.com/results?search_query=${encodeURIComponent(s)}` : `https://www.cifraclub.com.br/?q=${encodeURIComponent(s)}`;

export async function criarExemplos() {
  const agora = new Date().toISOString();
  const hoje = diaDe(agora);
  const membros = await lerMembros();
  if (membros.some((m) => m.exemplo)) throw new Error("Os exemplos já foram criados. Remova antes de criar de novo.");

  // 1. pessoas
  const ids: string[] = PESSOAS.map((nome, i) => {
    const id = novoId("mx");
    const nasc = `19${70 + (i * 7) % 30}-${String((i % 12) + 1).padStart(2, "0")}-${String((i * 3) % 27 + 1).padStart(2, "0")}`;
    const m: Membro = { id, nome, celular: `(61) 90000-${String(1000 + i).slice(-4)}`, email: "", nascimento: nasc, situacao: "ativo", hash: "", criadoEm: agora, aprovadoEm: agora, aprovadoPor: "Exemplo", prefs: { ...PREFS_PADRAO }, favoritos: { versos: [], hinos: [] }, exemplo: true };
    membros.push(m);
    return id;
  });
  await gravarMembros(membros);

  // 2. ministérios (usa o que já existe com o mesmo tipo; senão cria)
  const ms = await lerMinisterios();
  const porChave: Record<string, MinisterioApp> = {};
  for (const chave of Object.keys(EQUIPES)) {
    const mo = MODELOS_MINISTERIO.find((x) => x.chave === chave)!;
    let m = ms.find((x) => x.nome.toLowerCase().includes(mo.nome.toLowerCase().split(" ").pop()!));
    if (!m) {
      m = { id: novoId("min"), nome: mo.nome, descricao: mo.descricao, icone: mo.icone, repertorio: mo.repertorio, funcoes: mo.funcoes.map((nome) => ({ id: novoId("f"), nome })), membros: [], criadoEm: agora, exemplo: true };
      ms.push(m);
    }
    for (const [i, funcoes] of EQUIPES[chave]!) {
      const fs = funcoes.map((n) => {
        let f = m!.funcoes.find((x) => x.nome === n);
        if (!f) { f = { id: novoId("f"), nome: n }; m!.funcoes.push(f); }
        return f.id;
      });
      m.membros.push({ membroId: ids[i]!, funcoes: fs });
    }
    // gente real que já estava no ministério sem função: ganha uma, para entrar nas escalas
    for (const p of m.membros) if (!p.funcoes.length && m.funcoes[0]) p.funcoes = [m.funcoes[chave === "louvor" ? 1 : 0]!.id];
    porChave[chave] = m;
  }
  // a liderança fictícia (só onde ainda não há líder)
  const lideres: Record<string, number> = { multimidia: 17, recepcao: 18, infantil: 22, palavra: 23 };
  for (const [k, i] of Object.entries(lideres)) {
    const m = porChave[k]!;
    if (!m.membros.some((x) => x.lider)) m.membros.find((x) => x.membroId === ids[i])!.lider = true;
  }
  await gravarMinisterios(ms);

  // 3. escalas: 6 domingos para trás e 4 para frente, mais quartas no louvor
  const domingos: string[] = [];
  const d = new Date(`${hoje}T12:00:00Z`);
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  for (let k = -6; k <= 3; k++) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + k * 7); domingos.push(x.toISOString().slice(0, 10)); }
  const escalas = await lerEscalas();
  const series = await lerSeries();
  const serieLouvor = { id: novoId("ser"), ministerioId: porChave.louvor!.id, titulo: "Culto de domingo", hora: "10:00", diaSemana: 0, frequencia: "semanal" as const, desde: domingos[6]!, vagas: ["Ministro(a)", "Vocal", "Vocal", "Violão", "Teclado", "Baixo", "Bateria"].map((n) => porChave.louvor!.funcoes.find((f) => f.nome === n)?.id).filter(Boolean) as string[], roteiro: [{ id: novoId("r"), item: "Louvor", minutos: 25 }, { id: novoId("r"), item: "Oração", minutos: 5 }, { id: novoId("r"), item: "Ofertório", minutos: 5 }], ativa: true, exemplo: true };
  series.push(serieLouvor);
  await gravarSeries(series);

  const conta = new Map<string, number>();
  const montar = (m: MinisterioApp, titulo: string, dia: string, hora: string, funcoes: string[], k: number, publicada: boolean): Escala => {
    const usados = new Set<string>();
    const vagas = funcoes.map((nomeF, j) => {
      const f = m.funcoes.find((x) => x.nome === nomeF)!;
      const cand = m.membros.filter((p) => p.funcoes.includes(f.id) && !usados.has(p.membroId)).sort((a, b) => (conta.get(a.membroId) ?? 0) - (conta.get(b.membroId) ?? 0));
      const p = cand[(k + j) % Math.max(1, Math.min(2, cand.length))] ?? cand[0];
      if (p) { usados.add(p.membroId); conta.set(p.membroId, (conta.get(p.membroId) ?? 0) + 1); }
      const passada = dia < hoje;
      const sorte = (k * 7 + j * 3) % 10;
      const resposta: Resposta = !publicada || !p ? "pendente" : passada ? (sorte === 0 ? "recusado" : "confirmado") : sorte < 5 ? "confirmado" : sorte === 9 ? "recusado" : "pendente";
      return { id: novoId("v"), funcaoId: f.id, membroId: p?.membroId, resposta, ...(resposta === "recusado" ? { motivo: ["Viagem a trabalho", "Plantão", "Aniversário na família"][k % 3] } : {}), ...(resposta !== "pendente" ? { respondidoEm: agora } : {}) };
    });
    const musicas = m.repertorio ? [0, 1, 2, 3].map((j) => {
      const mu = MUSICAS[(k * 3 + j) % MUSICAS.length]!;
      const titulo = mu.titulo || `Hino ${mu.hino}`;
      return { id: novoId("mu"), ...mu, titulo, link: busca(titulo, "youtube"), cifra: busca(titulo, "cifra") };
    }) : [];
    return {
      id: novoId("esc"), ministerioId: m.id, titulo, inicio: instante(dia, hora), situacao: publicada ? "publicada" : "rascunho", vagas, roteiro: [], musicas,
      ...(m.id === porChave.louvor!.id && titulo === "Culto de domingo" ? { serieId: serieLouvor.id } : {}),
      local: "Templo", criadoEm: agora, alteradoEm: agora, historico: [{ em: agora, quem: "Exemplo", o: "Criada como exemplo" }], exemplo: true,
    };
  };
  domingos.forEach((dia, k) => {
    const futura = dia >= hoje;
    const publicada = !futura || k <= 7; // os 2 próximos domingos publicados; os seguintes em rascunho
    escalas.push(montar(porChave.louvor!, "Culto de domingo", dia, "10:00", ["Ministro(a)", "Vocal", "Vocal", "Violão", "Teclado", "Baixo", "Bateria"], k, publicada));
    escalas.push(montar(porChave.multimidia!, "Culto de domingo", dia, "10:00", ["Som", "Projeção", "Transmissão"], k, publicada));
    escalas.push(montar(porChave.recepcao!, "Culto de domingo", dia, "09:40", ["Recepção", "Recepção", "Porteiro(a) de oração", "Estacionamento"], k, publicada));
    escalas.push(montar(porChave.infantil!, "Escola Bíblica Infantil", dia, "09:00", ["Professor(a)", "Auxiliar", "Berçário"], k, publicada));
    escalas.push(montar(porChave.palavra!, "Culto de domingo", dia, "10:00", ["Pregador(a)", "Dirigente", "Leitura bíblica"], k, publicada));
    // quarta-feira
    const qua = new Date(`${dia}T12:00:00Z`); qua.setUTCDate(qua.getUTCDate() + 3);
    escalas.push(montar(porChave.louvor!, "Culto de quarta", qua.toISOString().slice(0, 10), "19:30", ["Ministro(a)", "Violão", "Teclado"], k + 1, !futura || k <= 7));
  });
  // as pessoas reais do louvor (ex.: Albert e Renan) entram no próximo domingo, para testar a confirmação
  const reais = porChave.louvor!.membros.filter((p) => !ids.includes(p.membroId));
  const proxima = escalas.find((e) => e.exemplo && e.ministerioId === porChave.louvor!.id && e.titulo === "Culto de domingo" && diaDe(e.inicio) === domingos[6]);
  if (proxima) for (const p of reais) {
    const f = p.funcoes[0] ?? porChave.louvor!.funcoes[1]!.id;
    proxima.vagas.push({ id: novoId("v"), funcaoId: f, membroId: p.membroId, resposta: "pendente" });
  }
  await gravarEscalas(escalas);

  // 4. algumas ausências
  const ind = await lerIndisponibilidades();
  const amais = (n: number) => { const x = new Date(`${hoje}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  ind.push(
    { id: novoId("ind"), membroId: ids[5]!, de: amais(3), ate: amais(12), motivo: "Férias", criadoEm: agora, exemplo: true },
    { id: novoId("ind"), membroId: ids[14]!, de: domingos[7]!, ate: domingos[7]!, motivo: "Casamento de amigos", criadoEm: agora, exemplo: true },
    { id: novoId("ind"), membroId: ids[20]!, de: amais(1), ate: amais(20), motivo: "Viagem", criadoEm: agora, exemplo: true },
  );
  await gravarIndisponibilidades(ind);
  return { pessoas: ids.length, ministerios: Object.keys(porChave).length, escalas: escalas.filter((e) => e.exemplo).length };
}

export async function removerExemplos() {
  const membros = await lerMembros();
  const fict = new Set(membros.filter((m) => m.exemplo).map((m) => m.id));
  await gravarMembros(membros.filter((m) => !m.exemplo));
  const ms = (await lerMinisterios()).filter((m) => !m.exemplo);
  for (const m of ms) m.membros = m.membros.filter((p) => !fict.has(p.membroId));
  await gravarMinisterios(ms);
  const ok = new Set(ms.map((m) => m.id));
  const seriesEx = new Set((await lerSeries()).filter((s) => s.exemplo).map((s) => s.id));
  await gravarEscalas((await lerEscalas()).filter((e) => !e.exemplo && ok.has(e.ministerioId) && !(e.serieId && seriesEx.has(e.serieId))).map((e) => ({ ...e, vagas: e.vagas.map((v) => (v.membroId && fict.has(v.membroId) ? { ...v, membroId: undefined, resposta: "pendente" as const } : v)) })));
  await gravarSeries((await lerSeries()).filter((s) => !s.exemplo && ok.has(s.ministerioId)));
  await gravarIndisponibilidades((await lerIndisponibilidades()).filter((i) => !i.exemplo && !fict.has(i.membroId)));
  return { pessoas: fict.size };
}

export async function haExemplos() {
  return (await lerMembros()).some((m) => m.exemplo);
}

