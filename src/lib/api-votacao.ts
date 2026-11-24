import { createServerFn } from "@tanstack/react-start";
import { opcoesDa, situacaoDa, type Resultado, type Votacao } from "./votacao";

type Entrada = Omit<Votacao, "id" | "criadaPor" | "criadaEm" | "historico" | "eleitores" | "encerradaEm" | "encerradaPor"> & {
  id?: string;
  eleitores: { id?: string; nome: string; contato: string; membroId?: string }[];
};

function validar(v: Entrada) {
  if (!v.titulo?.trim()) throw new Error("Dê um título à votação.");
  if (!v.inicio || !v.fim || new Date(v.fim) <= new Date(v.inicio)) throw new Error("O término precisa ser depois do início.");
  if (v.tipo === "personalizada" && v.opcoes.filter((o) => o.texto.trim()).length < 2) throw new Error("Cadastre ao menos duas opções.");
  if (!v.rascunho && v.eleitores.filter((e) => e.nome.trim()).length === 0) throw new Error("Inclua ao menos um votante.");
  return v;
}

async function resultadoDe(v: Votacao): Promise<Resultado> {
  const { votosDa } = await import("../server/votacao");
  const { presenca, cedulas } = await votosDa(v.id);
  const opcoes = opcoesDa(v);
  const contagem = opcoes.map((o) => ({ id: o.id, texto: o.texto, votos: cedulas.filter((c) => c.opcao === o.id).length }));
  const nomes = new Map(v.eleitores.map((e) => [e.id, e.nome]));
  const r: Resultado = {
    totalEleitores: v.eleitores.length,
    votaram: presenca.length,
    quorumAtingido: presenca.length >= (v.quorum || 0),
    contagem,
    presenca,
  };
  if (v.sigilo !== "secreta") {
    r.nominal = cedulas
      .filter((c) => c.eleitorId)
      .map((c) => ({ nome: nomes.get(c.eleitorId!) ?? "—", opcao: opcoes.find((o) => o.id === c.opcao)?.texto ?? c.opcao, em: c.em ?? "" }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }
  return r;
}

/** Encerra sozinha quando todos votaram (se configurado). */
async function talvezEncerrar(v: Votacao) {
  if (!v.encerrarQuandoTodosVotarem || v.encerradaEm) return;
  const { votosDa, listarVotacoes, salvarVotacoes } = await import("../server/votacao");
  const { presenca } = await votosDa(v.id);
  if (presenca.length < v.eleitores.length) return;
  const todas = await listarVotacoes();
  const alvo = todas.find((x) => x.id === v.id);
  if (!alvo || alvo.encerradaEm) return;
  alvo.encerradaEm = new Date().toISOString();
  alvo.encerradaPor = "Sistema";
  alvo.historico.push({ em: alvo.encerradaEm, autor: "Sistema", acao: "Encerrada automaticamente: todos votaram" });
  await salvarVotacoes(todas);
}

// ─── Painel ─────────────────────────────────────────────────────────────────

export const listarVotacoesPainel = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { listarVotacoes, votosDa } = await import("../server/votacao");
  await exigirAcesso("deliberacao");
  const l = await listarVotacoes();
  return Promise.all(
    l.map(async (v) => ({ ...v, votaram: (await votosDa(v.id)).presenca.length })),
  ).then((x) => x.sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)));
});

export const obterVotacaoPainel = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { listarVotacoes } = await import("../server/votacao");
    await exigirAcesso("deliberacao");
    const v = (await listarVotacoes()).find((x) => x.id === data.id);
    if (!v) throw new Error("Votação não encontrada.");
    const resultado = await resultadoDe(v);
    // Voto secreto: a contagem só aparece depois de encerrada — antes, somada à
    // lista de quem já votou, ela permitiria deduzir o voto de cada pessoa.
    const ocultar = v.sigilo === "secreta" && situacaoDa(v) !== "encerrada";
    return { votacao: v, resultado: ocultar ? { ...resultado, contagem: resultado.contagem.map((c) => ({ ...c, votos: 0 })), oculto: true } : { ...resultado, oculto: false } };
  });

export const salvarVotacao = createServerFn({ method: "POST" })
  .validator((d: Entrada) => validar(d))
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { listarVotacoes, salvarVotacoes, novoToken, votosDa } = await import("../server/votacao");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("deliberacao");
    const todas = await listarVotacoes();
    const agora = new Date().toISOString();
    const existente = data.id ? todas.find((x) => x.id === data.id) : undefined;
    if (existente) {
      const jaTemVotos = (await votosDa(existente.id)).presenca.length > 0;
      if (jaTemVotos && (existente.tipo !== data.tipo || existente.sigilo !== data.sigilo || JSON.stringify(opcoesDa(existente)) !== JSON.stringify(opcoesDa(data)))) {
        throw new Error("Esta votação já recebeu votos: não é possível mudar o tipo, as opções ou o sigilo.");
      }
    }
    const eleitores = data.eleitores
      .filter((e) => e.nome.trim())
      .map((e) => {
        const antigo = existente?.eleitores.find((x) => x.id === e.id);
        const membroId = e.membroId ?? antigo?.membroId;
        return { id: antigo?.id ?? `e${Math.random().toString(36).slice(2, 10)}`, nome: e.nome.trim(), contato: e.contato.trim(), token: antigo?.token ?? novoToken(), ...(membroId ? { membroId } : {}) };
      });
    const v: Votacao = {
      id: existente?.id ?? `vt${Date.now().toString(36)}`,
      titulo: data.titulo.trim(),
      descricao: data.descricao.trim(),
      tipo: data.tipo,
      opcoes: data.tipo === "personalizada" ? data.opcoes.filter((o) => o.texto.trim()) : [],
      sigilo: data.sigilo,
      inicio: data.inicio,
      fim: data.fim,
      quorum: Math.max(0, Number(data.quorum) || 0),
      encerrarQuandoTodosVotarem: !!data.encerrarQuandoTodosVotarem,
      eleitores,
      rascunho: !!data.rascunho,
      ...(existente?.encerradaEm ? { encerradaEm: existente.encerradaEm, encerradaPor: existente.encerradaPor } : {}),
      criadaPor: existente?.criadaPor ?? s.nome,
      criadaEm: existente?.criadaEm ?? agora,
      historico: [...(existente?.historico ?? []), { em: agora, autor: s.nome, acao: existente ? "Alterou a votação" : "Criou a votação" }],
    };
    await salvarVotacoes([v, ...todas.filter((x) => x.id !== v.id)]);
    await registrar(s.nome, existente ? "Alterou votação" : "Criou votação", v.titulo);
    return { id: v.id };
  });

export const acaoVotacao = createServerFn({ method: "POST" })
  .validator((d: { id: string; acao: "abrir" | "encerrar" | "reabrir" | "excluir" }) => d)
  .handler(async ({ data }) => {
    const { exigirAcesso } = await import("../server/auth");
    const { listarVotacoes, salvarVotacoes, apagarVotos } = await import("../server/votacao");
    const { registrar } = await import("../server/armazem");
    const s = await exigirAcesso("deliberacao");
    const todas = await listarVotacoes();
    const v = todas.find((x) => x.id === data.id);
    if (!v) throw new Error("Votação não encontrada.");
    const agora = new Date().toISOString();
    if (data.acao === "excluir") {
      if (s.papel !== "admin") throw new Error("Apenas administradores podem excluir votações.");
      await apagarVotos(v.id);
      await salvarVotacoes(todas.filter((x) => x.id !== v.id));
      await registrar(s.nome, "Excluiu votação", v.titulo);
      return { ok: true };
    }
    if (data.acao === "abrir") {
      v.rascunho = false;
      if (new Date(v.inicio) > new Date()) v.inicio = agora;
      if (!v.eleitores.length) throw new Error("Inclua ao menos um votante.");
      v.historico.push({ em: agora, autor: s.nome, acao: "Abriu a votação" });
    }
    if (data.acao === "encerrar") {
      v.encerradaEm = agora;
      v.encerradaPor = s.nome;
      v.historico.push({ em: agora, autor: s.nome, acao: "Encerrou a votação" });
    }
    if (data.acao === "reabrir") {
      delete v.encerradaEm;
      delete v.encerradaPor;
      if (new Date(v.fim) <= new Date()) throw new Error("O prazo já terminou. Altere a data de término para reabrir.");
      v.historico.push({ em: agora, autor: s.nome, acao: "Reabriu a votação" });
    }
    await salvarVotacoes(todas);
    await registrar(s.nome, `Votação: ${data.acao}`, v.titulo);
    return { ok: true };
  });

// ─── Cédula (link individual) ───────────────────────────────────────────────

export const abrirCedula = createServerFn({ method: "GET" })
  .validator((d: { token: string }) => {
    if (!d?.token || d.token.length < 10 || d.token.length > 80) throw new Error("Link inválido.");
    return d;
  })
  .handler(async ({ data }) => {
    const { acharPorToken, jaVotou } = await import("../server/votacao");
    const r = await acharPorToken(data.token);
    if (!r) return { encontrada: false as const };
    const { v, e } = r;
    const situacao = situacaoDa(v);
    return {
      encontrada: true as const,
      titulo: v.titulo,
      descricao: v.descricao,
      sigilo: v.sigilo,
      inicio: v.inicio,
      fim: v.encerradaEm ?? v.fim,
      situacao,
      eleitor: e.nome,
      opcoes: opcoesDa(v),
      jaVotou: await jaVotou(v.id, e.id),
      resultado: situacao === "encerrada" ? await resultadoDe(v).then(({ nominal: _n, presenca: _p, ...r }) => r) : null,
    };
  });

export const votar = createServerFn({ method: "POST" })
  .validator((d: { token: string; opcao: string }) => {
    if (!d?.token || !d.opcao) throw new Error("Escolha uma opção.");
    return d;
  })
  .handler(async ({ data }) => {
    const { acharPorToken, registrarVoto } = await import("../server/votacao");
    const r = await acharPorToken(data.token);
    if (!r) return { ok: false as const, erro: "Link inválido." };
    const { v, e } = r;
    const sit = situacaoDa(v);
    if (sit === "agendada") return { ok: false as const, erro: "A votação ainda não começou." };
    if (sit !== "em_andamento") return { ok: false as const, erro: "Esta votação está encerrada." };
    if (!opcoesDa(v).some((o) => o.id === data.opcao)) return { ok: false as const, erro: "Opção inválida." };
    const res = await registrarVoto(v, e.id, data.opcao);
    if (res.ok) await talvezEncerrar(v);
    return res;
  });

/** Membros ativos do app, para incluir como votantes (votam logados, pelo app). */
export const membrosParaVotar = createServerFn({ method: "GET" }).handler(async () => {
  const { exigirAcesso } = await import("../server/auth");
  const { lerMembros } = await import("../server/membros");
  await exigirAcesso("deliberacao");
  return (await lerMembros()).filter((m) => m.situacao === "ativo").map((m) => ({ id: m.id, nome: m.nome, celular: m.celular })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
});
